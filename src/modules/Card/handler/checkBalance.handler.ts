import { BadRequestException, Logger } from '@nestjs/common';
import { formatMoney, toMoney } from '../../../common/util/money';
import { getTokenBalance } from '../../../common/util/getTokenBalance';

/**
 * Checks user balance against the card order fee.
 * @param userId - The ID of the user to check balance for
 * @param symbol - Token symbol to check balance for
 * @param userAddress - The user's wallet address
 * @param chainType - The blockchain type, either 'ethereum' or 'solana'
 * @param blockchainNetwork - The specific blockchain network to check
 * @param networkType - The network type, either 'MAINET' or 'TESTNET'
 * @param orderFee - The card order fee to check against
 * @returns Promise<void> - Resolves if balance is sufficient
 * @throws BadRequestException if balance check fails or balance is insufficient
 */
export async function checkBalance(
  userId: string,
  symbol: string,
  userAddress: string,
  chainType: 'ethereum' | 'solana',
  blockchainNetwork: string,
  networkType: 'MAINET' | 'TESTNET',
  orderFee: number,
): Promise<void> {
  const balanceCheckPromise = getTokenBalance(
    symbol,
    userAddress,
    chainType,
    blockchainNetwork,
    networkType,
  ).catch((error) => ({
    error,
    message: `Failed to check balance for user ${userId}: ${error.message || error.toString()}`,
  }));

  const balanceResult = await Promise.allSettled([balanceCheckPromise]);

  if (balanceResult[0].status === 'rejected') {
    throw new BadRequestException(balanceResult[0].reason.message);
  }

  if (balanceResult[0].value.error) {
    throw new BadRequestException(balanceResult[0].value.message);
  }

  const balanceData = balanceResult[0].value;
  const orderFeeDecimal = toMoney(orderFee);
  const balanceStr = balanceData[symbol]?.[blockchainNetwork] || '0';
  Logger.log(
    `Balance result for ${symbol} on ${blockchainNetwork}: ${balanceStr}`,
    'CheckBalanceHandler',
  );

  if (balanceStr.includes('Unsupported') || balanceStr.includes('Error')) {
    throw new BadRequestException(
      `Balance check failed for user ${userId}: ${balanceStr}`,
    );
  }

  let balanceDecimal;
  try {
    balanceDecimal = toMoney(balanceStr);
  } catch (e) {
    throw new BadRequestException(
      `Invalid balance format for user ${userId}: ${balanceStr}`,
    );
  }

  if (!balanceDecimal.gte(orderFeeDecimal)) {
    const balanceFormatted = formatMoney(balanceDecimal);
    const orderFeeFormatted = formatMoney(orderFeeDecimal);
    throw new BadRequestException(
      `Insufficient balance for user ${userId}. Required: ${orderFeeFormatted}, Available: ${balanceFormatted}`,
    );
  }
}
