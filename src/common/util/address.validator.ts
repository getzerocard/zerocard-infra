import { isAddress } from 'viem';

/**
 * Validates if a string is a valid Ethereum address
 *
 * Uses viem's isAddress function which checks:
 * - Length and formatting
 * - Hex encoding
 * - Valid checksum (if applicable)
 *
 * @param address - The address to validate
 * @returns boolean - True if valid, false otherwise
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;

  try {
    return isAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * Validates if a string is a valid wallet address
 *
 * Uses viem's isAddress function which checks:
 * - Length and formatting (0x prefix followed by 40 hex characters)
 * - Hex encoding
 * - Valid checksum (if applicable)
 *
 * @param address - The address to validate
 * @returns boolean - True if valid, false otherwise
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address) return false;

  try {
    return isAddress(address);
  } catch (error) {
    return false;
  }
}
