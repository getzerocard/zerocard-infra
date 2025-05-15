import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ZeroKycTokenParams } from './handler/zeroKycToken.handler';
import { getZeroKycToken } from './handler/zeroKycToken.handler';
import { initiateVerification } from './handler/initiateVerification.handler';
import { validateIdentityOtp } from './handler/validateIdentityOtp.handler';
import { extractKycData } from './handler/extractKycData.handler';
import { Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { handleSuccessfulVerification } from './handler/handleSuccessfulVerification.handler';
import { convertToDatabaseDateFormat } from '../../common/util/dateFormat.util';
import {
  VerificationInitiateResponseDto,
  OtpValidationResponseDto,
} from './dto/kyc.dto';

// Define an interface for the expected response structure
interface ZeroKYCResponseData {
  _id: string;
  // Include other fields if needed, but _id is essential here
}

interface ZeroKYCInitiationResponse {
  statusCode: number;
  data: ZeroKYCResponseData;
  message: string;
}
// TODO: handle [Nest] 87540  - 05/15/2025, 1:21:29 PM   DEBUG [KycService] Raw response from initiateVerification handler for user did:privy:cm94fwojw01yri50l74zvnkr5: {
//   "statusCode": 500,
//   "message": "Unable to complete request" so return error message please try again later

@Injectable()
export class KycService {
  private readonly zeroKycBaseUrl: string;
  private readonly zeroKycClientId: string;
  private readonly zeroKycClientAssertion: string;
  private readonly debitAccountNumber: string;
  private readonly logger: Logger;

  // Add properties for the Card service API URL and Key
  private readonly cardServiceApiUrl: string;
  private readonly cardServiceApiKey: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.zeroKycBaseUrl = this.configService.get<string>('zerocard.apiUrl');
    this.zeroKycClientId = this.configService.get<string>('zerocard.clientId');
    this.zeroKycClientAssertion = this.configService.get<string>(
      'zerocard.clientAssertion',
    );
    this.debitAccountNumber = this.configService.get<string>(
      'zerocard.debitAccountNumber',
    );

    // Fetch Card service URL and Key from config
    this.cardServiceApiUrl = this.configService.get<string>('card.ZEROCARD_API_URL');
    this.cardServiceApiKey = this.configService.get<string>('card.ZEROCARD_API_KEY');

    this.logger = new Logger(KycService.name);
  }

  /**
   * Retrieves an access token for ZeroKYC API interactions.
   * @returns Promise resolving to the access token string.
   * @throws HttpException if token retrieval fails.
   */
  async getAccessToken(): Promise<string> {
    const params: ZeroKycTokenParams = {
      baseUrl: this.zeroKycBaseUrl,
      clientId: this.zeroKycClientId,
      clientAssertion: this.zeroKycClientAssertion,
    };

    try {
      const token = await getZeroKycToken(params);
      return token;
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve ZeroKYC access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Initiates identity verification using ZeroKYC API.
   * @param identityType The type of identity document to verify (BVN or NIN).
   * @param number Identity number to verify.
   * @param userId The ID of the user initiating verification.
   * @returns Promise resolving to an object containing the verification ID and the number used.
   * @throws HttpException if verification initiation fails or response is invalid.
   */
  async initiateIdentityVerification(
    identityType: 'BVN' | 'NIN',
    number: string,
    userId: string,
  ): Promise<VerificationInitiateResponseDto> {
    try {
      // Priority 1: Quick input validation (immediate error throwing)
      if (!userId || !number) {
        this.logger.error(
          `Invalid input: userId or identity number is missing`,
        );
        throw new HttpException(
          'Invalid user ID or identity number provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Priority 2: Validate identity type
      if (identityType !== 'BVN' && identityType !== 'NIN') {
        this.logger.error(`Invalid identity type: ${identityType}`);
        throw new HttpException(
          'Invalid identity type. Only BVN or NIN are supported.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Priority 3: Check user existence and data completeness concurrently with Promise.all
      const user = await this.userRepository.findOne({ where: { userId: userId } });
      if (!user) {
        this.logger.error(`User with ID ${userId} not found`);
        throw new HttpException(
          `User with ID ${userId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Use Promise.all to check user data completeness concurrently
      const _checks = await Promise.all([
        new Promise<void>((resolve, _reject) => {
          if (
            !user.shippingAddress ||
            !user.shippingAddress.street ||
            !user.shippingAddress.city ||
            !user.shippingAddress.state ||
            !user.shippingAddress.country ||
            !user.shippingAddress.postalCode
          ) {
            this.logger.error(
              `User with ID ${userId} does not have a complete shipping address`,
            );
            _reject(
              new HttpException(
                `User with ID ${userId} does not have a complete shipping address. Please update your address before proceeding with verification.`,
                HttpStatus.BAD_REQUEST,
              ),
            );
          } else {
            resolve();
          }
        }),
        new Promise<void>((resolve, _reject) => {
          if (!user.email) {
            this.logger.error(`User with ID ${userId} does not have an email`);
            _reject(
              new HttpException(
                `User with ID ${userId} does not have an email. Please update your email before proceeding with verification.`,
                HttpStatus.BAD_REQUEST,
              ),
            );
          } else {
            resolve();
          }
        }),
      ]).catch((error) => {
        throw error; // Return the first failed check's error
      });

      // Priority 4: Check for existing verification to prevent concurrent requests
      // TODO: Implement a mechanism to track ongoing verifications (e.g., a field in user entity or a separate table)
      // For now, log the intent to check for concurrent requests
      this.logger.debug(
        `Checking for concurrent verification requests for user ${userId}`,
      );

      // Priority 5: Proceed with verification (resource-intensive)
      const accessToken = await this.getAccessToken();
      const response: ZeroKYCInitiationResponse = await initiateVerification(
        this.zeroKycBaseUrl,
        accessToken,
        identityType,
        number,
        this.debitAccountNumber,
        false,
      );

      // Log the raw response from the initiateVerification handler
      this.logger.debug(
        `Raw response from initiateVerification handler for user ${userId}: ${JSON.stringify(response, null, 2)}`,
      );

      if (!response || !response.data || !response.data._id) {
        this.logger.error(
          `Invalid response received from ZeroKYC API for user ${userId}`,
        );

        throw new HttpException(
          'Invalid response received from ZeroKYC API',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return {
        verificationId: response.data._id,
        verificationNumber: number,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to initiate identity verification for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to initiate identity verification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validates the OTP for a given identity verification transaction.
   * @param identityType The type of identity document to verify (BVN or NIN).
   * @param verification_id The ID of the verification transaction.
   * @param otp The OTP submitted by the user.
   * @param userId The ID of the user validating the OTP.
   * @param identity_number The identity number used for verification.
   * @returns Promise resolving to the extracted KYC data, user ID, and identity number.
   * @throws HttpException if validation fails.
   */
  async validateOtp(
    identityType: 'BVN' | 'NIN',
    verification_id: string,
    otp: string,
    userId: string,
    identity_number: string,
  ): Promise<OtpValidationResponseDto> {
    try {
      // Priority 1: Quick input validation (immediate error throwing)
      if (!userId || !verification_id || !otp || !identity_number) {
        this.logger.error(
          `Invalid input: userId, verification_id, otp, or identity_number is missing`,
        );
        throw new HttpException(
          'Invalid input provided for OTP validation',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Priority 2: Validate identity type
      if (identityType !== 'BVN' && identityType !== 'NIN') {
        this.logger.error(
          `Invalid identity type for OTP validation: ${identityType}`,
        );
        throw new HttpException(
          'Invalid identity type. Only BVN or NIN are supported.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Priority 3: Check user existence and data consistency
      const user = await this.userRepository.findOne({ where: { userId: userId } });
      if (!user) {
        this.logger.error(
          `User with ID ${userId} not found during OTP validation`,
        );
        throw new HttpException(
          `User with ID ${userId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Use Promise.all to check user data completeness concurrently
      const _checks = await Promise.all([
        new Promise<void>((resolve, _reject) => {
          if (
            !user.shippingAddress ||
            !user.shippingAddress.street ||
            !user.shippingAddress.city ||
            !user.shippingAddress.state ||
            !user.shippingAddress.country ||
            !user.shippingAddress.postalCode
          ) {
            this.logger.error(
              `User with ID ${userId} does not have a complete shipping address during OTP validation`,
            );
            _reject(
              new HttpException(
                `User with ID ${userId} does not have a complete shipping address. Please update your address before proceeding with verification.`,
                HttpStatus.BAD_REQUEST,
              ),
            );
          } else {
            resolve();
          }
        }),
      ]).catch((error) => {
        throw error; // Return the first failed check's error
      });

      // Priority 4: Check for concurrent OTP validation requests
      // TODO: Implement a mechanism to prevent concurrent OTP validations (e.g., locking mechanism)
      // For now, log the intent to check for concurrent requests
      this.logger.debug(
        `Checking for concurrent OTP validation requests for user ${userId}`,
      );

      // Priority 5: Proceed with OTP validation (resource-intensive)
      const accessToken = await this.getAccessToken();
      const response = await validateIdentityOtp(
        this.zeroKycBaseUrl,
        accessToken,
        identityType,
        verification_id,
        otp,
      );

      // If the response is a 400 with 'Record not found', throw and do not continue
      if (response && response.statusCode === 400 && response.message === 'Record not found') {
        this.logger.error(`OTP validation failed: Record not found for verification_id ${verification_id}`);
        throw new HttpException('Record not found', HttpStatus.BAD_REQUEST);
      }
      // If the response is a 400 with 'OTP has exipred.', throw and do not continue
      if (response && response.statusCode === 400 && response.message === 'OTP has exipred.') {
        this.logger.error(`OTP validation failed: OTP has exipred for verification_id ${verification_id}`);
        throw new HttpException('OTP has exipred.', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(
        `Raw response from validateIdentityOtp handler for verification_id ${verification_id}: ${JSON.stringify(response, null, 2)}`,
      );

      // Priority 6: Handle data extraction with detailed error logging for partial failures
      let extractedData;
      try {
        extractedData = extractKycData(response);
      } catch (extractionError) {
        this.logger.error(
          `Failed to extract KYC data for user ${userId}: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`,
        );
        throw new HttpException(
          `Failed to extract KYC data from response. Please contact support.`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Priority 7: Handle successful verification and user data update
      await handleSuccessfulVerification(
        this.userRepository,
        userId,
        extractedData,
        identity_number,
        this.cardServiceApiUrl,
        this.cardServiceApiKey,
        this.logger,
      );

      // Priority 8: Re-fetch user data to ensure consistency and handle potential deletion/modification
      const updatedUser = await this.userRepository.findOne({
        where: { userId: userId },
      });
      if (!updatedUser) {
        this.logger.error(
          `User ${userId} not found in database after verification`,
        );
        throw new HttpException(
          `User ${userId} not found in database after verification`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: extractedData.status,
        verified: updatedUser.isIdentityVerified,
        userId: userId,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        dob: updatedUser.dateOfBirth ? convertToDatabaseDateFormat(updatedUser.dateOfBirth.toString()) : '',
        identity: {
          type: identityType,
          number: identity_number,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to validate OTP for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        `Failed to validate OTP: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
//TOD
