import type { EntityManager } from 'typeorm';
import { MoreThan } from 'typeorm';
import { SpendingLimit } from '../../spendingLimit/spendingLimit.entity';
import { Logger } from '@nestjs/common';

/**
 * Fetches all spending limits for a user with remaining balance, ordered by creation date (FIFO).
 * @param userId - The ID of the user whose spending limits are to be fetched.
 * @param manager - The EntityManager for database operations.
 * @returns A Promise resolving to an array of SpendingLimit entities with remaining balance.
 */
export async function fetchUserSpendingLimits(
  userId: string,
  manager: EntityManager,
): Promise<SpendingLimit[]> {
  const logger = new Logger('FetchUserSpendingLimits');
  logger.debug(`Fetching spending limits for user ${userId}`);
  return manager.find(SpendingLimit, {
    where: {
      user: { userId },
      nairaRemaining: MoreThan(0),
    },
    order: { createdAt: 'ASC' }, // Oldest first (FIFO)
  });
}
