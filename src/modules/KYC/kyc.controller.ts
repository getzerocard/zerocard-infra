import { Body, Logger, Post, Query, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { PrivyAuthGuard } from '../../common/guards';
import { PrivyUser } from '../auth/decorators/privy-user.decorator';
import { PrivyUserData } from '../auth/interfaces/privy-user.interface';
import {
  InitiateVerificationDto,
  ValidateOtpDto,
  VerificationInitiateResponseDto,
  OtpValidationResponseDto,
  InitiateVerificationSuccessResponse,
  InitiateVerificationErrorResponses,
  ValidateOtpSuccessResponse,
  ValidateOtpErrorResponses,
} from './dto/kyc.dto';
import { ValidationPipe } from '../../common/pipes';
import { ApiController } from '../../common/decorators/api-controller.decorator';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Response } from '../../common/interceptors/response.interceptor';

/**
 * Controller for KYC verification management
 */
@ApiController('kyc', 'KYC Verification')
@ApiExtraModels(
  Response,
  VerificationInitiateResponseDto,
  OtpValidationResponseDto,
)
export class KycController {
  private readonly logger = new Logger(KycController.name);

  constructor(
    private readonly kycService: KycService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Initiate identity verification for the authenticated user
   * @param initiateDto The data for initiating verification
   * @param userData The authenticated user's data
   * @returns Object containing the verification ID and number
   */
  @Post('initiate-verification')
  @ApiOperation({
    summary: 'Initiate identity verification',
    description: 'Initiate identity verification for the authenticated user',
  })
  @ApiBody({ type: InitiateVerificationDto })
  @ApiStandardResponse(
    VerificationInitiateResponseDto,
    'Verification initiated successfully',
  )
  @ApiResponse(InitiateVerificationErrorResponses.R400)
  @ApiResponse(InitiateVerificationErrorResponses.R401)
  @ApiResponse(InitiateVerificationErrorResponses.R404)
  @ApiResponse(InitiateVerificationErrorResponses.R500)
  @ApiQuery({
    name: 'userId',
    type: String,
    description: 'User ID initiating the verification or "me" for authenticated user',
    example: 'did:privy:user12345',
    required: false,
  })
  @HttpCode(HttpStatus.OK)
  async initiateVerification(
    @Body(new ValidationPipe()) initiateDto: InitiateVerificationDto,
    @PrivyUser() userData: PrivyUserData,
    @Query('userId') userIdParam?: string,
  ): Promise<VerificationInitiateResponseDto> {
    const targetUserId = userIdParam && userIdParam.toLowerCase() !== 'me' ? userIdParam : userData.userId;

    if (targetUserId !== userData.userId) {
      this.logger.warn(
        `Unauthorized KYC initiation attempt by ${userData.userId} for ${targetUserId}`,
      );
      throw new UnauthorizedException(
        'You are not authorized to initiate KYC for another user.',
      );
    }

    this.logger.log(`Initiating KYC verification for user ${targetUserId}`);

    return this.kycService.initiateIdentityVerification(
      initiateDto.identityType,
      initiateDto.number,
      targetUserId,
    );
  }

  /**
   * Validate OTP for identity verification
   * @param validateOtpDto The data containing identityId and OTP
   * @param userData The authenticated user's data
   * @returns The result of the OTP validation
   */
  @Post('validate-otp')
  @ApiOperation({
    summary: 'Validate identity verification OTP',
    description:
      'Validate the OTP provided after initiating verification. Make sure address is updated before proceeding with this step.',
  })
  @ApiBody({ type: ValidateOtpDto })
  @ApiStandardResponse(OtpValidationResponseDto, 'OTP validated successfully')
  @ApiResponse(ValidateOtpErrorResponses.R400)
  @ApiResponse(ValidateOtpErrorResponses.R401)
  @ApiResponse(ValidateOtpErrorResponses.R404)
  @ApiResponse(ValidateOtpErrorResponses.R500)
  @ApiQuery({
    name: 'userId',
    type: String,
    description: 'User ID validating the OTP or "me" for authenticated user',
    example: 'did:privy:user12345',
    required: false,
  })
  @HttpCode(HttpStatus.OK)
  async validateOtp(
    @Body(new ValidationPipe()) validateOtpDto: ValidateOtpDto,
    @PrivyUser() userData: PrivyUserData,
    @Query('userId') userIdParam?: string,
  ): Promise<OtpValidationResponseDto> {
    const targetUserId = userIdParam && userIdParam.toLowerCase() !== 'me' ? userIdParam : userData.userId;

    if (targetUserId !== userData.userId) {
      this.logger.warn(
        `Unauthorized OTP validation attempt by ${userData.userId} for ${targetUserId}`,
      );
      throw new UnauthorizedException(
        'You are not authorized to validate OTP for another user.',
      );
    }

    this.logger.log(
      `Validating OTP for identity verification ID: ${validateOtpDto.verification_id} for user ${targetUserId}`,
    );

    return this.kycService.validateOtp(
      validateOtpDto.identityType,
      validateOtpDto.verification_id,
      validateOtpDto.otp,
      targetUserId,
      validateOtpDto.identity_number,
    );
  }
}
