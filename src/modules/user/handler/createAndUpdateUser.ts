import { ConflictException, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../entity/user.entity';
import type { PrivyUserData } from '../../auth/interfaces/privy-user.interface';
import { extractWalletAddresses } from './extractWalletAddresses';
import { findUserById } from './findUserById';
import type { EmailHandlerService } from '../../../modules/notification/email.handler.service';

/**
 * Create a new user if they don't exist, or update an existing user
 * This is an optimized method that combines existence check, creation, and update
 *
 * @param userRepository - The repository to interact with the User entity
 * @param userId - The user ID to create or update
 * @param userData - The Privy user data for creation
 * @param emailHandlerService - The service to send welcome emails
 * @param updateData - Optional data to update if the user exists
 * @returns The created or updated user
 */
export async function createAndUpdateUser(
  userRepository: Repository<User>,
  userId: string,
  userData: PrivyUserData,
  emailHandlerService: EmailHandlerService,
  updateData?: Record<string, any>,
): Promise<User> {
  const logger = new Logger('CreateAndUpdateUser');
  logger.debug(`Creating or updating user with userId ${userId}`);

  try {
    // First try to find the user (one database query)
    const user = await findUserById(userRepository, userId);

    // If user exists, update it (if update data provided)
    if (user) {
      logger.debug(`User ${userId} exists, applying updates if needed`);

      // If no update data, return existing user
      if (!updateData || Object.keys(updateData).length === 0) {
        return user;
      }

      // Process wallet addresses if present
      const processedData = extractWalletAddresses(updateData);

      // Update the user
      await userRepository.update({ userId }, processedData);

      // Return updated user by merging in memory
      return { ...user, ...processedData };
    }

    // User doesn't exist, create a new one
    logger.debug(`User ${userId} doesn't exist, creating new user`);
    const { email, ...restData } = userData;

    // Create base user from Privy data
    let newUser = userRepository.create({
      userId,
      email,
      isMainUser: true,
      ...extractWalletAddresses(restData),
    });

    // Apply any additional update data if provided
    if (updateData && Object.keys(updateData).length > 0) {
      const processedUpdates = extractWalletAddresses(updateData);
      newUser = { ...newUser, ...processedUpdates };
    }

    // Save to database (single operation)
    const savedUser = await userRepository.save(newUser, { transaction: true });

    // Send welcome email if email is provided (non-blocking)
    if (email) {
      emailHandlerService
        .sendWelcomeEmail(email, savedUser.firstName || 'there')
        .catch((error) => {
          logger.error(
            `Failed to send welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : 'No stack trace',
          );
        });
    }

    return savedUser;
  } catch (error) {
    logger.error(
      `Error in createAndUpdateUser for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : 'No stack trace',
    );
    if (
      error instanceof Error &&
      (error.message.includes('ER_DUP_ENTRY') ||
        error.message.includes('unique constraint'))
    ) {
      throw new ConflictException(
        'User already exists with this email or other unique identifier.',
      );
    }
    throw error;
  }
}
