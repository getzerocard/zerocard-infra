import { UnauthorizedException } from '@nestjs/common';

/**
 * Resolves the target user ID and checks if the authenticated user is authorized to perform actions on it.
 * If the provided userId is 'me', it returns the authenticated user's ID.
 * Throws an UnauthorizedException if the authenticated user tries to access another user's data.
 *
 * @param userId The user ID from the request parameter, can be 'me' or a specific ID
 * @param authUserId The authenticated user's ID from the token or session
 * @param errorMessage Custom error message for unauthorized access
 * @returns The resolved target user ID
 * @throws UnauthorizedException if the authenticated user is not authorized to access the target user
 */
export function resolveAndAuthorizeUserId(
  userId: string,
  authUserId: string,
  errorMessage: string = 'Cannot perform action for another user',
): string {
  // If userId is 'me', use the authenticated user's ID
  const targetUserId = userId === 'me' ? authUserId : userId;

  // Authorization check - can only perform action for self
  if (authUserId !== targetUserId) {
    throw new UnauthorizedException(errorMessage);
  }

  return targetUserId;
}
