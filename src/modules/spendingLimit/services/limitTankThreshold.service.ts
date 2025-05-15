import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpendingLimit } from '../spendingLimit.entity';
import { checkThresholds } from '../handlers/checkThresholds';

@Injectable()
export class LimitTankThresholdService {
  private readonly logger = new Logger(LimitTankThresholdService.name);

  constructor(
    @InjectRepository(SpendingLimit)
    private readonly spendingLimitRepository: Repository<SpendingLimit>,
  ) {}

  /**
   * Checks if the user's spending has reached certain percentage thresholds for notifications.
   * @param userId - The ID of the user.
   * @param timezone - The timezone of the user to determine the current day.
   * @param thresholds - Array of percentage thresholds to check against (default: [50, 75, 90]).
   * @returns An object indicating if a threshold was reached and the current percentage used.
   */
  async checkThresholds(
    userId: string,
    timezone: string = 'UTC',
    thresholds: number[] = [50, 75, 90],
  ): Promise<{
    thresholdReached: boolean;
    currentPercentage: number;
    reachedThreshold?: number;
  }> {
    this.logger.log(
      `Checking thresholds for user ${userId} in timezone ${timezone}`,
    );
    return await checkThresholds(
      userId,
      timezone,
      thresholds,
      this.spendingLimitRepository,
    );
  }
}
