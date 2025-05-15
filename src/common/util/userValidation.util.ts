import { BadRequestException, Logger } from '@nestjs/common';
import type { User } from '../../modules/user/entity/user.entity';

/**
 * Validates that a user has complete address information and is identity verified.
 * @param user - The user entity to validate
 * @param userId - The ID of the user for error messaging
 * @throws BadRequestException if the user is not identity verified or missing required address fields
 */
export function validateUserAddressAndIdentity(
  user: User,
  userId: string,
): void {
  if (!user.isIdentityVerified) {
    throw new BadRequestException(
      `User with ID ${userId} is not identity verified`,
    );
  }

  const requiredAddressFields = [
    'city',
    'state',
    'street',
    'country',
    'postalCode',
  ];
  for (const field of requiredAddressFields) {
    if (
      !user[field] ||
      typeof user[field] !== 'string' ||
      user[field].trim() === ''
    ) {
      throw new BadRequestException(
        `User with ID ${userId} is missing required address field: ${field}`,
      );
    }
  }
  Logger.log(
    `Address and identity validation passed for user ${userId}`,
    'UserValidationUtil',
  );
}
