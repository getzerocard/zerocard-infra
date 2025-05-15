import { Logger } from '@nestjs/common';
import { User } from '../../user/entity/user.entity';
import { PlatformDebit } from '../entity/Platformfees.entity';
import { Transaction } from '../../Transaction/entity/transaction.entity';
import { LockStatus, FundsLock } from '../entity/fundsLock.entity';
import { Repository } from 'typeorm';

/**
 * Processes database transactions for card ordering, including debit record and status updates.
 * @param user - The user entity ordering the card
 * @param userId - The ID of the user
 * @param debitUserId - The ID of the user to debit (could be main user for sub-users)
 * @param symbol - Token symbol used for the transaction
 * @param orderFee - The card order fee amount
 * @param transactionHash - The transaction hash from the debit operation
 * @param chainType - The blockchain type, either 'ethereum' or 'solana'
 * @param blockchainNetwork - The specific blockchain network used
 * @param networkType - The network type, either 'MAINET' or 'TESTNET'
 * @param debitStatus - The status of the debit operation ('completed' or 'failed')
 * @param isSubUser - Whether the user is a sub-user
 * @param fundsLock - The funds lock entity if applicable for sub-users
 * @param userRepository - Repository to manage database operations
 * @returns Promise<void> - Resolves when transactions are complete
 */
export async function processCardOrderTransaction(
  user: User,
  userId: string,
  debitUserId: string,
  symbol: string,
  orderFee: number,
  transactionHash: string,
  chainType: 'ethereum' | 'solana',
  blockchainNetwork: string,
  networkType: 'MAINET' | 'TESTNET',
  debitStatus: 'completed' | 'failed',
  isSubUser: boolean,
  fundsLock: FundsLock | null,
  userRepository: Repository<User>,
): Promise<void> {
  // Save debit transaction to PlatformDebit entity regardless of outcome
  const platformDebit = new PlatformDebit();
  platformDebit.userId = userId;
  platformDebit.debitedUserId = debitUserId;
  platformDebit.symbol = symbol;
  platformDebit.amount = orderFee.toString();
  platformDebit.transactionHash = transactionHash;
  platformDebit.chainType = chainType;
  platformDebit.blockchainNetwork = blockchainNetwork;
  platformDebit.transactionType = 'card_order';
  platformDebit.status = debitStatus;

  // Use a transaction to ensure atomicity for database operations
  await userRepository.manager.transaction(
    async (transactionalEntityManager) => {
      // Also save to Transaction entity to maintain a unified transaction history
      const transaction = new Transaction();
      transaction.user = user;
      transaction.nairaAmount = null; // No Naira amount for crypto transactions
      transaction.usdAmount = orderFee;
      transaction.type = 'withdrawal';
      transaction.status = debitStatus;
      transaction.cardId = null;
      transaction.transactionReference =
        transactionHash || 'card_order_' + Date.now().toString();
      transaction.merchantName = 'Zero Card';
      transaction.merchantId = 'zero_card';
      transaction.state = null;
      transaction.city = null;
      transaction.effectiveFxRate = null;
      transaction.authorizationId = transactionHash;
      transaction.category = 'card_order';
      transaction.channel = 'crypto';
      transaction.transactionHash = null;
      transaction.transactionModeType = 'card_order';
      transaction.tokenInfo = [
        {
          chain: chainType,
          blockchain: blockchainNetwork,
          token: symbol,
        },
      ];
      transaction.recipientAddress = null;
      transaction.toAddress = null;
      // Save both PlatformDebit and Transaction records in parallel within the transaction
      await Promise.all([
        transactionalEntityManager
          .save(PlatformDebit, platformDebit)
          .then(() => {
            Logger.log(
              `Debit transaction saved for user ${userId} with ID ${platformDebit.id} and status ${debitStatus}`,
              'ProcessCardOrderTransactionHandler',
            );
          }),
        transactionalEntityManager.save(Transaction, transaction).then(() => {
          Logger.log(
            `Transaction saved to Transaction entity for user ${userId} with reference ${transaction.transactionReference}`,
            'ProcessCardOrderTransactionHandler',
          );
        }),
      ]);

      // Update card order status only if debit is completed
      if (debitStatus === 'completed') {
        user.cardOrderStatus = 'ordered';
        await transactionalEntityManager.save(User, user);
        Logger.log(
          `Card order status updated to 'ordered' for user ${userId}`,
          'ProcessCardOrderTransactionHandler',
        );

        // Free locked funds if user is a sub-user and funds were locked
        if (isSubUser && fundsLock) {
          fundsLock.status = LockStatus.FREE;
          fundsLock.updatedAt = new Date();
          await transactionalEntityManager.save(FundsLock, fundsLock);
          Logger.log(
            `Locked funds freed for sub-user ${userId} under main user ${fundsLock.user.userId}`,
            'ProcessCardOrderTransactionHandler',
          );
        }
      } else {
        Logger.log(
          `Card order status not updated for user ${userId} due to failed debit`,
          'ProcessCardOrderTransactionHandler',
        );
      }
    },
  );
}
