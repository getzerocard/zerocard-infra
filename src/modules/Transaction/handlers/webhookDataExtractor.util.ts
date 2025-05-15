import { Logger } from '@nestjs/common';

/**
 * Extracts authorization data from webhook payload.
 * Handles edge cases such as negative amounts by converting to positive.
 * @param data - The webhook data.
 * @returns The extracted authorization data.
 * @throws Error if the webhook data is invalid or missing critical fields.
 */
export function extractAuthorizationData(data: any): {
  customerId: string;
  amount: number;
  reference: string;
  name: string;
  merchantId: string;
  state: string;
  city: string;
  cardId: string;
  authorization: string;
  category: string;
  channel: string;
  transactionModeType: string;
} {
  const object = data?.data?.object || data?.object;
  if (!object) {
    throw new Error('Invalid webhook data: object not found');
  }
  // Handle negative amounts by converting to positive as spending should always be a positive value
  const rawAmount = object.amount || 0;
  const amount = Math.abs(rawAmount);
  if (rawAmount < 0) {
    Logger.warn(
      `Negative amount ${rawAmount} converted to positive ${amount} in webhook data for authorization ${object.authorization || object._id || 'unknown'}`,
    );
  }
  return {
    customerId: object.customer,
    amount: amount,
    reference: object.transactionMetadata?.reference || object.reference || '',
    name: object.merchant?.name || 'Unknown Merchant',
    merchantId: object.merchant?.merchantId || 'Unknown ID',
    state: object.merchant?.state || 'Unknown State',
    city: object.merchant?.city || 'Unknown City',
    cardId: object.card || 'Unknown Card',
    authorization:
      object.authorization || object._id || 'Unknown Authorization',
    category: object.merchant?.category || 'Uncategorized',
    channel: object.transactionMetadata?.channel || 'Unknown Channel',
    transactionModeType:
      object.transactionMetadata?.type || object.type || 'Unknown Type',
  };
}

/**
 * Extracts refund request data from webhook payload.
 * @param data - The webhook data.
 * @returns The extracted refund data.
 */
export function extractRefundRequestData(data: any): {
  customerId: string;
  authorization: string;
} {
  const object = data?.data?.object || data?.object;
  if (!object) {
    throw new Error('Invalid webhook data: object not found');
  }
  return {
    customerId: object.customer,
    authorization:
      object.authorization || object._id || 'Unknown Authorization',
  };
}
