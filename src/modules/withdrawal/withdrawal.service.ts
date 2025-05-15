import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { debitCrypto } from '../../common/util/debitCrypto.util';
import { getTokenBalance } from '../../common/util/getTokenBalance';
import { PrivyService } from '../auth/privy.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';
import { Withdrawal } from './entity/withdrawal.entity';
import { Transaction } from '../Transaction/entity/transaction.entity';
import { FundsLock } from '../Card/entity/fundsLock.entity';

/**
 * Interface for the response of a withdrawal process.
 */
interface WithdrawalResponse {
  transactionHash: string;
  userId: string;
  message: string;
  amount: string;
  tokenSymbol: string;
  to: string;
  from: string;
  chainType: 'ethereum' | 'solana';
  blockchainNetwork: string | undefined;
}

/**
 * Service to handle cryptocurrency withdrawals for users.
 */
@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly privyService: PrivyService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(FundsLock)
    private readonly fundsLockRepository: Repository<FundsLock>,
  ) { }

  /**
   * Process a cryptocurrency withdrawal for a user.
   * @param userId - The ID of the user requesting the withdrawal
   * @param tokenSymbol - The symbol of the token to withdraw (e.g., 'USDC', 'USDT')
   * @param amount - The amount of tokens to withdraw as a string
   * @param recipientAddress - The address to receive the withdrawn tokens
   * @param chainType - The blockchain type ('ethereum' or 'solana')
   * @param blockchainNetwork - Optional specific blockchain network name (e.g., 'BNB Smart Chain', 'Base')
   * @returns Promise<WithdrawalResponse> - The response object containing transaction details
   * @throws BadRequestException if the withdrawal fails, configuration is missing, or insufficient balance
   * @throws UnauthorizedException if the user is a sub-user and not allowed to withdraw
   */
  async processWithdrawal(
    userId: string,
    tokenSymbol: string,
    amount: string,
    recipientAddress: string,
    chainType: 'ethereum' | 'solana',
    blockchainNetwork?: string,
  ): Promise<WithdrawalResponse> {
    this.logger.log(
      `Processing withdrawal for user ${userId} of ${amount} ${tokenSymbol} to ${recipientAddress}`,
    );

    // Check if the user is a main user
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new BadRequestException(`User with ID ${userId} not found`);
    }
    if (user.subUsers && user.subUsers.length > 0) {
      throw new UnauthorizedException(
        'Sub-users are not allowed to make withdrawals',
      );
    }

    // Get network type from configuration
    const networkType = this.configService.get<'MAINET' | 'TESTNET'>('offramp.network');
    if (!networkType || !['MAINET', 'TESTNET'].includes(networkType)) {
      throw new BadRequestException('Network type is not properly configured');
    }

    // Fetch user's wallet address
    const wallets = await this.privyService.getWalletId(userId, chainType);
    if (!wallets || wallets.length === 0) {
      throw new BadRequestException(
        `Wallet address not found for user ${userId}`,
      );
    }
    // Select the first wallet address for the given chainType
    const userAddress = wallets[0].address;

    // Check user's balance before withdrawal
    const balanceResult = await getTokenBalance(
      tokenSymbol,
      userAddress,
      chainType,
      blockchainNetwork,
      networkType,
      userId,
      this.userRepository,
      this.fundsLockRepository,
    );
    const balance =
      balanceResult[tokenSymbol] &&
        balanceResult[tokenSymbol][blockchainNetwork || '']
        ? parseFloat(balanceResult[tokenSymbol][blockchainNetwork || ''])
        : 0;
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(balance) || balance < withdrawalAmount) {
      throw new BadRequestException(
        `Insufficient balance for withdrawal. Available: ${balance} ${tokenSymbol}, Requested: ${withdrawalAmount} ${tokenSymbol}`,
      );
    }
    this.logger.log(
      `Balance check passed for user ${userId}. Available: ${balance} ${tokenSymbol}`,
    );

    if (!recipientAddress) {
      throw new BadRequestException(
        'Recipient address must be provided for withdrawals',
      );
    }

    try {
      const result = await debitCrypto(
        userId,
        tokenSymbol,
        networkType,
        amount,
        recipientAddress,
        chainType,
        blockchainNetwork,
        this.privyService,
      );
      this.logger.log(
        `Withdrawal successful for user ${userId}: Transaction hash ${result.hash}`,
      );

      // Save withdrawal to database within a transaction to ensure it is saved
      await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Save to Withdrawal entity
          const withdrawal = new Withdrawal();
          withdrawal.userId = userId;
          withdrawal.user = user;
          withdrawal.symbol = tokenSymbol;
          withdrawal.amount = amount;
          withdrawal.transactionHash = result.hash;
          withdrawal.chainType = chainType;
          withdrawal.blockchainNetwork = blockchainNetwork || '';
          withdrawal.status = 'completed';
          withdrawal.toAddress = recipientAddress;
          withdrawal.recipientAddress = recipientAddress;

          await transactionalEntityManager.save(Withdrawal, withdrawal);
          this.logger.log(`Withdrawal saved to database for user ${userId}`);

          // Save to Transaction entity with the specified format
          const transaction = new Transaction();
          transaction.user = user;
          transaction.usdAmount = parseFloat(amount) || 0;
          transaction.nairaAmount = null;
          transaction.type = 'withdrawal';
          transaction.status = 'completed';
          transaction.cardId = null;
          transaction.transactionReference =
            result.hash || 'withdrawal_' + Date.now().toString();
          transaction.merchantName = 'Zero Card';
          transaction.merchantId = 'zero_card';
          transaction.state = null;
          transaction.city = null;
          transaction.transactionHash = result.hash;
          transaction.effectiveFxRate = null;
          transaction.authorizationId = result.hash;
          transaction.category = 'crypto_withdrawal';
          transaction.channel = 'crypto';
          transaction.transactionModeType = 'crypto_withdrawal';
          transaction.tokenInfo = [
            {
              chain: chainType,
              blockchain: blockchainNetwork || '',
              token: tokenSymbol,
            },
          ];
          transaction.recipientAddress = recipientAddress;
          transaction.toAddress = recipientAddress;

          await transactionalEntityManager.save(Transaction, transaction);
          this.logger.log(
            `Withdrawal saved to Transaction entity for user ${userId}`,
          );
        },
      );

      return {
        transactionHash: result.hash,
        userId: userId,
        message: `Withdrawal processed successfully for user ${userId}`,
        amount: amount,
        tokenSymbol: tokenSymbol,
        to: recipientAddress,
        from: userAddress,
        chainType: chainType,
        blockchainNetwork: blockchainNetwork,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Withdrawal failed for user ${userId}: ${errorMessage}`,
      );
      throw new BadRequestException(
        `Failed to process withdrawal: ${errorMessage}`,
      );
    }
  }

  /**
   * Fetch token balances for a user across specified blockchain networks.
   * @param userId - The ID of the user to fetch balances for.
   * @param symbols - The token symbol(s) to check balances for.
   * @param chainType - The blockchain type ('ethereum' or 'solana').
   * @param blockchainNetwork - Optional specific blockchain network name.
   * @returns Promise<Record<string, Record<string, string>>> - A nested object with token symbols mapping to network-specific balance results.
   */
  async getTokenBalance(
    userId: string,
    symbols: string,
    chainType: 'ethereum' | 'solana',
    blockchainNetwork?: string,
  ): Promise<Record<string, Record<string, string>>> {
    this.logger.log(`Fetching token balances for user ${userId}`);

    // Get network type from configuration
    const networkType = this.configService.get<'MAINET' | 'TESTNET'>('offramp.network');
    if (!networkType || !['MAINET', 'TESTNET'].includes(networkType)) {
      throw new BadRequestException('Network type is not properly configured');
    }

    // Fetch user's wallet address
    const wallets = await this.privyService.getWalletId(userId, chainType);
    if (!wallets || wallets.length === 0) {
      throw new BadRequestException(`Wallet address not found for user ${userId}`);
    }
    // Select the first wallet address for the given chainType
    const userAddress = wallets[0].address;

    // Fetch balances using the utility function
    return await getTokenBalance(
      symbols,
      userAddress,
      chainType,
      blockchainNetwork,
      networkType,
      userId,
      this.userRepository,
      this.fundsLockRepository,
    );
  }
}

//TODO:when adding solana update withdrwal to handle solana
