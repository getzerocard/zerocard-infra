import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { debitCrypto } from '../../../common/util/debitCrypto.util';
import { processCardOrderTransaction } from '../handler/processCardOrderTransaction.handler';
import { PrivyService } from '../../auth/privy.service';
import { getTokenBySymbol } from '../../../common/util/fetchsupportedTokens';
import { getTokenBalance } from '../../../common/util/getTokenBalance';
import { FundsLock, LockStatus, LockType } from '../entity/fundsLock.entity';
import type { OrderCardResponseDto } from '../dto/order-card.dto';
//TODO: technical debt Implement a status changes before action to know if a user is eligible in  all services in future
/**
 * Service to handle card ordering logic for users.
 */
@Injectable()
export class OrderCardService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FundsLock)
    private readonly fundsLockRepository: Repository<FundsLock>,
    private readonly privyService: PrivyService,
  ) { }

  /**
   * Process card ordering for a user.
   * @param userId - The ID of the user ordering the card
   * @param symbol - Token symbol to check balance for (single string)
   * @param chainType - The blockchain type, either 'ethereum' or 'solana'
   * @param blockchainNetwork - The specific blockchain network to check
   * @returns Promise<OrderCardResponseDto> - Result of the card order process in DTO format
   */
  async orderCard(
    userId: string,
    symbol: string,
    chainType: 'ethereum' | 'solana',
    blockchainNetwork: string,
  ): Promise<OrderCardResponseDto> {
    const networkType = this.configService.get<'MAINET' | 'TESTNET'>(
      'offramp.network',
    );
    if (!networkType || !['MAINET', 'TESTNET'].includes(networkType)) {
      throw new BadRequestException('Network type is not properly configured');
    }

    const normalizedSymbol = symbol.toUpperCase();
    const tokenInfo = getTokenBySymbol(
      normalizedSymbol,
      networkType,
      chainType,
      blockchainNetwork,
    );
    if (!tokenInfo) {
      throw new BadRequestException(
        `Unsupported token ${symbol} for ${chainType} on ${blockchainNetwork} (${networkType}). Please select a supported token and network combination.`,
      );
    }

    let orderFee = this.configService.get<number>('card.orderFee', 0);
    if (orderFee <= 0) {
      throw new BadRequestException(
        'Card order fee is not configured or is invalid',
      );
    }

    // The main logic of card ordering starts here, previously within a try...finally
    // Step 2: Check user balance (effectively Step 1 now)
    const wallets = await this.privyService.getWalletId(userId, chainType);
    if (wallets.length === 0) {
      throw new BadRequestException(
        'User wallet address not found for the specified chain type',
      );
    }
    const userAddress = wallets[0].address;

    let balanceResult;
    try {
      balanceResult = await getTokenBalance(
        normalizedSymbol,
        userAddress,
        chainType,
        blockchainNetwork,
        networkType,
        userId,
        this.userRepository,
        this.fundsLockRepository,
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to check balance: ${error.message || 'Unknown error'}`,
      );
    }

    const balanceStr = balanceResult[normalizedSymbol]?.[blockchainNetwork];
    if (!balanceStr || balanceStr === 'Unsupported combination') {
      throw new BadRequestException(
        `Token ${symbol} is not supported on ${blockchainNetwork}. Please select a supported token and network combination.`,
      );
    }

    if (balanceStr === 'Error fetching balance') {
      throw new BadRequestException(
        `Unable to fetch balance for ${symbol} on ${blockchainNetwork}. Please try again later.`,
      );
    }

    const balance = parseFloat(balanceStr);
    if (isNaN(balance) || balance < orderFee) {
      throw new BadRequestException(
        `Insufficient balance for ${symbol} on ${blockchainNetwork}. Required: ${orderFee}, Available: ${balanceStr}. Please ensure you have enough funds to cover the card order fee.`,
      );
    }

    // Step 3: Check if user is a sub-user and validate constraints (effectively Step 2 now)
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check existing card order status
    if (user.cardOrderStatus !== 'not_ordered') {
      throw new BadRequestException(
        `A card order for this user already exists with status: ${user.cardOrderStatus}. Cannot place a new order.`,
      );
    }

    if (user.parentUser) {
      const parentUser = await this.userRepository.findOne({
        where: { id: user.parentUser.id },
      });
      if (!parentUser) {
        throw new BadRequestException(
          'Main user not found for this sub-user',
        );
      }

      try {
        const locks = await this.fundsLockRepository.find({
          where: {
            user: { id: parentUser.id },
            subUser: { id: user.id },
            status: LockStatus.LOCKED,
            type: LockType.SUBUSER_CARD_ORDER,
          },
          relations: ['user', 'subUser'],
        });

        const hasLockedFunds = locks.some(
          (lock) =>
            lock.tokenSymbolLocked === normalizedSymbol &&
            lock.chain === chainType &&
            lock.blockchainNetwork === blockchainNetwork &&
            parseFloat(lock.amountLocked.toString()) >= orderFee,
        );

        if (!hasLockedFunds) {
          throw new BadRequestException(
            `No locked funds found for ${symbol} on ${blockchainNetwork} of type SUBUSER_CARD_ORDER for this sub-user. Main user must lock funds before a card can be ordered.`,
          );
        }
      } catch (error) {
        throw error;
      }
    }

    // Step 4: Re-verify balance (effectively Step 3 now)
    const recheckBalanceResult = await getTokenBalance(
      normalizedSymbol,
      userAddress,
      chainType,
      blockchainNetwork,
      networkType,
      userId,
      this.userRepository,
      this.fundsLockRepository,
    );

    const recheckBalanceStr =
      recheckBalanceResult[normalizedSymbol]?.[blockchainNetwork];
    const recheckBalance = parseFloat(recheckBalanceStr);
    if (isNaN(recheckBalance) || recheckBalance < orderFee) {
      throw new BadRequestException(
        `Balance changed during processing for ${symbol} on ${blockchainNetwork}. Required: ${orderFee}, Available now: ${recheckBalanceStr}. Please ensure sufficient funds are available.`,
      );
    }

    // Step 5: Re-check user status (effectively Step 4 now)
    const recheckUser = await this.userRepository.findOne({
      where: { userId },
    });
    if (!recheckUser) {
      throw new BadRequestException('User not found during re-check');
    }

    try {
      if (user.parentUser && !recheckUser.parentUser) {
        throw new BadRequestException(
          'User status changed during processing. Sub-user has been upgraded to main user. Please restart the order process.',
        );
      }
    } catch (error) {
      throw error;
    }

    if (recheckUser.parentUser) {
      const recheckLocks = await this.fundsLockRepository.find({
        where: {
          user: { id: recheckUser.parentUser.id },
          subUser: { id: recheckUser.id },
          status: LockStatus.LOCKED,
          type: LockType.SUBUSER_CARD_ORDER,
        },
        relations: ['user', 'subUser'],
      });

      const recheckHasLockedFunds = recheckLocks.some(
        (lock) =>
          lock.tokenSymbolLocked === normalizedSymbol &&
          lock.chain === chainType &&
          lock.blockchainNetwork === blockchainNetwork &&
          parseFloat(lock.amountLocked.toString()) >= orderFee,
      );

      if (!recheckHasLockedFunds) {
        throw new BadRequestException(
          `Funds lock status changed during processing for ${symbol} on ${blockchainNetwork} of type SUBUSER_CARD_ORDER. Locked funds are no longer available. Please ensure funds are locked by the main user.`,
        );
      }
    }

    // Step 7: Re-fetch order fee (effectively Step 5 now)
    orderFee = this.configService.get<number>('card.orderFee');
    if (orderFee <= 0) {
      throw new BadRequestException(
        'Card order fee configuration changed during processing and is now invalid.',
      );
    }
    if (recheckBalance < orderFee) {
      throw new BadRequestException(
        `Order fee changed during processing for ${symbol} on ${blockchainNetwork}. New required amount: ${orderFee}, Available: ${recheckBalanceStr}. Please ensure sufficient funds are available.`,
      );
    }

    // Step 8: Debit the order fee (effectively Step 6 now)
    const recipientAddress = this.configService.get<string>(
      'offramp.senderFeeRecipient',
    );
    if (!recipientAddress) {
      throw new BadRequestException(
        'Recipient address for card order fee is not configured',
      );
    }

    let transactionHash = '';
    let debitStatus: 'completed' | 'failed' = 'completed';
    let debitUserId = userId;
    if (user.parentUser) {
      debitUserId = user.parentUser.userId;
    }
    try {
      const result = await debitCrypto(
        debitUserId,
        symbol,
        networkType,
        orderFee.toString(),
        recipientAddress,
        chainType,
        blockchainNetwork,
        this.privyService,
      );
      transactionHash = result.hash || '';
      debitStatus = transactionHash ? 'completed' : 'failed';
      if (!transactionHash && debitStatus === 'completed') {
        throw new BadRequestException(
          'Transaction hash is empty when status is completed. Debit process failed.',
        );
      }
    } catch (error: any) {
      debitStatus = 'failed';
      throw new BadRequestException(
        `Failed to debit order fee for user ${userId}: ${error.message || error.toString()}`,
      );
    }

    // Step 9: Process database transactions for card order (effectively Step 7 now)
    let fundsLock: FundsLock
    if (user.parentUser) {
      const locks = await this.fundsLockRepository.find({
        where: {
          user: { id: user.parentUser.id },
          subUser: { id: user.id },
          status: LockStatus.LOCKED,
          type: LockType.SUBUSER_CARD_ORDER,
          tokenSymbolLocked: normalizedSymbol,
          chain: chainType,
          blockchainNetwork: blockchainNetwork
        },
        relations: ['user', 'subUser'],
      });
      fundsLock = locks.length > 0 ? locks[0] : null;
    }
    await processCardOrderTransaction(
      user,
      userId,
      debitUserId,
      symbol,
      orderFee,
      transactionHash,
      chainType,
      blockchainNetwork,
      networkType,
      debitStatus,
      user.parentUser !== null,
      fundsLock,
      this.userRepository
    );

    // Step 10: Fetch the latest user data (effectively Step 8 now)
    const updatedUser = await this.userRepository.findOne({
      where: { userId },
    });
    if (!updatedUser) {
      throw new BadRequestException(
        'User not found after processing card order',
      );
    }

    return {
      status: 'success',
      message: `Card ordered successfully for user ${userId}`,
      userId: userId,
      transactionHash,
      cardOrderStatus: updatedUser.cardOrderStatus,
    };
  }
}
