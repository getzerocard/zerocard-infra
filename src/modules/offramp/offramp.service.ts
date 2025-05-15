import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { encodeFunctionData, getAddress } from 'viem';
import { erc20Abi, gatewayAbi } from '../../common/abi/abi';
import { encryptRecipientDetails, tokenInfo } from './handlers/prepareofframp';
import { PrivyService } from '../auth/privy.service';
import { allowanceCheck } from '../../common/util/allowanceCheck';
import { extractOrderIdFromHash } from './handlers/extractOrderId.util';
import { fetchOfframpOrderStatus } from './handlers/fetchOfframpOrderStatus.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';

@Injectable()
export class OfframpService {
  private readonly logger = new Logger(OfframpService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly privyService: PrivyService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  /**
   * Creates an offramp order and returns the extracted order ID.
   * @param userId - User's ID for Privy wallet
   * @param chainType - Type of blockchain ('ethereum' or 'solana')
   * @param tokenSymbol - Token symbol (e.g., 'USDC')
   * @param network - Network type (e.g., 'MAINET', 'TESTNET')
   * @param amount - Amount of tokens to offramp
   * @param fiat - Fiat currency code (e.g., 'NGN')
   * @param recipientDetails - Recipient information for offramp
   * @param blockchainNetwork - The specific blockchain network name (e.g., 'BNB Smart Chain', 'Base')
   * @returns Promise<{ orderId: string; statusData: { OrderID: string; Amount: string; Token: string; Status: string; TxHash: string; Rate?: string } }> - The extracted order ID and status data from the transaction receipt.
   *
   * @example
   * const orderData = await offrampService.createOrder(
   *   'user123',
   *   'ethereum',
   *   'USDC',
   *   'MAINET',
   *   '100',
   *   'NGN',
   *   {
   *     accountIdentifier: '1234567890',
   *     accountName: 'John Doe',
   *     institution: 'Bank',
   *     providerId: 'PROVIDER_ID', will only be used if we have one
   *     memo: 'N/A'
   *   },
   *   'Base'
   * );
   */
  async createOrder(
    userId: string,
    chainType: string,
    tokenSymbol: string,
    network: string,
    amount: string,
    fiat: string,
    recipientDetails: {
      accountIdentifier: string;
      accountName: string;
      institution: string;
      memo: string;
    },
    blockchainNetwork?: string,
  ): Promise<{
    orderId: string;
    statusData: {
      OrderID: string;
      Amount: string;
      Token: string;
      Status: string;
      TxHash: string;
      Rate?: string;
    };
  }> {
    try {
      // Check if the user is a sub-user and get the appropriate user ID to use
      const user = await this.userRepository.findOne({
        where: { userId },
        relations: ['parentUser'],
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      const userIdToCreateOrder =
        user && !user.isMainUser && user.parentUser
          ? user.parentUser.userId
          : userId;
      this.logger.debug(
        `Using user ID to create order: ${userIdToCreateOrder} for order creation`,
      );

      // Validate chain type
      const validChainType = chainType.toLowerCase() as 'ethereum' | 'solana';
      if (!['ethereum', 'solana'].includes(validChainType)) {
        throw new Error(
          'Invalid chain type. Must be either ethereum or solana',
        );
      }

      // Get user's wallet using PrivyService
      const wallets = await this.privyService.getWalletId(
        userIdToCreateOrder,
        validChainType,
      );
      if (!wallets.length) {
        throw new Error(
          `No ${chainType} wallet found for user with ID ${userIdToCreateOrder}`,
        );
      }

      // Find the wallet for the specified chain type
      const userWallet = wallets.find((wallet) => {
        // Additional validation can be added here if needed
        return wallet.address && wallet.id;
      });

      if (!userWallet) {
        throw new Error(
          `No valid ${chainType} wallet found for user with ID ${userIdToCreateOrder}`,
        );
      }

      this.logger.debug(`Using ${chainType} wallet: ${userWallet.address}`);

      // Get sender fee and recipient from config
      const senderFee = this.configService.get<string>('offramp.senderFee');
      const senderFeeRecipient = this.configService.get<string>(
        'offramp.senderFeeRecipient',
      );

      if (!senderFee || !senderFeeRecipient) {
        throw new Error('Sender fee or sender fee recipient not configured');
      }

      // Get token information and rate
      const aggregatorUrl = this.configService.get<string>('aggregator.url');
      const tokenData = await tokenInfo(
        aggregatorUrl,
        tokenSymbol,
        network,
        amount,
        fiat,
        validChainType,
        blockchainNetwork,
      );

      // Use chainId from token data
      const chainId = tokenData.chainId.toString();
      this.logger.debug(`Using chain ID ${chainId} from token data`);

      // Parse token amount and sender fee to base units
      const tokenAmount = ethers.parseUnits(amount, tokenData.decimals);
      const senderFeeAmount = ethers.parseUnits(senderFee, tokenData.decimals);
      const totalAmount = tokenAmount + senderFeeAmount;

      // Calculate rate and convert to BigInt
      const rate = BigInt(Math.round(Number(tokenData.rate) * 100));

      // Validate recipient details
      if (
        !recipientDetails.accountIdentifier ||
        !recipientDetails.accountName ||
        !recipientDetails.institution
      ) {
        throw new Error('Missing required recipient details for offramp order');
      }

      // Encrypt recipient details
      const { messageHash } = await encryptRecipientDetails(
        aggregatorUrl,
        recipientDetails.accountIdentifier,
        recipientDetails.accountName,
        recipientDetails.institution,
        recipientDetails.memo,
      );

      // First approve the token
      const approveResponse = await this.privyService.sendEthereumTransaction(
        userWallet.id,
        {
          transaction: {
            to: getAddress(tokenData.tokenAddress),
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: 'approve',
              args: [getAddress(tokenData.gatewayAddress), totalAmount],
            }),
          },
          chainId,
        },
      );

      this.logger.debug(
        `Token approval transaction hash: ${approveResponse.hash}`,
      );

      // Wait for the approval transaction to be mined
      const provider = new ethers.JsonRpcProvider(tokenData.rpcUrl);
      const receipt = await provider.waitForTransaction(approveResponse.hash);
      if (receipt.status !== 1) {
        throw new Error(`Approval transaction failed: ${approveResponse.hash}`);
      }
      this.logger.debug(
        `Approval transaction ${approveResponse.hash} confirmed with status: ${receipt.status}`,
      );

      await allowanceCheck(
        tokenData.rpcUrl,
        tokenData.tokenAddress,
        erc20Abi,
        userWallet.address,
        tokenData.gatewayAddress,
        totalAmount,
      );

      // Then create the order
      const orderResponse = await this.privyService.sendEthereumTransaction(
        userWallet.id,
        {
          transaction: {
            to: getAddress(tokenData.gatewayAddress),
            data: encodeFunctionData({
              abi: gatewayAbi,
              functionName: 'createOrder',
              args: [
                getAddress(tokenData.tokenAddress),
                tokenAmount,
                rate,
                getAddress(senderFeeRecipient),
                senderFeeAmount,
                getAddress(userWallet.address),
                messageHash,
              ],
            }),
          },
          chainId,
        },
      );

      this.logger.debug(
        `Order created with transaction hash: ${orderResponse.hash}`,
      );

      let orderId: string;
      let statusData: {
        OrderID: string;
        Amount: string;
        Token: string;
        Status: string;
        TxHash: string;
        Rate?: string;
      };

      try {
        // Extract the order ID from the transaction hash
        this.logger.debug(
          `Attempting to extract order ID from hash: ${orderResponse.hash}`,
        );
        orderId = await extractOrderIdFromHash(
          orderResponse.hash as `0x${string}`,
          tokenData.rpcUrl,
          gatewayAbi,
        );
        this.logger.debug(`Successfully extracted order ID: ${orderId}`);

        // Fetch the order status after creation
        statusData = await fetchOfframpOrderStatus(
          aggregatorUrl,
          chainId,
          orderId,
        );
        this.logger.debug(
          `Fetched order status: ${statusData.Status} for order ID: ${orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error extracting order ID or fetching status for tx ${orderResponse.hash}:`,
          error,
        );
        // Check if the error is the specific 404 from fetchOfframpOrderStatus
        if (error instanceof Error && error.message.includes('HTTP error! status: 404')) {
          throw new NotFoundException(
            `Failed to retrieve offramp order details (ID: ${orderId || 'unknown'}) after creation. The order might not have registered correctly. Please try again later or contact support.`,
          );
        }
        // Re-throw other errors
        throw error;
      }

      return { orderId, statusData };
    } catch (error) {
      this.logger.error(
        'Error creating offramp order or fetching status:',
        error,
      );
      throw error;
    }
  }
}
//TODO:when adding solana update offramp to handle solana offramp
