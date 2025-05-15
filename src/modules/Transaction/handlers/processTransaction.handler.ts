import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Transaction } from '../entity/transaction.entity';
import { SpendingLimit } from '../../spendingLimit/spendingLimit.entity';
import { findUserOrFail } from './findUserOrFail';
import { fetchUserSpendingLimits } from './fetchUserSpendingLimits';
import { allocateNairaToLimits } from './allocateNairaToLimits';
import { createTransactionEntity } from './createTransactionEntity';

/**
 * Processes a spending event by allocating Naira across user's spending limits (FIFO).
 * Creates Transaction and TransactionChunk records.
 * Runs within a database transaction to ensure atomicity.
 * @param userId - The ID of the user spending.
 * @param nairaAmount - The total amount spent in Naira.
 * @param transactionId - The unique identifier for the transaction.
 * @param transactionReference - The reference for the transaction.
 * @param merchantName - The name of the merchant.
 * @param merchantId - The merchant identifier.
 * @param state - The state where the transaction occurred.
 * @param city - The city where the transaction occurred.
 * @param cardId - The card identifier used for the transaction.
 * @param entityManager - The TypeORM EntityManager for database operations.
 * @param status - The status of the transaction (default is 'completed').
 * @param logger - Optional logger instance for logging operations.
 * @param recipientAddress - The recipient address for the transaction.
 * @param toAddress - The to address for the transaction.
 * @returns The saved Transaction object with its associated chunks.
 * @throws NotFoundException if the user is not found.
 * @throws InternalServerErrorException for database errors or other issues.
 */
export async function processTransaction(
  userId: string,
  nairaAmount: number,
  transactionReference: string,
  merchantName: string,
  merchantId: string,
  state: string,
  city: string,
  cardId: string,
  authorizationId: string,
  category: string,
  channel: string,
  transactionModeType: string,
  entityManager: EntityManager,
  status: 'pending' | 'completed' | 'refund',
  logger: Logger = new Logger('ProcessTransactionHandler'),
  recipientAddress: string | null = null,
  toAddress: string | null = null,
): Promise<Transaction> {
  logger.log(
    `Starting transaction processing for user ${userId} amount ${nairaAmount}`,
  );

  // Strip out the negative sign from nairaAmount
  nairaAmount = Math.abs(nairaAmount);

  try {
    return await entityManager.transaction(
      async (transactionalEntityManager) => {
        const user = await findUserOrFail(userId, transactionalEntityManager);

        const spendingLimits = await fetchUserSpendingLimits(
          userId,
          transactionalEntityManager,
        );
        if (!spendingLimits || spendingLimits.length === 0) {
          logger.warn(
            `User ${userId} has no usable spending limits. Cannot process transaction.`,
          );
          throw new InternalServerErrorException(
            `User ${userId} has no usable spending limits with remaining balance.`,
          );
        }

        const allocationResult = allocateNairaToLimits(
          nairaAmount,
          spendingLimits,
        );
        if (allocationResult.remainingAmount > 0) {
          logger.error(
            `Insufficient spending limit balance for user ${userId}. Required: ${nairaAmount}, Available: ${nairaAmount - allocationResult.remainingAmount}. Allocation: ${JSON.stringify(allocationResult)}`,
          );
          throw new InternalServerErrorException(
            `Insufficient spending limit balance for user ${userId}.`,
          );
        }

        const transactionEntity = createTransactionEntity(
          user,
          nairaAmount,
          allocationResult.usdTotal,
          allocationResult.allocatedChunks,
          transactionReference,
          merchantName,
          merchantId,
          state,
          city,
          cardId,
          allocationResult.effectiveFxRate,
          status,
          authorizationId,
          category,
          channel,
          transactionModeType,
          allocationResult.tokenInfo,
          recipientAddress,
          toAddress,
        );

        const savedTransaction = await transactionalEntityManager.save(
          Transaction,
          transactionEntity,
        );
        await transactionalEntityManager.save(
          SpendingLimit,
          allocationResult.updatedLimits,
        );

        logger.log(
          `Successfully processed transaction ${savedTransaction.authorizationId} for user ${userId}`,
        );
        return savedTransaction;
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(
      `Failed to process transaction for user ${userId}: ${errorMessage}`,
      errorStack,
    );

    if (
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }
    throw new InternalServerErrorException(
      `Transaction processing failed for user ${userId}.`,
    );
  }
}
