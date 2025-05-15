import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../entity/user.entity';

/**
 * Find a user by their email
 * @param userRepository The repository to query the user from
 * @param email The email to search for
 * @returns The found user or null if not found
 */
export async function findUserByEmail(
  userRepository: Repository<User>,
  email: string,
): Promise<User | null> {
  const logger = new Logger('FindUserByEmail');
  logger.debug(`Searching for user with email ${email}`);
  const user = await userRepository.findOne({
    where: { email },
    relations: ['parentUser', 'subUsers'],
  });
  if (user) {
    logger.log(`User with email ${email} found`);
  } else {
    logger.warn(`User with email ${email} not found`);
  }
  return user;
}
