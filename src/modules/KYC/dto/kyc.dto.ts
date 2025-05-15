import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { Response } from '../../../common/interceptors/response.interceptor';

/**
 * DTO for initiating identity verification
 */
export class InitiateVerificationDto {
  @ApiProperty({
    description: 'Type of identity document to verify',
    enum: ['BVN', 'NIN'],
    example: 'BVN',
  })
  @IsEnum(['BVN', 'NIN'])
  identityType: 'BVN' | 'NIN';

  @ApiProperty({
    description: 'Identity number to verify',
    example: '8483484384378',
  })
  @IsString()
  @Length(10, 20)
  number: string;
}

/**
 * DTO for validating OTP
 */
export class ValidateOtpDto {
  @ApiProperty({
    description: 'Type of identity document (BVN or NIN)',
    enum: ['BVN', 'NIN'],
    example: 'BVN',
  })
  @IsEnum(['BVN', 'NIN'])
  identityType: 'BVN' | 'NIN';

  @ApiProperty({
    description: 'ID of the verification transaction',
    example: '68156bd50f376122b945d094',
  })
  @IsString()
  @IsNotEmpty()
  verification_id: string;

  @ApiProperty({
    description: 'OTP submitted by the user',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({
    description: 'Identity number used for verification',
    example: '8483484384378',
  })
  @IsString()
  @IsNotEmpty()
  identity_number: string;
}

/**
 * Response DTO for verification initiation
 */
export class VerificationInitiateResponseDto {
  @ApiProperty({
    description: 'Verification transaction ID',
    example: '68156bd50f376122b945d094',
  })
  verificationId: string;

  @ApiProperty({
    description: 'Verification number used',
    example: '8483484384378',
  })
  verificationNumber: string;
}

/**
 * Response DTO for OTP validation
 */
export class OtpValidationResponseDto {
  @ApiProperty({
    description: 'Status of the verification',
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    example: 'SUCCESS',
  })
  status: 'SUCCESS' | 'FAILED' | 'PENDING';

  @ApiProperty({
    description: 'Whether the identity is verified',
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: 'ID of the user',
    example: 'did:privy:abcdef123456',
  })
  userId: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Date of birth in YYYY/MM/DD format',
    example: '1990/01/01',
  })
  dob: string;

  @ApiProperty({
    description: 'Identity information',
    example: {
      type: 'BVN',
      number: '8483484384378',
    },
  })
  identity: {
    type: 'BVN' | 'NIN';
    number: string;
  };
}

/**
 * Success response for initiate verification endpoint
 */
export class InitiateVerificationSuccessResponse {
  static readonly R200 = {
    status: 200,
    description: 'Verification initiated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            data: { $ref: getSchemaPath(VerificationInitiateResponseDto) },
          },
        },
      ],
    },
    examples: {
      success: {
        summary: 'Verification Initiated',
        value: {
          statusCode: 200,
          success: true,
          data: {
            verificationId: '68156bd50f376122b945d094',
            verificationNumber: '8483484384378',
          },
        },
      },
    },
  };
}

/**
 * Success response for validate OTP endpoint
 */
export class ValidateOtpSuccessResponse {
  static readonly R200 = {
    status: 200,
    description: 'OTP validated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            data: { $ref: getSchemaPath(OtpValidationResponseDto) },
          },
        },
      ],
    },
    examples: {
      success: {
        summary: 'OTP Validated',
        value: {
          statusCode: 200,
          success: true,
          data: {
            status: 'SUCCESS',
            verified: true,
            userId: 'did:privy:abcdef123456',
            firstName: 'John',
            lastName: 'Doe',
            dob: '1990/01/01',
            identity: {
              type: 'BVN',
              number: '8483484384378',
            },
          },
        },
      },
    },
  };
}

/**
 * Error responses for initiate verification endpoint
 */
export class InitiateVerificationErrorResponses {
  static readonly R400 = {
    status: 400,
    description: 'Invalid data provided or user data incomplete',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      invalidData: {
        summary: 'Invalid Data',
        value: {
          statusCode: 400,
          success: false,
          message: 'Invalid identity type. Only BVN or NIN are supported.',
        },
      },
      incompleteUserData: {
        summary: 'Incomplete User Data',
        value: {
          statusCode: 400,
          success: false,
          message:
            'User does not have a complete shipping address. Please update your address before proceeding with verification.',
        },
      },
    },
  };

  static readonly R401 = {
    status: 401,
    description: 'Unauthorized',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      ],
    },
    examples: {
      unauthorized: {
        summary: 'Unauthorized',
        value: {
          statusCode: 401,
          success: false,
          message: 'Unauthorized',
        },
      },
    },
  };

  static readonly R404 = {
    status: 404,
    description: 'User not found',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      notFound: {
        summary: 'User Not Found',
        value: {
          statusCode: 404,
          success: false,
          message: 'User with ID did:privy:abcdef123456 not found',
        },
      },
    },
  };

  static readonly R500 = {
    status: 500,
    description: 'Internal server error',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      serverError: {
        summary: 'Server Error',
        value: {
          statusCode: 500,
          success: false,
          message:
            'Failed to initiate identity verification: Internal server error',
        },
      },
    },
  };
}

/**
 * Error responses for validate OTP endpoint
 */
export class ValidateOtpErrorResponses {
  static readonly R400 = {
    status: 400,
    description: 'Invalid OTP or input data, record not found, or OTP expired',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      invalidOtp: {
        summary: 'Invalid OTP',
        value: {
          statusCode: 400,
          success: false,
          message: 'Invalid OTP provided',
        },
      },
      invalidData: {
        summary: 'Invalid Data',
        value: {
          statusCode: 400,
          success: false,
          message: 'Invalid input provided for OTP validation',
        },
      },
      recordNotFound: {
        summary: 'Record Not Found',
        value: {
          statusCode: 400,
          success: false,
          message: 'Record not found',
        },
      },
      otpExpired: {
        summary: 'OTP Expired',
        value: {
          statusCode: 400,
          success: false,
          message: 'OTP has exipred.',
        },
      },
    },
  };

  static readonly R401 = {
    status: 401,
    description: 'Unauthorized',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      ],
    },
    examples: {
      unauthorized: {
        summary: 'Unauthorized',
        value: {
          statusCode: 401,
          success: false,
          message: 'Unauthorized',
        },
      },
    },
  };

  static readonly R404 = {
    status: 404,
    description: 'User not found',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      notFound: {
        summary: 'User Not Found',
        value: {
          statusCode: 404,
          success: false,
          message: 'User with ID did:privy:abcdef123456 not found',
        },
      },
    },
  };

  static readonly R500 = {
    status: 500,
    description: 'Internal server error',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      serverError: {
        summary: 'Server Error',
        value: {
          statusCode: 500,
          success: false,
          message: 'Failed to validate OTP: Internal server error',
        },
      },
    },
  };
}
