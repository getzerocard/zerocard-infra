import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { User } from '../../user/entity/user.entity';
import { validateUserAddressAndIdentity } from '../../../common/util/userValidation.util';

/**
 * Fetches and validates user data for card ordering.
 * @param userId - The ID of the user to fetch
 * @param userRepository - Repository to fetch user data
 * @returns Promise<User> - The fetched and validated user entity
 * @throws BadRequestException if user data fetch fails or validation fails
 * @throws NotFoundException if user is not found
 */
export async function fetchUserData(
  userId: string,
  userRepository: any,
): Promise<User> {
  const userPromise = userRepository.findOne({
    where: { userId },
    relations: ['parentUser'],
  });
  const userResult = await Promise.allSettled([userPromise]);

  if (userResult[0].status === 'rejected') {
    throw new BadRequestException(
      `User data fetch failed for ID ${userId}: ${userResult[0].reason}`,
    );
  }

  const user: User = userResult[0].value;
  if (!user) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  // Validate user's address and identity using utility function
  validateUserAddressAndIdentity(user, userId);

  // Validate user identity verification
  if (!user.isIdentityVerified) {
    throw new BadRequestException(
      `User with ID ${userId} is not identity verified`,
    );
  }

  // Validate card order status
  if (user.cardOrderStatus !== 'not_ordered') {
    throw new BadRequestException(
      `Card order status for user ${userId} is already ${user.cardOrderStatus}`,
    );
  }

  return user;
}
