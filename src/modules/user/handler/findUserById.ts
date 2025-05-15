import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../entity/user.entity';

/**
 * Find a user by their userId
 * @param userRepository The repository to query the user from
 * @param userId The user ID to search for
 * @returns The found user or null if not found
 */
export async function findUserById(
  userRepository: Repository<User>,
  userId: string,
): Promise<User | null> {
  const logger = new Logger('FindUserById');
  logger.debug(`Searching for user with ID ${userId}`);
  const user = await userRepository.findOne({
    where: { userId },
    relations: ['parentUser', 'subUsers'],
  });
  if (user) {
    logger.log(`User with ID ${userId} found`);
  } else {
    logger.warn(`User with ID ${userId} not found`);
  }
  return user;
}
