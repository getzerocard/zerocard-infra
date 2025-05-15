import type { ApiResponseOptions } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
// Import User entity

/**
 * DTO for adding a sub-user
 */
export class AddSubUserDto {
  @ApiProperty({ description: 'Email of the sub-user' })
  @IsString()
  @IsNotEmpty()
  email: string;
}

// Static exported array for Add Sub-User error responses
export const AddSubUserErrorResponses: ApiResponseOptions[] = [
  {
    status: 400,
    description: 'Bad request due to invalid input or configuration issues',
    content: {
      'application/json': {
        examples: {
          invalidInput: {
            summary: 'Invalid Input',
            value: {
              statusCode: 400,
              success: false,
              message: 'Invalid data provided',
            },
          },
          unsupportedToken: {
            summary: 'Unsupported Token or Network',
            value: {
              statusCode: 400,
              success: false,
              message:
                'Unsupported token USDT for ethereum on sepolia (TESTNET). Please select a supported token and network combination.',
            },
          },
          insufficientBalance: {
            summary: 'Insufficient Balance',
            value: {
              statusCode: 400,
              success: false,
              message:
                'Insufficient balance to add a sub-user. Required: 10.00, Available: 5.00. Please top up your account.',
            },
          },
          balanceChanged: {
            summary: 'Balance Changed During Processing',
            value: {
              statusCode: 400,
              success: false,
              message:
                'Balance changed during processing. Required: 10.00, Available now: 5.00. Please ensure sufficient funds are available.',
            },
          },
          concurrentOperation: {
            summary: 'Concurrent Operation',
            value: {
              statusCode: 400,
              success: false,
              message:
                'Another sub-user creation or card order is already in progress for this main user. Please try again later.',
            },
          },
          mainUserStatusInvalid: {
            summary: 'Main User Status Invalid',
            value: {
              statusCode: 400,
              success: false,
              message: 'Unable to add sub-user: Main user status invalid.',
            },
          },
        },
      },
    },
  },
  {
    status: 409,
    description: 'Conflict due to existing sub-user',
    content: {
      'application/json': {
        examples: {
          conflict: {
            summary: 'Sub-user Already Exists',
            value: {
              statusCode: 409,
              success: false,
              message:
                'A sub-user with email subuser@example.com already exists under your account.',
            },
          },
        },
      },
    },
  },
  {
    status: 503,
    description: 'Service unavailable due to temporary issues',
    content: {
      'application/json': {
        examples: {
          balanceCheckFailed: {
            summary: 'Balance Check Failed',
            value: {
              statusCode: 503,
              success: false,
              message:
                'Failed to check balance for your account. Please try again later.',
            },
          },
          networkConfig: {
            summary: 'Network Configuration Issue',
            value: {
              statusCode: 503,
              success: false,
              message:
                'Network type is not properly configured. Please try again later.',
            },
          },
          feeConfigInvalid: {
            summary: 'Fee Configuration Invalid',
            value: {
              statusCode: 503,
              success: false,
              message:
                'Card order fee configuration changed and is now invalid. Please try again later.',
            },
          },
        },
      },
    },
  },
];
