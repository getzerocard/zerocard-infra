import type { Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import type { User } from '../../user/entity/user.entity';
import type { ExtractedKycData } from './extractKycData.handler';
import { saveKycData } from './saveKycData.handler';
import { prepareNewCustomerWithKyc } from './prepareNewCustomerAndCreateWithKyc.handler';

/**
 * Handles actions to be taken when KYC verification is successful.
 * @param userRepository The repository to interact with user data.
 * @param userId The ID of the user.
 * @param extractedData The extracted KYC data from the verification response.
 * @param identityNumber The identity number used for verification.
 * @param zerocardBaseUrl The base URL for the ZeroCard API.
 * @param accessToken The authentication token for ZeroCard API.
 * @param logger The logger instance for logging actions.
 * @returns Promise resolving when all actions are complete.
 * @throws HttpException if any step fails.
 */
export async function handleSuccessfulVerification(
  userRepository: Repository<User>,
  userId: string,
  extractedData: ExtractedKycData,
  identityNumber: string,
  zerocardBaseUrl: string,
  accessToken: string,
  logger: Logger,
): Promise<void> {
  if (extractedData.status !== 'SUCCESS' || !extractedData.otpVerified) {
    logger.log(
      `KYC verification not successful or OTP not verified for user ${userId}`,
    );
    return;
  }

  try {
    // Step 1: Save KYC data to database
    logger.log(`Step 1: Saving KYC data for user ${userId} to database`);
    const saveResult = await saveKycData(
      userRepository,
      userId,
      extractedData,
      logger,
    );
    if (!saveResult.success) {
      logger.warn(
        `Step 1: Partial or failed KYC data save for user ${userId}: ${saveResult.message}`,
      );
      throw new HttpException(
        `Failed to save KYC data for user ${userId}: ${saveResult.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    logger.log(`Step 1: KYC data saved successfully for user ${userId}`);

    // Step 2: Check if user already has a customerId
    const user = await userRepository.findOne({ where: { userId: userId } });
    if (!user) {
      throw new HttpException(
        `User ${userId} not found in database`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (user.customerId) {
      logger.warn(
        `Step 2: User ${userId} already has a customerId (${user.customerId}), skipping customer creation`,
      );
      return;
    }
    logger.log(
      `Step 2: No existing customerId for user ${userId}, proceeding with customer creation`,
    );

    // Step 3: Create customer with ZeroCard API
    logger.log(
      `Step 3: Creating customer for user ${userId} with ZeroCard API`,
    );
    const customerResponse = await prepareNewCustomerWithKyc(
      userRepository,
      userId,
      extractedData.type,
      identityNumber,
      zerocardBaseUrl,
      accessToken,
    );
    logger.log(
      `Step 3: Customer created successfully for user ${userId}: [Sanitized Response] ID: ${customerResponse.data._id || 'N/A'}`,
    );

    // Step 4: Extract customer ID and update user entity
    const customerId = customerResponse.data._id;
    if (!customerId) {
      throw new HttpException(
        `Customer ID not found in response for user ${userId}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    logger.log(
      `Step 4: Saving customer ID ${customerId} to customerId for user ${userId}`,
    );
    try {
      await userRepository.update({ userId: userId }, { customerId: customerId });
      logger.log(`Step 4: Customer ID saved successfully for user ${userId}`);
    } catch (dbError) {
      if (dbError instanceof QueryFailedError) {
        logger.error(
          `Step 4: Database error saving customerId for user ${userId}: ${dbError.message}`,
        );
        throw new HttpException(
          `Database error saving customerId for user ${userId}: ${dbError.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        `Failed to save customerId for user ${userId}: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  } catch (error) {
    logger.error(
      `Error in handleSuccessfulVerification for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(
      `Failed to handle successful verification for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
