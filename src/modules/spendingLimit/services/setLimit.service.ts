import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpendingLimit } from '../spendingLimit.entity';
import { ConfigService } from '@nestjs/config';
import { User } from '../../user/entity/user.entity';
import {
  formatMoney,
  multiplyMoney,
  toMoney,
} from '../../../common/util/money';
import { calculateTotalSpendingLimit } from '../handlers/calculateSpendingLimit.handler';
import { OfframpService } from '../../offramp/offramp.service';
import { Offramp } from '../../offramp/offramp.entity';
import { limitBalanceCheck } from '../handlers/limitBalanceCheck.handler';
import { PrivyService } from '../../auth/privy.service';
import { FundsLock } from '../../Card/entity/fundsLock.entity';

// Constants removed - will fetch from ConfigService
// const INSTITUTION = 'KUDANGPC';
// const FIAT = 'NGN';

@Injectable()
export class SetLimitService {
  private readonly logger = new Logger(SetLimitService.name);

  constructor(
    @InjectRepository(SpendingLimit)
    private readonly spendingLimitRepository: Repository<SpendingLimit>,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly offrampService: OfframpService,
    @InjectRepository(Offramp)
    private readonly offrampRepository: Repository<Offramp>,
    private readonly privyService: PrivyService,
    @InjectRepository(FundsLock)
    private readonly fundsLockRepository: Repository<FundsLock>,
  ) { }

