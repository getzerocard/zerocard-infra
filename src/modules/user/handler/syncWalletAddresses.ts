import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../entity/user.entity';
import type { PrivyUserData } from '../../auth/interfaces/privy-user.interface';
import { findUserById } from './findUserById';
import { extractWalletAddresses } from './extractWalletAddresses';

/**
 * Sync wallet addresses for an existing user
 * Used when a user links a new blockchain wallet in Privy
 *
 * @param userRepository - The repository for User entity
 * @param userId - The user ID to update
 * @param privyData - The data from Privy containing updated wallet addresses
 * @returns The updated user entity
 */
export async function syncWalletAddresses(
  userRepository: Repository<User>,
  userId: string,
  privyData: PrivyUserData,
): Promise<User> {
  const logger = new Logger('SyncWalletAddresses');
  logger.debug(`Syncing wallet addresses for user ${userId}`);

  // Validate that the privyData pertains to the target userId
  if (privyData.userId !== userId) {
    logger.warn(
      `Privy data userId ${privyData.userId} does not match target userId ${userId}, skipping sync`,
    );
    return await findUserById(userRepository, userId);
  }

  // Extract just the wallet-related fields
  const walletUpdates = extractWalletAddresses(privyData);

  // If no wallet data to sync, just return the user without updates
  if (Object.keys(walletUpdates).length === 0) {
    logger.debug(`No wallet data to sync for user ${userId}`);
    return await findUserById(userRepository, userId);
  }

  try {
    // Get current user data in a single query
    const currentUser = await findUserById(userRepository, userId);

    // Track if there are any changes
    let hasChanges = false;

    // Check for new wallets that aren't already in the database
    const updates: Record<string, string> = {};

    // EVM wallet check
    if (
      walletUpdates.EVMWalletAddress &&
      walletUpdates.EVMWalletAddress !== currentUser.EVMWalletAddress
    ) {
      updates.EVMWalletAddress = walletUpdates.EVMWalletAddress;
      hasChanges = true;
    }

    // Solana wallet check
    if (
      walletUpdates.SolanaWalletAddress &&
      walletUpdates.SolanaWalletAddress !== currentUser.SolanaWalletAddress
    ) {
      updates.SolanaWalletAddress = walletUpdates.SolanaWalletAddress;
      hasChanges = true;
    }

    // Bitcoin wallet check
    if (
      walletUpdates.BitcoinWalletAddress &&
      walletUpdates.BitcoinWalletAddress !== currentUser.BitcoinWalletAddress
    ) {
      updates.BitcoinWalletAddress = walletUpdates.BitcoinWalletAddress;
      hasChanges = true;
    }

    // Tron wallet check
    if (
      walletUpdates.TronWalletAddress &&
      walletUpdates.TronWalletAddress !== currentUser.TronWalletAddress
    ) {
      updates.TronWalletAddress = walletUpdates.TronWalletAddress;
      hasChanges = true;
    }

    // If we found changes, update the user
    if (hasChanges) {
      logger.debug(`Updating wallet addresses for user ${userId}`);
      await userRepository.update({ userId }, updates);

      // Update the user object in memory to avoid another database query
      const updatedUser = { ...currentUser, ...updates };
      return updatedUser;
    }

    // No changes needed
    logger.debug(`No wallet changes detected for user ${userId}`);
    return currentUser;
  } catch (error) {
    logger.error(
      `Error syncing wallet addresses for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : 'No stack trace',
    );
    throw error;
  }
}
