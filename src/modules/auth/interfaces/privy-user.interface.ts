/**
 * Interface for user data provided by Privy
 */
export interface PrivyUserData {
  /**
   * Unique user ID from Privy (format: did:privy:...)
   */
  userId: string;

  /**
   * User's email address (if available)
   */
  email?: string;

  /**
   * Ethereum wallet address (if linked)
   */
  ethereum?: string;

  /**
   * Solana wallet address (if linked)
   */
  solana?: string;

  /**
   * Bitcoin wallet address (if linked)
   */
  bitcoin?: string;

  /**
   * Tron wallet address (if linked)
   */
  tron?: string;

  /**
   * Any additional chain-specific addresses or properties
   */
  [key: string]: any;
}