  /**
   * Sets a spending limit for a user after creating an offramp order.
   * This method first checks if the user has sufficient balance, then creates an offramp order using the provided details,
   * retrieves the exchange rate from the order status, and then sets the spending limit
   * in both USD and Naira based on the retrieved rate.
   * @param userId - The unique identifier of the user
   * @param usdAmount - The spending limit amount in USD (can be number or string)
   * @param chainType - The type of blockchain ('ethereum' or 'solana')
   * @param tokenSymbol - The symbol of the token (e.g., 'USDC')
   * @param blockchainNetwork - Optional specific blockchain network name (e.g., 'BNB Smart Chain', 'Base')
   * @returns Promise<{ spendingLimit: SpendingLimit, statusData: { OrderID: string; Amount: string; Token: string; Status: string; TxHash: string; Rate?: string } }> - The created spending limit entity and status data from the offramp order
   * @throws NotFoundException - If the user is not found
   * @throws BadRequestException - If required user details are missing, invalid, or insufficient balance
   */
  async setSpendingLimit(
    userId: string,
    usdAmount: number | string,
    chainType: 'ethereum' | 'solana',
    tokenSymbol: string,
    blockchainNetwork?: string,
  ): Promise<{
    spendingLimit: SpendingLimit;
    statusData: {
      OrderID: string;
      Amount: string;
      Token: string;
      Status: string;
      TxHash: string;
      Rate?: string;
    };
  }> {
    // Priority 1: Quick input validation (immediate error throwing)
    if (!userId || !usdAmount || !chainType || !tokenSymbol) {
      throw new BadRequestException(
        'Missing required parameters: userId, usdAmount, chainType, and tokenSymbol must be provided.',
      );
    }

    // Priority 2: Validate network configuration
    const network = this.configService.get<'MAINET' | 'TESTNET'>('offramp.network');
    if (network !== 'MAINET' && network !== 'TESTNET') {
      throw new BadRequestException(
        `Invalid network configuration: ${network}. Expected 'MAINET' or 'TESTNET'.`,
      );
    }
    this.logger.log(`Using network type: ${network}`);

    // Priority 3: Validate that blockchainNetwork is provided as it's required for crypto transactions
    if (!blockchainNetwork) {
      throw new BadRequestException(
        'blockchainNetwork is required for setting spending limits in crypto transactions.',
      );
    }
    this.logger.log(`Using blockchainNetwork: ${blockchainNetwork}`);

    // Priority 4: Quick check for concurrent requests for the same user
    // TODO: Implement a proper locking mechanism (e.g., Redis lock or database lock)
    // For now, log a warning if a recent spending limit request exists
    const recentRequest = await this.spendingLimitRepository.findOne({
      where: { user: { userId } },
      order: { createdAt: 'DESC' },
    });
    if (
      recentRequest &&
      new Date(recentRequest.createdAt).getTime() > Date.now() - 5 * 60 * 1000
    ) {
      this.logger.warn(
        `Recent spending limit request detected for user ${userId} at ${recentRequest.createdAt}`,
      );
      throw new BadRequestException(
        `A recent spending limit request is still processing for user ${userId}. Please try again later.`,
      );
    }

    // Priority 5: Fetch user details and validate required fields
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['constraints'],
    });
    if (!user || !user.accountNumber || !user.accountName) {
      throw new BadRequestException(
        `User with ID ${userId} not found or missing required account details (account number or name).`,
      );
    }

    // Priority 6: Check if user is a sub-user and has constraints before proceeding
    if (
      user &&
      !user.isMainUser &&
      user.constraints &&
      user.constraints.length > 0
    ) {
      const activeSpendingConstraint = user.constraints.find(
        (constraint) =>
          constraint.type === 'spending_limit' &&
          constraint.status === 'active',
      );
      if (activeSpendingConstraint) {
        // Calculate total existing USD amount within the constraint's time period
        const totalExistingUsd = await calculateTotalSpendingLimit(
          this.spendingLimitRepository,
          userId,
          activeSpendingConstraint.timePeriod,
          user.timeZone || 'UTC',
        );
        // Calculate new total if this limit is added
        const usdAmountDecimal = toMoney(usdAmount);
        const newTotalUsd = totalExistingUsd.plus(usdAmountDecimal);
        const timePeriod = activeSpendingConstraint.timePeriod || 'unlimited';
        if (newTotalUsd.gt(activeSpendingConstraint.value)) {
          throw new BadRequestException(
            `Requested spending limit of ${formatMoney(usdAmountDecimal)} USD would exceed the allowed ${timePeriod} constraint of ${activeSpendingConstraint.value} USD for this sub-user. Current ${timePeriod} usage: ${formatMoney(totalExistingUsd)} USD.`,
          );
        }
      }
    }

    // Priority 7: Check if user has sufficient balance before proceeding (resource-intensive)
    this.logger.debug(
      `About to check balance for user ${userId}. FundsLockRepository available: ${!!this.fundsLockRepository}`,
    );
    const hasSufficientBalance = await limitBalanceCheck(
      userId,
      usdAmount,
      tokenSymbol,
      chainType,
      blockchainNetwork,
      network,
      this.userRepository,
      this.privyService,
      this.fundsLockRepository,
    );
    if (!hasSufficientBalance) {
      throw new BadRequestException(
        `Insufficient balance to set spending limit of ${formatMoney(toMoney(usdAmount))} USD for user ${userId}`,
      );
    }
    this.logger.log(
      `Balance check passed for user ${userId} to set limit of ${formatMoney(toMoney(usdAmount))} USD`,
    );
    //
    // Construct complete recipient details with account identifier and name from user entity
    const institution = this.configService.get<string>('offramp.institution');
    const fiat = this.configService.get<string>('offramp.fiat');

    if (!institution || !fiat) {
      this.logger.error('Offramp institution or fiat configuration is missing.');
      throw new BadRequestException('Server configuration error for offramp.');
    }

    const completeRecipientDetails = {
      accountIdentifier: user.accountNumber,
      accountName: user.accountName,
      institution: institution,
      memo: userId,
    };

    // Call OfframpService to create an order before setting the limit
    const { orderId, statusData } = await this.offrampService.createOrder(
      userId,
      chainType,
      tokenSymbol,
      network,
      usdAmount.toString(),
      fiat, // Use fiat from config
      completeRecipientDetails,
      blockchainNetwork,
    );
    this.logger.log(`Offramp order created with ID: ${orderId}`);

    // Fetch or create the Offramp entity to log the transaction
    let offramp = await this.offrampRepository.findOne({ where: { orderId } });
    const usdAmountDecimal = toMoney(usdAmount);
    if (!offramp) {
      offramp = this.offrampRepository.create({
        user: { userId } as User,
        usdAmount: parseFloat(formatMoney(usdAmountDecimal)),
        fxRate: parseFloat(formatMoney(toMoney(statusData.Rate || 0))),
        orderId,
        token: statusData.Token,
        status: statusData.Status,
        txHash: statusData.TxHash,
      });
      await this.offrampRepository.save(offramp);
      this.logger.log(`Offramp entity created with orderId: ${orderId}`);
    } else {
      // Update existing Offramp entity with latest status
      offramp.usdAmount = parseFloat(formatMoney(usdAmountDecimal));
      offramp.fxRate = parseFloat(formatMoney(toMoney(statusData.Rate || 0)));
      offramp.token = statusData.Token;
      offramp.status = statusData.Status;
      offramp.txHash = statusData.TxHash;
      await this.offrampRepository.save(offramp);
      this.logger.log(`Offramp entity updated with orderId: ${orderId}`);
    }

    // Extract fxRate from statusData if available
    const fxRateRaw = statusData.Rate ? parseFloat(statusData.Rate) / 100 : 0;
    if (fxRateRaw === 0) {
      this.logger.warn(
        `No weighted rate returned from offramp service for order ${orderId}`,
      );
    }
    const fxRate = toMoney(fxRateRaw);

    // Proceed with setting the spending limit only if the order status is settled
    let spendingLimit: SpendingLimit | undefined;
    if (statusData.Status.toLowerCase() === 'settled') {
      this.logger.log(
        `Order ${orderId} is settled, creating SpendingLimit for user ${userId}`,
      );
      // Use a transaction to ensure atomicity
      spendingLimit = await this.spendingLimitRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Create a reference to the user
          const userReference = { userId } as User;
          const fxRateDecimal = fxRate;
          const nairaAmountDecimal = multiplyMoney(
            usdAmountDecimal,
            fxRateDecimal,
          );
          const nairaAmount = parseFloat(formatMoney(nairaAmountDecimal));
          const spendingLimit = transactionalEntityManager.create(
            SpendingLimit,
            {
              user: userReference,
              usdAmount: parseFloat(formatMoney(usdAmountDecimal)),
              fxRate: parseFloat(formatMoney(fxRateDecimal)),
              nairaAmount,
              nairaRemaining: nairaAmount,
              offramp: offramp,
              chainType: chainType,
              tokenSymbol: tokenSymbol,
              blockchainNetwork: blockchainNetwork,
            },
          );
          return await transactionalEntityManager.save(
            SpendingLimit,
            spendingLimit,
          );
        },
      );
    } else {
      this.logger.log(
        `Order ${orderId} is not settled (status: ${statusData.Status}), skipping SpendingLimit creation for user ${userId}`,
      );
    }

    return { spendingLimit: spendingLimit || null, statusData };
  }
}
