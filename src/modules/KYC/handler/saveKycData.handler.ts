import type { Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../../user/entity/user.entity';
import type { ExtractedKycData } from './extractKycData.handler';
import { convertToDatabaseDateFormat } from '../../../common/util/dateFormat.util';

/**
 * Saves KYC data to the database for a given user
 * @param userRepository The repository to interact with user data
 * @param userId The ID of the user to save KYC data for
 * @param kycData The extracted KYC data to save
 * @param logger The logger instance for logging actions
 * @returns Promise resolving to an object indicating the save status
 * @throws HttpException if the save operation fails critically
 */
export async function saveKycData(
  userRepository: Repository<User>,
  userId: string,
  kycData: ExtractedKycData,
  logger: Logger,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await userRepository.findOne({ where: { userId: userId } });
    if (!user) {
      const errorMsg = `User ${userId} not found in database for KYC data save`;
      logger.error(errorMsg);
      throw new HttpException(errorMsg, HttpStatus.NOT_FOUND);
    }

    // Update user entity with KYC data
    user.firstName = kycData.firstName;
    user.lastName = kycData.lastName;
    user.dateOfBirth = new Date(convertToDatabaseDateFormat(kycData.dob));
    user.phoneNumber = kycData.phone;
    user.base64Photo = kycData.photo;
    user.identityType = kycData.type;
    user.isIdentityVerified =
      kycData.status === 'SUCCESS' && kycData.otpVerified;

    // Save updated user data
    const saveResult = await userRepository.save(user);
    if (!saveResult) {
      const warnMsg = `Failed to save KYC data for user ${userId}, save operation returned null`;
      logger.warn(warnMsg);
      return { success: false, message: warnMsg };
    }

    logger.log(`Successfully saved KYC data for user ${userId}`);
    return { success: true, message: 'KYC data saved successfully' };
  } catch (error) {
    const errorMsg = `Error saving KYC data for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.error(errorMsg);
    if (error instanceof HttpException) {
      throw error;
    }
    return { success: false, message: errorMsg };
  }
}
