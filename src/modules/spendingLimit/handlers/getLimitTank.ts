import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Between, MoreThan } from 'typeorm';
import type { SpendingLimit } from '../spendingLimit.entity';
import {
  divideMoney,
  multiplyMoney,
  toMoney,
} from '../../../common/util/money';
import * as moment from 'moment-timezone';

/**
 * Aggregates spending limits for a user into a single tank view for the current day.
 * Returns total limit in Naira and USD, and percentage used for the day.
 * Resets daily at midnight based on the provided timezone.
 * Accumulates new limits added on the current day.
 * @param userId - The ID of the user.
 * @param timezone - The timezone of the user to determine the current day (e.g., 'Africa/Lagos').
 * @param spendingLimitRepository - The repository to fetch spending limits.
 * @returns An object containing total Naira limit, total USD limit, and percentage used for the day.
 */
export async function getLimitTank(
  userId: string,
  timezone: string = 'UTC',
  spendingLimitRepository: Repository<SpendingLimit>,
): Promise<{
  totalNairaLimit: number;
  totalUsdLimit: number;
  percentageUsed: number;
  message?: string;
}> {
  const logger = new Logger('GetLimitTankHelper');
  logger.log(
    `Fetching limit tank data for user ${userId} in timezone ${timezone}`,
  );

  // Determine the start and end of the current day in the user's timezone
  const now = moment().tz(timezone);
  const startOfDay = now.clone().startOf('day');
  const endOfDay = now.clone().endOf('day');

  // Fetch spending limits up to the end of yesterday for rollover balance
  const startOfTime = moment('1970-01-01').tz(timezone);
  const endOfYesterday = startOfDay.clone().subtract(1, 'millisecond');

  const previousSpendingLimits = await spendingLimitRepository.find({
    where: {
      user: { userId },
      createdAt: Between(startOfTime.toDate(), endOfYesterday.toDate()),
      nairaRemaining: MoreThan(0),
    },
    relations: ['user'],
  });

  // Fetch new spending limits for today
  const todaySpendingLimits = await spendingLimitRepository.find({
    where: {
      user: { userId },
      createdAt: Between(startOfDay.toDate(), endOfDay.toDate()),
    },
    relations: ['user'],
  });

  // Calculate rollover nairaRemaining from previous days
  let rolloverNairaRemainingDecimal = toMoney(0);
  if (previousSpendingLimits && previousSpendingLimits.length > 0) {
    for (const limit of previousSpendingLimits) {
      rolloverNairaRemainingDecimal = rolloverNairaRemainingDecimal.plus(
        toMoney(limit.nairaRemaining),
      );
    }
  }

  if (!todaySpendingLimits || todaySpendingLimits.length === 0) {
    logger.warn(
      `No new spending limits found for user ${userId} on ${startOfDay.format('YYYY-MM-DD')}`,
    );
    const rolloverNairaRemaining = parseFloat(
      rolloverNairaRemainingDecimal.toFixed(2),
    );
    if (rolloverNairaRemaining <= 0) {
      logger.log(
        `User ${userId} has no spending limit available (no historical rollover or new limits today).`,
      );
      return {
        totalNairaLimit: 0,
        totalUsdLimit: 0,
        percentageUsed: 0,
        message: 'User has no spending limit available.',
      };
    }
    return {
      totalNairaLimit: rolloverNairaRemaining,
      totalUsdLimit: 0,
      percentageUsed: 0,
    };
  }

  let totalNairaLimitDecimal = rolloverNairaRemainingDecimal;
  let totalUsdLimitDecimal = toMoney(0);
  let nairaRemainingDecimal = rolloverNairaRemainingDecimal;

  for (const limit of todaySpendingLimits) {
    totalNairaLimitDecimal = totalNairaLimitDecimal.plus(
      toMoney(limit.nairaAmount),
    );
    totalUsdLimitDecimal = totalUsdLimitDecimal.plus(toMoney(limit.usdAmount));
    nairaRemainingDecimal = nairaRemainingDecimal.plus(
      toMoney(limit.nairaRemaining),
    );
  }

  const totalNairaLimit = parseFloat(totalNairaLimitDecimal.toFixed(2));
  const totalUsdLimit = parseFloat(totalUsdLimitDecimal.toFixed(2));
  const usedAmountDecimal = totalNairaLimitDecimal.minus(nairaRemainingDecimal);
  let percentageUsed = 0;

  if (totalNairaLimitDecimal.gt(0)) {
    const usedPercentageDecimal = divideMoney(
      usedAmountDecimal,
      totalNairaLimitDecimal,
    );
    percentageUsed = parseFloat(
      multiplyMoney(usedPercentageDecimal, toMoney(100)).toFixed(2),
    );
  }

  logger.log(
    `Limit tank data for user ${userId} on ${startOfDay.format('YYYY-MM-DD')}: Total Naira Limit: ${totalNairaLimit}, Total USD Limit: ${totalUsdLimit}, Percentage Used: ${percentageUsed}%`,
  );

  return {
    totalNairaLimit,
    totalUsdLimit,
    percentageUsed,
  };
}
