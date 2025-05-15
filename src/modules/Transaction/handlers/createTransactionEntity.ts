import { Logger } from '@nestjs/common';
import type { User } from '../../user/entity/user.entity';
import { Transaction } from '../entity/transaction.entity';
import type { TransactionChunk } from '../entity/transaction-chunk.entity';

/**
 * Creates a Transaction entity with the provided details and associated chunks.
 * @param user - The User entity associated with the transaction.
 * @param nairaAmount - The total amount spent in Naira.
 * @param usdTotal - The total amount in USD.
 * @param allocatedChunks - An array of TransactionChunk entities representing allocations.
 * @param transactionReference - The reference for the transaction.
 * @param merchantName - The name of the merchant.
 * @param merchantId - The merchant identifier.
 * @param state - The state where the transaction occurred.
 * @param city - The city where the transaction occurred.
 * @param cardId - The card identifier used for the transaction.
 * @param effectiveFxRate - The effective exchange rate for the transaction.
 * @param status - The status of the transaction (e.g., 'pending', 'completed', 'failed').
 * @param authorizationId - The authorization ID for the transaction.
 * @param category - The category of the merchant.
 * @param channel - The channel through which the transaction was made.
 * @param transactionModeType - The type of transaction mode.
 * @param tokenInfo - The token information associated with the spending limits used.
 * @param recipientAddress - The recipient address for the transaction.
 * @param toAddress - The to address for the transaction.
 * @returns A Transaction entity ready to be saved.
 */
export function createTransactionEntity(
  user: User,
  nairaAmount: number,
  usdTotal: number,
  allocatedChunks: TransactionChunk[],
  transactionReference: string,
  merchantName: string,
  merchantId: string,
  state: string,
  city: string,
  cardId: string,
  effectiveFxRate: number,
  status: 'pending' | 'completed' | 'refund',
  authorizationId: string,
  category: string,
  channel: string,
  transactionModeType: string,
  tokenInfo: { chain: string; blockchain: string; token: string }[],
  recipientAddress: string | null = null,
  toAddress: string | null = null,
): Transaction {
  const logger = new Logger('CreateTransactionEntity');
  logger.debug(`Creating transaction entity for user ${user.userId}`);
  const transaction = new Transaction();
  transaction.type = 'spending';
  transaction.user = user;
  transaction.nairaAmount = nairaAmount;
  transaction.usdAmount = usdTotal;
  transaction.effectiveFxRate = effectiveFxRate;
  transaction.transactionReference = transactionReference;
  transaction.merchantName = merchantName;
  transaction.merchantId = merchantId;
  transaction.state = state;
  transaction.city = city;
  transaction.cardId = cardId;
  transaction.chunks = allocatedChunks;
  transaction.status = status;
  transaction.authorizationId = authorizationId;
  transaction.category = category;
  transaction.channel = channel;
  transaction.transactionModeType = transactionModeType;
  transaction.tokenInfo = tokenInfo;
  transaction.recipientAddress = recipientAddress;
  transaction.toAddress = toAddress;
  // createdAt is handled by @CreateDateColumn
  return transaction;
}
