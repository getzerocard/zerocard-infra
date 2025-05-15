import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entity/transaction.entity';
import { User } from '../../user/entity/user.entity';
import { UserNotFoundException } from '../../../common/interfaces/exceptions';
import { WeeklySpendingSummaryDto, DailySpendingDto, ChangeFromLastWeekDto } from '../dto/transaction-retrieval.dto';
import { toMoney, addMoney, subtractMoney, multiplyMoney, divideMoney } from '../../../common/util/money';

interface TransactionResponse {
  userId: string;
  dateAndTime: Date;
  usdAmount: number;
  tokenInfo: { chain: string; blockchain: string; token: string }[] | null;
  transactionType: string;
  nairaAmount: number;
  category: string;
  effectiveRate: number;
  channel: string;
  transactionHash: null;
  transactionStatus: 'pending' | 'completed' | 'refund' | 'failed';
  modeType: string;
  authorizationId: string;
  merchant: {
    merchantName: string;
    city: string;
    state: string;
  };
  recipientAddress?: string;
  toAddress?: string;
}

@Injectable()
export class TransactionRetrievalService {
  private readonly logger = new Logger(TransactionRetrievalService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  /**
   * Retrieves transactions for a specific user with optional filters and pagination support.
   * This method is optimized for performance by selecting only the necessary fields
   * and avoiding unnecessary relation loading.
   * @param userId - The user ID to filter transactions.
   * @param page - Page number for pagination, defaults to 1.
   * @param limit - Number of transactions per page, defaults to 10.
   * @param type - Optional transaction type to filter, either 'spending' or 'withdrawal'.
   * @param minUsdAmount - Optional minimum USD amount to filter transactions.
   * @param maxUsdAmount - Optional maximum USD amount to filter transactions.
   * @returns A Promise resolving to an array of TransactionResponse objects.
   * @throws {UserNotFoundException} If the specified user ID is not found in the database.
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: 'spending' | 'withdrawal',
    minUsdAmount?: number,
    maxUsdAmount?: number,
  ): Promise<TransactionResponse[]> {
    // Log the request details for debugging and monitoring
    this.logger.log(
      `Fetching transactions for user ${userId}${type ? ` of type ${type}` : ''}${minUsdAmount !== undefined || maxUsdAmount !== undefined ? ` with USD amount range ${minUsdAmount || 'any'} to ${maxUsdAmount || 'any'}` : ''} - Page: ${page}, Limit: ${limit}`,
    );

    // Verify user existence before querying transactions
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new UserNotFoundException(`User with ID ${userId} not found`);
    }

    // Calculate the number of records to skip for pagination
    const skip = (page - 1) * limit;

    // Create a query builder for more flexibility with complex filters
    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');

    // Select all the fields we need
    queryBuilder.select([
      'transaction.id',
      'transaction.createdAt',
      'transaction.usdAmount',
      'transaction.tokenInfo',
      'transaction.type',
      'transaction.nairaAmount',
      'transaction.category',
      'transaction.effectiveFxRate',
      'transaction.channel',
      'transaction.status',
      'transaction.transactionModeType',
      'transaction.authorizationId',
      'transaction.merchantName',
      'transaction.city',
      'transaction.state',
      'transaction.recipientAddress',
      'transaction.toAddress',
      'user.userId'
    ]);

    // Add filtering by transaction type if provided
    if (type) {
      queryBuilder.andWhere('transaction.type = :transactionType', { transactionType: type });
    }

    // Add amount range filters if provided
    if (minUsdAmount !== undefined) {
      queryBuilder.andWhere('transaction.usdAmount >= :minUsdAmount', { minUsdAmount });
    }

    if (maxUsdAmount !== undefined) {
      queryBuilder.andWhere('transaction.usdAmount <= :maxUsdAmount', { maxUsdAmount });
    }

    // Always join with user to get the userId and filter by userId
    queryBuilder
      .innerJoin('transaction.user', 'user')
      .andWhere('user.userId = :userId', { userId });

    // Apply pagination and ordering
    queryBuilder
      .orderBy('transaction.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Execute the query and get the results
    const transactions = await queryBuilder.getMany();

    // Transform the transaction entities to the response format
    return transactions.map((transaction) => ({
      userId: transaction.user.userId,
      dateAndTime: transaction.createdAt,
      usdAmount: transaction.usdAmount,
      tokenInfo: transaction.tokenInfo,
      transactionType: transaction.type,
      nairaAmount: transaction.nairaAmount,
      category: transaction.category,
      effectiveRate: transaction.effectiveFxRate,
      channel: transaction.channel,
      transactionHash: null,
      transactionStatus: transaction.status,
      modeType: transaction.transactionModeType,
      authorizationId: transaction.authorizationId,
      merchant: {
        merchantName: transaction.merchantName,
        city: transaction.city,
        state: transaction.state,
      },
      recipientAddress: transaction.recipientAddress,
      toAddress: transaction.toAddress,
    }));
  }
  async getWeeklySpendingSummary(userId: string): Promise<WeeklySpendingSummaryDto> {
    this.logger.log(`Fetching weekly spending summary for user ${userId}`);

    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      this.logger.warn(`User ${userId} not found for weekly spending summary.`);
      throw new UserNotFoundException(`User with ID ${userId} not found`);
    }

    // 1. Calculate date ranges
    const today = new Date();

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // Set to Sunday
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const previousWeekEnd = new Date(currentWeekEnd);
    previousWeekEnd.setDate(currentWeekEnd.getDate() - 7);

    this.logger.debug(`Current week: ${currentWeekStart.toISOString()} to ${currentWeekEnd.toISOString()}`);
    this.logger.debug(`Previous week: ${previousWeekStart.toISOString()} to ${previousWeekEnd.toISOString()}`);

    // 2. Fetch aggregated transaction data
    const [currentWeekSpendingRaw, previousWeekSpendingRaw] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('EXTRACT(DOW FROM transaction.createdAt) as "dayOfWeek"') // DOW: 0 (Sun) to 6 (Sat)
        .addSelect('SUM(transaction.usdAmount) as "dailyTotal"')
        .innerJoin('transaction.user', 'user_alias') // Use alias to avoid conflict if 'user' is used elsewhere
        .where('user_alias.userId = :userId', { userId })
        .andWhere('transaction.createdAt >= :start', { start: currentWeekStart })
        .andWhere('transaction.createdAt <= :end', { end: currentWeekEnd })
        .groupBy('EXTRACT(DOW FROM transaction.createdAt)')
        .orderBy('EXTRACT(DOW FROM transaction.createdAt)', 'ASC')
        .getRawMany<{ dayOfWeek: number; dailyTotal: string | null }>(),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.usdAmount) as "weeklyTotal"')
        .innerJoin('transaction.user', 'user_alias') // Use alias
        .where('user_alias.userId = :userId', { userId })
        .andWhere('transaction.createdAt >= :start', { start: previousWeekStart })
        .andWhere('transaction.createdAt <= :end', { end: previousWeekEnd })
        .getRawOne<{ weeklyTotal: string | null }>(),
    ]);

    this.logger.debug(`Raw current week spending data count: ${currentWeekSpendingRaw.length}`);
    this.logger.debug(`Raw previous week spending data: ${JSON.stringify(previousWeekSpendingRaw)}`);

    // 3. Process current week's aggregated transactions
    const dailySpendingData: DailySpendingDto = { S: 0, M: 0, T: 0, W: 0, T2: 0, F: 0, S2: 0 };
    const dayKeys: (keyof DailySpendingDto)[] = ['S', 'M', 'T', 'W', 'T2', 'F', 'S2'];
    let totalSpentThisWeekDecimal = toMoney(0);

    for (const rawDayData of currentWeekSpendingRaw) {
      const dayIndex = rawDayData.dayOfWeek; // 0 for Sunday, ..., 6 for Saturday
      const dayKey = dayKeys[dayIndex];
      if (dayKey) {
        const dailyTotalDecimal = toMoney(rawDayData.dailyTotal || 0);
        dailySpendingData[dayKey] = parseFloat(dailyTotalDecimal.toFixed(2));
        totalSpentThisWeekDecimal = addMoney(totalSpentThisWeekDecimal, dailyTotalDecimal);
      }
    }
    const totalSpentThisWeek = parseFloat(totalSpentThisWeekDecimal.toFixed(2));

    let highlightDay: keyof DailySpendingDto = 'S';
    let maxSpendingOnDay = -1;
    for (const key of dayKeys) {
      if (dailySpendingData[key] > maxSpendingOnDay) {
        maxSpendingOnDay = dailySpendingData[key];
        highlightDay = key;
      }
    }

    // 4. Process previous week's aggregated transactions
    const previousWeekTotalSum = previousWeekSpendingRaw?.weeklyTotal;
    const totalSpentLastWeekDecimal = previousWeekTotalSum ? toMoney(previousWeekTotalSum) : toMoney(0);
    const totalSpentLastWeek = parseFloat(totalSpentLastWeekDecimal.toFixed(2));

    // 5. Calculate percentage change using Decimal.js
    let percentageChange: number;
    let isIncrease: boolean;

    if (totalSpentLastWeekDecimal.isZero()) {
      if (totalSpentThisWeekDecimal.isZero()) {
        percentageChange = 0;
      } else {
        percentageChange = 100; // Convention: 100% increase if last week was 0 and this week > 0
      }
      isIncrease = totalSpentThisWeekDecimal.greaterThan(toMoney(0));
    } else {
      const diff = subtractMoney(totalSpentThisWeekDecimal, totalSpentLastWeekDecimal);
      const ratio = divideMoney(diff, totalSpentLastWeekDecimal);
      const percentageDecimal = multiplyMoney(ratio, toMoney(100));
      percentageChange = parseFloat(percentageDecimal.toFixed(2));
      isIncrease = totalSpentThisWeekDecimal.greaterThan(totalSpentLastWeekDecimal);
    }

    const changeFromLastWeekData: ChangeFromLastWeekDto = {
      percentage: percentageChange,
      isIncrease,
    };

    // 6. Construct and return DTO
    const result: WeeklySpendingSummaryDto = {
      totalSpentThisWeek,
      currency: 'USDC', // Assuming currency is fixed as per original
      changeFromLastWeek: changeFromLastWeekData,
      dailySpending: dailySpendingData,
      highlightDay,
    };

    this.logger.log(`Weekly spending summary for user ${userId} generated successfully.`);
    return result;
  }
}

