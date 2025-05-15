import { Logger } from '@nestjs/common';
import {
  fetchAggregatorPublicKey,
  publicKeyEncrypt,
} from '../../../common/util/encryption.utils';
import { getTokenBySymbol } from '../../../common/util/fetchsupportedTokens';
import { fetchTokenRate } from '../../../common/util/fetchTokenRate';

export interface RecipientDetails {
  accountIdentifier: string;
  accountName: string;
  institution: string;
  memo: string;
}

export interface EncryptedRecipientResult {
  publicKey: any;
  messageHash: string;
}

export interface TokenInfoResult {
  symbol: string;
  decimals: number;
  tokenAddress: string;
  rpcUrl: string;
  chainId: number;
  gatewayAddress: string;
  rate: string;
  amount: string;
  chainType: string;
  blockchainNetwork?: string;
}

const logger = new Logger('PrepareOfframp');

/**
 * Encrypts recipient details for offramp processing
 * @param aggregatorUrl - Base URL of the aggregator API (includes /v1)
 * @param accountIdentifier - The recipient's account identifier
 * @param accountName - The recipient's account name
 * @param institution - The recipient's institution
 * @param memo - Optional memo for the transaction
 * @returns Object containing the public key and encrypted message hash
 *
 * @example
 * const result = await encryptRecipientDetails(
 *   "https://api.paycrest.io/v1",
 *   "12345678953",
 *   "John Doe",
 *   "KUDANGPC",
 *   "N/A"
 * );
 */
export async function encryptRecipientDetails(
  aggregatorUrl: string,
  accountIdentifier: string,
  accountName: string,
  institution: string,
  memo: string = 'N/A',
): Promise<EncryptedRecipientResult> {
  try {
    const recipient: RecipientDetails = {
      accountIdentifier,
      accountName,
      institution,
      memo,
    };

    const publicKey = await fetchAggregatorPublicKey(aggregatorUrl);
    const messageHash = await publicKeyEncrypt(recipient, publicKey.data);

    logger.debug('Successfully encrypted recipient details');
    return { publicKey, messageHash };
  } catch (error) {
    logger.error('Error encrypting recipient details:', error);
    throw error;
  }
}

/**
 * Combines token information and rate data into a single response
 * @param aggregatorUrl - Base URL of the aggregator API
 * @param symbol - Cryptocurrency token symbol (e.g., 'USDC')
 * @param network - Network type (e.g., 'MAINET', 'TESTNET')
 * @param amount - Amount of the token
 * @param fiat - Fiat currency code (e.g., 'NGN')
 * @param chainType - The blockchain type ('ethereum' or 'solana')
 * @param blockchainNetwork - The specific blockchain network name (e.g., 'BNB Smart Chain', 'Base')
 * @returns Simplified token information with rate
 *
 * @example
 * const result = await tokenInfo(
 *   'https://aggregatorurl.com',
 *   'USDC',
 *   'MAINET',
 *   '100',
 *   'NGN',
 *   'ethereum',
 *   'Base'
 * );
 *
 * Example return value:
 * {
 *   symbol: "USDC",
 *   decimals: 6,
 *   tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
 *   rpcUrl: "https://mainnet.base.org",
 *   chainId: 8453,
 *   gatewayAddress: "0x30f6a8457f8e42371e204a9c103f2bd42341dd0f",
 *   rate: "1629.59",
 *   amount: "100",
 *   chainType: "ethereum",
 *   blockchainNetwork: "Base"
 * }
 */
export async function tokenInfo(
  aggregatorUrl: string,
  symbol: string,
  network: string,
  amount: string,
  fiat: string,
  chainType: string,
  blockchainNetwork?: string,
): Promise<TokenInfoResult> {
  try {
    // Get token information
    const token = getTokenBySymbol(
      symbol,
      network,
      chainType,
      blockchainNetwork,
    );
    if (!token) {
      throw new Error(
        `${chainType} token ${symbol} not found for network ${network}${blockchainNetwork ? ' on ' + blockchainNetwork : ''}`,
      );
    }

    // Get token rate
    const rateData = await fetchTokenRate(aggregatorUrl, symbol, amount, fiat);

    return {
      symbol: token.symbol,
      decimals: token.decimals,
      tokenAddress: token.tokenAddress,
      rpcUrl: token.rpcUrl,
      chainId: token.chainId,
      gatewayAddress: token.gatewayAddress,
      rate: rateData.rate,
      amount: rateData.amount,
      chainType: token.chainType,
      blockchainNetwork: token.blockchainNetwork,
    };
  } catch (error) {
    logger.error('Error fetching token info:', error);
    throw error;
  }
}
