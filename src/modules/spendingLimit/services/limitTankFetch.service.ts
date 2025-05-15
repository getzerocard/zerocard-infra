import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpendingLimit } from '../spendingLimit.entity';
import { getLimitTank } from '../handlers/getLimitTank';

@Injectable()
export class LimitTankFetchService {
  private readonly logger = new Logger(LimitTankFetchService.name);

  constructor(
    @InjectRepository(SpendingLimit)
    private readonly spendingLimitRepository: Repository<SpendingLimit>,
  ) {}

  /**
   * Aggregates spending limits for a user into a single tank view for the current day.
   * Returns total limit in Naira and USD, and percentage used for the day.
   * Resets daily at midnight based on the provided timezone.
   * Accumulates new limits added on the current day.
   * @param userId - The ID of the user.
   * @param timezone - The timezone of the user to determine the current day (e.g., 'Africa/Lagos').
   * @returns An object containing total Naira limit, total USD limit, and percentage used for the day.
   */
  async getLimitTank(
    userId: string,
    timezone: string = 'UTC',
  ): Promise<{
    totalNairaLimit: number;
    totalUsdLimit: number;
    percentageUsed: number;
  }> {
    this.logger.log(
      `Fetching limit tank data for user ${userId} in timezone ${timezone}`,
    );
    return await getLimitTank(userId, timezone, this.spendingLimitRepository);
  }
}
