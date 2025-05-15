import type { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import type { AddSubUserDto } from '../dto/add-sub-user.dto';
import { findUserById } from './findUserById';

/**
 * Add a sub-user to an existing main user
 * @param userRepository - The user repository
 * @param mainUserId - The ID of the main user
 * @param subUserData - The data for the new sub-user
 * @returns The created sub-user entity
 */
export async function addSubUser(
  userRepository: Repository<User>,
  mainUserId: string,
  subUserData: AddSubUserDto,
): Promise<User> {
  const mainUser = await findUserById(userRepository, mainUserId);
  if (!mainUser) {
    throw new Error(`Main user with ID ${mainUserId} not found`);
  }

  if (!mainUser.isMainUser) {
    throw new Error(`User with ID ${mainUserId} is not a main user`);
  }

  const subUser = new User();
  subUser.email = subUserData.email;
  subUser.isMainUser = false;
  subUser.parentUser = mainUser;

  return userRepository.save(subUser);
}
