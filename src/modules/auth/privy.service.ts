import { Injectable, Logger } from '@nestjs/common';
import type { WalletWithMetadata } from '@privy-io/server-auth';
import { PrivyClient } from '@privy-io/server-auth';
import { ConfigService } from '@nestjs/config';

interface TransactionInput {
  to: `0x${string}`;
  data: `0x${string}`;
}

interface TransactionConfig {
  transaction: TransactionInput;
  chainId?: string;
}

// Export these interfaces to indicate they're intentionally defined even if not currently used
export interface _WalletResponse {
  walletId: string;
  address: string;
}

/**
 * Interface for the user details returned by Privy
 */
interface PrivyUserDetails {
  userId: string;
  email?: string;
  [key: string]: any; // Allow dynamic properties for wallet addresses
}

/**
 * Interface for auth token claims returned by Privy
 */
export interface _AuthTokenClaims {
  appId: string;
  userId: string;
  issuer: string;
  issuedAt: number;
  expiration: number;
  sessionId: string;
}

export interface _WalletDetails {
  walletId: string;
  address: string;
}

export interface _PrivyWallet {
  id: string;
  address: string;
  type: 'wallet';
  chainType: 'ethereum' | 'solana';
  verifiedAt: string;
  chainId: string;
  walletClientType: string;
  connectorType: string;
  delegated: boolean;
}

interface TransactionResponse {
  hash: string;
  caip2: string;
}

/**
 * Service for interacting with Privy authentication
 */
@Injectable()
export class PrivyService {
  private readonly privy: PrivyClient;
  private readonly logger = new Logger(PrivyService.name);
  private readonly verificationKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>('privy.appId');
    const appSecret = this.configService.get<string>('privy.appSecret');
    const authorizationKey = this.configService.get<string>(
      'privy.PRIVY_AUTHORIZATION_KEY',
    );
    this.verificationKey = this.configService.get<string>(
      'privy.verificationKey',
    );

    if (!appId) {
      this.logger.error('Privy App ID is not defined in configuration');
    }

    if (!appSecret) {
      this.logger.error('Privy App Secret is not defined in configuration');
    }

    if (!this.verificationKey) {
      this.logger.warn(
        'Privy Verification Key is not defined in configuration. You cannot make server requests',
      );
    }

    if (!authorizationKey) {
      this.logger.warn(
        'Privy Authorization Key is not defined in configuration. Wallet API features will not be available',
      );
    }

    this.privy = new PrivyClient(
      appId || 'MISSING_APP_ID',
      appSecret || 'MISSING_APP_SECRET',
      {
        walletApi: {
          authorizationPrivateKey: authorizationKey,
        },
      },
    );
  }

  /**
   * Verify a Privy access token
   *
   * @param accessToken The Privy access token to verify
   * @returns Object with success status and userId if successful
   */
  async verifyAccessToken(
    accessToken: string,
  ): Promise<{ success: boolean; userId?: string }> {
    if (!accessToken) {
      this.logger.warn('Empty access token provided');
      return { success: false };
    }

    try {
      const verifiedClaims = await this.privy.verifyAuthToken(
        accessToken,
        this.verificationKey,
      );

      return {
        success: true,
        userId: verifiedClaims.userId,
      };
    } catch (error) {
      this.logger.error(`Token verification failed: ${error}`);
      return { success: false };
    }
  }

  /**
   * Get user details from a Privy identity token
   *
   * @param identityToken The Privy identity token
   * @returns User details including userId, wallet addresses, and email
   */
  async getUserDetails(
    identityToken: string,
  ): Promise<PrivyUserDetails | null> {
    if (!identityToken) {
      this.logger.warn('Empty identity token provided');
      return null;
    }

    try {
      // getUser expects props object with idToken property
      const user = await this.privy.getUser({
        idToken: identityToken,
      });

      // Initialize result with userId and email
      const result: PrivyUserDetails = {
        userId: user.id,
        email: user.email?.address,
      };

      // Add wallet addresses as direct properties
      if (user.linkedAccounts && Array.isArray(user.linkedAccounts)) {
        for (const account of user.linkedAccounts) {
          if (
            account.type === 'wallet' &&
            account.address &&
            account.chainType
          ) {
            // Add as direct property based on chain type
            result[`${account.chainType}`] = account.address;
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error verifying identity token: ${error}`);
      return null;
    }
  }

  /**
   * Check if a user has any delegated wallets
   *
   * @param idToken The user's identity token
   * @returns Boolean indicating if user has delegated wallets
   *
   * @remarks
   * We use idToken instead of userId because:
   * - The getUser(userId) method is deprecated and subject to strict rate limits
   * - Using idToken with getUser({ idToken }) is the recommended approach
   * - This method scales better and avoids rate limiting issues
   */
  async hasDelegatedWallets(idToken: string): Promise<boolean> {
    try {
      const user = await this.privy.getUser({ idToken });

      const embeddedWallets = user.linkedAccounts.filter(
        (account): account is WalletWithMetadata =>
          account.type === 'wallet' && account.walletClientType === 'privy',
      );

      const delegatedWallets = embeddedWallets.filter(
        (wallet) => wallet.delegated,
      );

      return delegatedWallets.length > 0;
    } catch (error) {
      this.logger.error(`Error checking delegated wallets: ${error}`);
      return false;
    }
  }

  /**
   * Send Ethereum transaction using Privy's wallet API
   * @param walletId - The wallet ID
   * @param config - Transaction configuration including data and optional chain ID
   * @returns Transaction response object containing hash and caip2
   */
  async sendEthereumTransaction(
    walletId: string,
    config: TransactionConfig,
  ): Promise<TransactionResponse> {
    try {
      const response = await this.privy.walletApi.ethereum.sendTransaction({
        walletId,
        transaction: config.transaction,
        caip2: `eip155:${config.chainId || '1'}`,
      });

      return response as TransactionResponse;
    } catch (error) {
      this.logger.error(`Error sending ethereum transaction:`, error);
      throw error;
    }
  }

  /**
   * Get wallet ID and address for a specific chain type
   *
   * @param userId The Privy user ID (DID)
   * @param chainType The blockchain type ('ethereum' or 'solana')
   * @returns Array of wallet objects containing id and address, or empty array if none found
   */
  async getWalletId(
    userId: string,
    chainType: 'ethereum' | 'solana',
  ): Promise<Array<{ id: string; address: string }>> {
    if (!userId) {
      this.logger.warn('Empty userId provided');
      return [];
    }

    try {
      const user = await this.privy.getUser(userId);

      if (!user.linkedAccounts || !Array.isArray(user.linkedAccounts)) {
        this.logger.warn('No linked accounts found for user');
        return [];
      }

      // Filter wallets by chain type
      const wallets = user.linkedAccounts.filter(
        (account): account is WalletWithMetadata =>
          account.type === 'wallet' && account.chainType === chainType,
      );

      // Log the full wallet objects for debugging
      this.logger.debug('Found wallets:', wallets);

      // Map to simplified wallet objects
      return wallets.map((wallet) => {
        // Cast the wallet to any to access the fields we know exist
        const typedWallet = wallet as any;
        return {
          id: typedWallet.id,
          address: typedWallet.address,
        };
      });
    } catch (error) {
      this.logger.error(`Error fetching wallet details for ${userId}:`, error);
      throw error;
    }
  }
}
