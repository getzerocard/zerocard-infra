import { Logger, NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { User } from '../../user/entity/user.entity';

/**
 * Finds a user by ID or throws NotFoundException.
 * @param userId - The ID of the user to find.
 * @param manager - The EntityManager for database operations.
 * @returns A Promise resolving to the User entity if found.
 * @throws NotFoundException if the user is not found.
 */

export async function findUserOrFail(
  userId: string,
  manager: EntityManager,
): Promise<User> {
  const logger = new Logger('FindUserOrFail');
  const user = await manager.findOne(User, { where: { userId } });
  if (!user) {
    logger.warn(
      `User with ID ${userId} not found during transaction processing.`,
    );
    throw new NotFoundException(`User with ID ${userId} not found.`);
  }
  return user;
}
