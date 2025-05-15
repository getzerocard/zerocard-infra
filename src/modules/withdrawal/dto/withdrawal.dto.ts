import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { getSchemaPath } from '@nestjs/swagger';
import { Response } from '../../../common/interceptors/response.interceptor';

/**
 * DTO for withdrawal query parameters
 */
export class WithdrawalQueryDto {
  @ApiProperty({
    description: 'Symbol of the token to withdraw',
    example: 'USDC',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  tokenSymbol: string;

  @ApiProperty({
    description: 'Amount of tokens to withdraw',
    example: '100.50',
    required: true,
  })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Address to receive the withdrawn tokens',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  recipientAddress: string;

  @ApiProperty({
    description: 'Blockchain type',
    enum: ['ethereum', 'solana'],
    example: 'ethereum',
    required: true,
  })
  @IsEnum(['ethereum', 'solana'])
  @IsNotEmpty()
  chainType: 'ethereum' | 'solana';

  @ApiProperty({
    description: 'Specific blockchain network (optional). Pass an empty string if not applicable or for default.',
    example: 'Base Sepolia',
    required: false, // Optional in the API call
  })
  @IsString() // Validate as string, can be empty
  @IsOptional() // Mark as optional for validation if not provided
  blockchainNetwork?: string; // Type allows undefined if not provided
}

/**
 * Core data DTO for a successful withdrawal response
 */
export class WithdrawalResponseDataDto {
  @ApiProperty({
    description: 'Transaction hash of the withdrawal',
    example:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'User ID who made the withdrawal',
    example: 'did:privy:123456',
  })
  userId: string;

  @ApiProperty({
    description: 'Message confirming the withdrawal',
    example: 'Withdrawal processed successfully for user did:privy:123456',
  })
  message: string;

  @ApiProperty({
    description: 'Amount withdrawn',
    example: '100.50',
  })
  amount: string;

  @ApiProperty({
    description: 'Symbol of the token withdrawn',
    example: 'USDC',
  })
  tokenSymbol: string;

  @ApiProperty({
    description: 'Recipient address of the withdrawal',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  to: string;

  @ApiProperty({
    description: 'Sender address of the withdrawal',
    example: '0xabcdef1234567890abcdef1234567890abcdef123456',
  })
  from: string;

  @ApiProperty({
    description: 'Blockchain type',
    enum: ['ethereum', 'solana'],
    example: 'ethereum',
  })
  chainType: 'ethereum' | 'solana';

  @ApiProperty({
    description: 'Specific blockchain network applied',
    example: 'Base Sepolia',
    required: false,
  })
  blockchainNetwork: string | undefined;
}

/**
 * Response DTO for token balance retrieval
 */
export class TokenBalanceResponseDto {
  @ApiProperty({
    description: 'Balances for specified tokens across blockchain networks',
    example: {
      'USDC': {
        'Base': '109987.688765',
        'Arbitrum': 'Unsupported combination',
        'Polygon': 'Unsupported combination',
        'BNB Smart Chain': '42273.0059004389'
      },
      'USDT': {
        'Base': 'Unsupported combination',
        'Arbitrum': 'Unsupported combination',
        'Polygon': 'Unsupported combination',
        'BNB Smart Chain': '496377.397493132805701098'
      }
    },
  })
  balances: Record<string, Record<string, string>>;
}

/**
 * Error responses for process withdrawal endpoint
 */
export class ProcessWithdrawalErrorResponses {
  static readonly R400_INVALID = {
    status: 400,
    description: 'Invalid input provided for withdrawal',
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          success: false,
          message: 'Invalid input: [validation error details]', // Generic message
        },
      },
    },
  };

  static readonly R400_INSUFFICIENT_BALANCE = {
    status: 400,
    description: 'Insufficient balance for the withdrawal',
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          success: false,
          message:
            'Insufficient balance for withdrawal. Available: X SYMBOL, Requested: Y SYMBOL',
        },
      },
    },
  };

  static readonly R400_WALLET_NOT_FOUND = {
    status: 400,
    description: 'Wallet address not found for the user',
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          success: false,
          message: 'Wallet address not found for user [userId]',
        },
      },
    },
  };

  static readonly R400_CONFIG_ERROR = {
    status: 400,
    description: 'Server configuration error preventing withdrawal',
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          success: false,
          message: 'Network type is not properly configured', // Or similar config issue
        },
      },
    },
  };

  static readonly R401_UNAUTHORIZED = {
    status: 401, // Changed from 403 based on service code throwing UnauthorizedException
    description: 'User is not authorized to perform this withdrawal (e.g., sub-user)',
    content: {
      'application/json': {
        example: {
          statusCode: 401,
          success: false,
          message: 'Sub-users are not allowed to make withdrawals', // Or general 'Unauthorized'
        },
      },
    },
  };

  static readonly R404_USER_NOT_FOUND = {
    status: 404, // Assuming service might throw 404 if user fetch fails, though currently it's 400
    description: 'User associated with the token not found',
    content: {
      'application/json': {
        example: {
          statusCode: 404,
          success: false,
          message: 'User with ID [userId] not found',
        },
      },
    },
  };


  static readonly R500 = {
    status: 500,
    description: 'Internal server error during withdrawal process',
    content: {
      'application/json': {
        example: {
          statusCode: 500,
          success: false,
          message: 'Internal server error',
        },
      },
    },
  };
}

/**
 * Error responses for get balance endpoint
 */
export class GetBalanceErrorResponses {
  static readonly responses = [
    {
      status: 400,
      description: 'Invalid input or configuration error',
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
        invalidInput: {
          summary: 'Invalid Input',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid token symbols or blockchain type',
          },
        },
        configError: {
          summary: 'Configuration Error',
          value: {
            statusCode: 400,
            success: false,
            message: 'Network type is not properly configured',
          },
        },
      },
    },
    {
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
    },
    {
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
            message: 'Failed to fetch token balances: Internal server error',
          },
        },
      },
    },
  ];
}
