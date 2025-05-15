import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entity/transaction.entity';
import { SpendingLimit } from '../../spendingLimit/spendingLimit.entity';
import { User } from '../../user/entity/user.entity';
import { processTransaction } from '../handlers/processTransaction.handler';
import {
  extractAuthorizationData,
  extractRefundRequestData,
} from '../handlers/webhookDataExtractor.util';
import {
  TransactionNotFoundException,
  UserNotFoundException,
} from '../../../common/interfaces/exceptions';

@Injectable()
export class ProcessTransactionService {
  private readonly logger = new Logger(ProcessTransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(SpendingLimit)
    private readonly spendingLimitRepository: Repository<SpendingLimit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Processes a spending event by allocating Naira across user's spending limits (FIFO).
   * Creates Transaction and TransactionChunk records.
   * Runs within a database transaction to ensure atomicity.
   * @param userId - The ID of the user spending.
   * @param nairaAmount - The total amount spent in Naira.
   * @param transactionReference - The reference for the transaction.
   * @param merchantName - The name of the merchant.
   * @param merchantId - The merchant identifier.
   * @param state - The state where the transaction occurred.
   * @param city - The city where the transaction occurred.
   * @param cardId - The card identifier used for the transaction.
   * @param authorizationId - The authorization ID for the transaction.
   * @param category - The category of the merchant.
   * @param channel - The channel through which the transaction was made.
   * @param transactionModeType - The type of transaction mode.
   * @param status - The status of the transaction (default is 'completed').
   * @returns The saved Transaction object with its associated chunks.
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException for database errors or other issues.
   */
  async processSpending(
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
    status: 'pending' | 'completed' | 'refund',
  ): Promise<Transaction> {
    return await this.transactionRepository.manager.transaction(
      async (transactionalEntityManager) => {
        return await processTransaction(
          userId,
          nairaAmount,
          transactionReference,
          merchantName,
          merchantId,
          state,
          city,
          cardId,
          authorizationId,
          category,
          channel,
          transactionModeType,
          transactionalEntityManager,
          status,
          this.logger,
          null, // we passed null because we are not using the recipient address and to address for spending
          null, // we passed null because we are not using the recipient address and to address for spending
        );
      },
    );
  }

  /**
   * Checks if a transaction with the given authorization ID already exists.
   * @param authorizationId - The authorization ID to check.
   * @param userId - The user ID associated with the transaction.
   * @returns The existing transaction if found, null otherwise.
   */
  private async checkExistingTransaction(
    authorizationId: string,
    userId: string,
  ): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: {
        authorizationId,
        user: { userId },
      },
    });
  }

  /**
   * Handles transaction.created webhook event for testnet mode.
   * @param data - The webhook data.
   * @returns The processed transaction data.
   */
  async handleTransactionCreated(data: any): Promise<any> {
    const authorizationData = extractAuthorizationData(data);
    const user = await this.userRepository.findOne({
      where: { customerId: authorizationData.customerId },
    });
    if (!user) {
      throw new UserNotFoundException(
        `User with customerId ${authorizationData.customerId} not found`,
      );
    }
    // Check for existing transaction to prevent duplicates
    const existingTransaction = await this.checkExistingTransaction(
      authorizationData.authorization,
      user.userId,
    );
    if (existingTransaction) {
      this.logger.warn(
        `Duplicate transaction detected for authorization ID ${authorizationData.authorization}`,
      );
      return {
        transactionId: existingTransaction.authorizationId,
        message: 'Transaction already processed',
      };
    }
    const transaction = await this.processSpending(
      user.userId,
      authorizationData.amount,
      authorizationData.reference,
      authorizationData.name,
      authorizationData.merchantId,
      authorizationData.state,
      authorizationData.city,
      authorizationData.cardId,
      authorizationData.authorization,
      authorizationData.category,
      authorizationData.channel,
      authorizationData.transactionModeType,
      'pending',
    );
    return {
      transactionId: transaction.authorizationId,
      amount: transaction.nairaAmount,
      currency: data?.object?.currency || 'NGN',
    };
  }

  /**
   * Handles authorization.request webhook event.
   * @param data - The webhook data.
   * @returns The processed transaction data.
   */
  async handleAuthorizationRequest(data: any): Promise<any> {
    const authorizationData = extractAuthorizationData(data);
    const user = await this.userRepository.findOne({
      where: { customerId: authorizationData.customerId },
    });
    if (!user) {
      throw new UserNotFoundException(
        `User with customerId ${authorizationData.customerId} not found`,
      );
    }
    // Check for existing transaction to prevent duplicates
    const existingTransaction = await this.checkExistingTransaction(
      authorizationData.authorization,
      user.userId,
    );
    if (existingTransaction) {
      this.logger.warn(
        `Duplicate authorization request detected for authorization ID ${authorizationData.authorization}`,
      );
      return {
        transactionId: existingTransaction.authorizationId,
        message: 'Authorization request already processed',
      };
    }
    const transaction = await this.processSpending(
      user.userId,
      authorizationData.amount,
      authorizationData.reference,
      authorizationData.name,
      authorizationData.merchantId,
      authorizationData.state,
      authorizationData.city,
      authorizationData.cardId,
      authorizationData.authorization,
      authorizationData.category,
      authorizationData.channel,
      authorizationData.transactionModeType,
      'pending',
    );
    return {
      metadata: { extractedData: authorizationData },
      transactionId: transaction.authorizationId,
    };
  }

  /**
   * Handles authorization.updated webhook event.
   * @param data - The webhook data.
   * @returns The processed transaction data.
   */
  async handleAuthorizationUpdated(data: any): Promise<any> {
    return await this.transactionRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const authorizationData = extractAuthorizationData(data);
        const user = await transactionalEntityManager.findOne(User, {
          where: { customerId: authorizationData.customerId },
        });
        if (!user) {
          throw new UserNotFoundException(
            `User with customerId ${authorizationData.customerId} not found`,
          );
        }
        const transaction = await transactionalEntityManager.findOne(
          Transaction,
          {
            where: {
              user: { userId: user.userId },
              authorizationId: authorizationData.authorization,
            },
          },
        );
        if (!transaction) {
          throw new TransactionNotFoundException(
            `Transaction with authorizationId ${authorizationData.authorization} not found for user ${user.userId}`,
          );
        }
        transaction.status = 'completed';
        await transactionalEntityManager.save(Transaction, transaction);
        return {
          metadata: { extractedData: authorizationData },
          transactionId: transaction.authorizationId,
        };
      },
    );
  }

  /**
   * Handles transaction.refund webhook event.
   * @param data - The webhook data.
   * @returns The processed transaction data.
   */
  async handleTransactionRefund(data: any): Promise<any> {
    return await this.transactionRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const refundData = extractRefundRequestData(data);
        const user = await transactionalEntityManager.findOne(User, {
          where: { customerId: refundData.customerId },
        });
        if (!user) {
          throw new UserNotFoundException(
            `User with customerId ${refundData.customerId} not found`,
          );
        }
        const transaction = await transactionalEntityManager.findOne(
          Transaction,
          {
            where: {
              user: { userId: user.userId },
              authorizationId: refundData.authorization,
            },
          },
        );
        if (!transaction) {
          throw new TransactionNotFoundException(
            `Transaction with authorizationId ${refundData.authorization} not found for user ${user.userId}`,
          );
        }
        transaction.status = 'refund';
        await transactionalEntityManager.save(Transaction, transaction);
        return {
          metadata: { extractedData: refundData },
          transactionId: transaction.authorizationId,
        };
      },
    );
  }
}
