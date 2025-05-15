import { Logger } from '@nestjs/common';
import { getLimitTank } from './getLimitTank';
import type { Repository } from 'typeorm';
import type { SpendingLimit } from '../spendingLimit.entity';

/**
 * Checks if the user's spending has reached certain percentage thresholds for notifications.
 * @param userId - The ID of the user.
 * @param timezone - The timezone of the user to determine the current day.
 * @param thresholds - Array of percentage thresholds to check against (default: [50, 75, 90]).
 * @param spendingLimitRepository - The repository to fetch spending limits.
 * @returns An object indicating if a threshold was reached and the current percentage used.
 */
export async function checkThresholds(
  userId: string,
  timezone: string = 'UTC',
  thresholds: number[] = [50, 75, 90],
  spendingLimitRepository: Repository<SpendingLimit>,
): Promise<{
  thresholdReached: boolean;
  currentPercentage: number;
  reachedThreshold?: number;
}> {
  const logger = new Logger('CheckThresholdsHelper');
  const { percentageUsed } = await getLimitTank(
    userId,
    timezone,
    spendingLimitRepository,
  );

  for (const threshold of thresholds.sort((a, b) => b - a)) {
    if (percentageUsed >= threshold) {
      logger.log(
        `User ${userId} has reached ${threshold}% usage of their daily limit tank.`,
      );
      return {
        thresholdReached: true,
        currentPercentage: percentageUsed,
        reachedThreshold: threshold,
      };
    }
  }

  return {
    thresholdReached: false,
    currentPercentage: percentageUsed,
  };
}
