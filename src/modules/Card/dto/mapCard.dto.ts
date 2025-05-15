import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Response } from '../../../common/interceptors/response.interceptor';

/**
 * Conceptual Input DTO for mapping a card (parameters are via @Query).
 * This helps in documenting the expected query parameters for Swagger.
 */
export class MapCardInputDto {
  @ApiProperty({
    description: 'User ID associated with the card',
    example: 'did:privy:user12345',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Status of the card mapping', example: 'active' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Expiration date of the card in MMM-YYYY format (e.g., AUG-2025)',
    example: 'AUG-2025',
  })
  @IsString()
  @IsNotEmpty()
  expirationDate: string;

  @ApiProperty({ description: 'Card number', example: '1234567890123456' })
  @IsString()
  @IsNotEmpty()
  number: string;
}

/**
 * Response DTO for the data field of a successful card mapping.
 * Note: The service currently returns { status: string, message: string, data: any }
 * This DTO will represent the 'data' part if it were structured, or be 'any' if truly variable.
 * For now, assuming the 'data' from service is the actual card details.
 */
export class MappedCardDataDto {
  @ApiProperty({ example: 'card_123abc456def' })
  _id: string;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ example: 'active' })
  status: string;
}

/**
 * Main Response DTO for the /map endpoint's successful response data wrapper.
 * The service currently returns an object with status, message, and data.
 * This will be the structure of the 'data' field in the ResponseInterceptor's output.
 */
export class MapCardResponseDto {
  @ApiProperty({ description: 'Status of the operation', example: 'success' })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Message about the operation',
    example: 'Card mapped successfully',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Data related to the mapped card',
    type: MappedCardDataDto,
  })
  data: MappedCardDataDto;
}

// Success Response Definition for Swagger
export class MapCardSuccess {
  static readonly R200 = {
    status: 200,
    description: 'Card mapped successfully to the user.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            data: { $ref: getSchemaPath(MapCardResponseDto) },
          },
        },
      ],
    },
    examples: {
      success: {
        summary: 'Successful Card Mapping',
        value: {
          statusCode: 200,
          success: true,
          data: {
            status: 'success',
            message: 'Card mapped successfully',
            data: {
              _id: 'card_8Jg7YhN2kXsLpQwR',
              currency: 'NGN',
              status: 'active',
            },
          },
        },
      },
    },
  };
}

// Error Responses Definition for Swagger
export class MapCardErrors {
  static readonly R400 = {
    status: 400,
    description: 'Bad Request - Invalid input parameters or validation issues.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      invalidUserId: {
        summary: 'Invalid User ID',
        value: {
          statusCode: 400,
          success: false,
          message: 'User ID is required for card mapping',
        },
      },
      missingCustomerId: {
        summary: 'Missing Customer Account ID',
        value: {
          statusCode: 400,
          success: false,
          message: 'Customer account ID not found. Please verify the user account details with support.',
        },
      },
    },
  };

  static readonly R403 = {
    status: 403,
    description: 'Forbidden - User does not have permission to map the card (e.g., main user mapping to sub-user account incorrectly).'
    ,
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      mappingViolation: {
        summary: 'Mapping Permission Violation',
        value: {
          statusCode: 403,
          success: false,
          message: 'Sub users can only map cards to sub user accounts. Please check the account mapping.',
        },
      },
    },
  };

  static readonly R404 = {
    status: 404,
    description: 'Not Found - User associated with the userId not found.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      userNotFound: {
        summary: 'User Not Found',
        value: {
          statusCode: 404,
          success: false,
          message: 'User not found. Please ensure the user ID is correct and try again.',
        },
      },
    },
  };

  static readonly R500 = {
    status: 500,
    description: 'Internal Server Error - Unexpected issues during card mapping process.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            message: { type: 'string' },
          },
        },
      ],
    },
    examples: {
      internalError: {
        summary: 'Internal Server Error',
        value: {
          statusCode: 500,
          success: false,
          message: 'An unexpected error occurred during card mapping. Please try again later or contact support.',
        },
      },
    },
  };
}
