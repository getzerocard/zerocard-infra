import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../entity/user.entity';
import { Constraint } from '../entity/authorisedUserConstraint.entity';
import { findUserById } from './findUserById';

/**
 * Add a spending limit constraint to a sub-user by a main user
 * @param userRepository The repository to interact with the User entity
 * @param constraintRepository The repository to interact with the Constraint entity
 * @param mainUserId The ID of the main user adding the constraint
 * @param subUserId The ID of the sub-user to whom the constraint will be applied
 * @param constraintValue The value of the spending limit constraint
 * @param timePeriod The time period for the constraint (daily, weekly, monthly, yearly, or null for unlimited)
 * @returns The created or updated constraint
 * @throws NotFoundException if either the main user or sub-user is not found
 * @throws UnauthorizedException if the main user is not authorized to add constraints to the sub-user or if the sub-user has a pending upgrade request
 */
export async function addConstraint(
  userRepository: Repository<User>,
  constraintRepository: Repository<Constraint>,
  mainUserId: string,
  subUserId: string,
  constraintValue: number,
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' | null = null,
): Promise<Constraint> {
  const logger = new Logger('AddConstraint');
  logger.debug(
    `Adding spending limit constraint for sub-user ${subUserId} by main user ${mainUserId}`,
  );

  // Find the main user
  const mainUser = await findUserById(userRepository, mainUserId);
  if (!mainUser) {
    logger.error(`Main user with ID ${mainUserId} not found`);
    throw new NotFoundException(`Main user with ID ${mainUserId} not found`);
  }

  // Check if the main user is actually a main user
  if (!mainUser.isMainUser) {
    logger.error(`User with ID ${mainUserId} is not a main user`);
    throw new UnauthorizedException(
      `User with ID ${mainUserId} is not authorized to add constraints`,
    );
  }

  // Find the sub-user
  const subUser = await findUserById(userRepository, subUserId);
  if (!subUser) {
    logger.error(`Sub-user with ID ${subUserId} not found`);
    throw new NotFoundException(`Sub-user with ID ${subUserId} not found`);
  }

  // Check if the sub-user belongs to the main user
  if (subUser.parentUser?.userId !== mainUserId) {
    logger.error(
      `Sub-user with ID ${subUserId} does not belong to main user ${mainUserId}`,
    );
    throw new UnauthorizedException(
      `Not authorized to add constraints to this sub-user`,
    );
  }

  // Check if the sub-user has a pending upgrade request
  if (subUser.upgradeRequestStatus === 'pending') {
    logger.error(
      `Sub-user with ID ${subUserId} has a pending upgrade request and constraints cannot be modified`,
    );
    throw new UnauthorizedException(
      `Cannot modify constraints for a sub-user with a pending upgrade request`,
    );
  }

  // Check for existing constraint to update
  const existingConstraint = await constraintRepository.findOne({
    where: {
      user: { id: subUser.id },
      type: 'spending_limit',
    },
  });

  let constraint;
  if (existingConstraint) {
    // Update existing constraint
    existingConstraint.value = constraintValue;
    existingConstraint.status = 'active';
    // If timePeriod is provided, update it; otherwise, retain existing value
    if (timePeriod !== undefined) {
      existingConstraint.timePeriod = timePeriod;
    }
    constraint = existingConstraint;
  } else {
    // Create new constraint
    constraint = new Constraint();
    constraint.user = subUser;
    constraint.type = 'spending_limit';
    constraint.value = constraintValue;
    constraint.status = 'active';
    constraint.timePeriod = timePeriod;
  }

  // Save the constraint
  try {
    const savedConstraint = await constraintRepository.save(constraint);
    logger.log(
      `Spending limit constraint ${existingConstraint ? 'updated' : 'added'} successfully for sub-user ${subUserId} by main user ${mainUserId}`,
    );
    return savedConstraint;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const action = existingConstraint ? 'update' : 'create';
    logger.error(`Failed to ${action} constraint: ${errorMessage}`);
    throw new Error(
      `Failed to ${action} spending limit constraint: ${errorMessage}`,
    );
  }
}
