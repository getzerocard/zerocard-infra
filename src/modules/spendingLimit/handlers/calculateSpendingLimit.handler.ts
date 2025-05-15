import type { Repository } from 'typeorm';
import type { SpendingLimit } from '../spendingLimit.entity';
import { toMoney } from '../../../common/util/money';
import type { Decimal } from 'decimal.js';

/**
 * Calculate the total USD amount from existing spending limits for a user within a time period.
 * @param spendingLimitRepository The repository to interact with the SpendingLimit entity.
 * @param userId The ID of the user.
 * @param timePeriod The time period for the constraint (daily, weekly, monthly, yearly, or null).
 * @param userTimeZone The user's time zone to adjust the start date calculation (IANA format, e.g., 'America/New_York'). Defaults to 'UTC'.
 * @returns The total USD amount as a Decimal.
 */
export async function calculateTotalSpendingLimit(
  spendingLimitRepository: Repository<SpendingLimit>,
  userId: string,
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' | null,
  userTimeZone: string = 'UTC',
): Promise<Decimal> {
  let startDate: Date | undefined;

  if (timePeriod) {
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: userTimeZone }),
    );
    if (timePeriod === 'daily') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (timePeriod === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of the week (Sunday)
      startDate.setHours(0, 0, 0, 0);
    } else if (timePeriod === 'monthly') {
      startDate = new Date(now);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (timePeriod === 'yearly') {
      startDate = new Date(now);
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }
  }

  // Get existing spending limits for the user within the time period
  const queryOptions = {
    where: { user: { userId } },
  };

  if (startDate) {
    queryOptions.where['createdAt'] = { gte: startDate };
    // Note: createdAt is automatically set by TypeORM's @CreateDateColumn, ensuring it's always present
  }

  const existingLimits = await spendingLimitRepository.find(queryOptions);

  // Calculate total USD amount from existing limits within the time period
  return existingLimits.reduce(
    (sum, limit) => sum.plus(toMoney(limit.usdAmount)),
    toMoney(0),
  );
}
