import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Response } from '../../../common/interceptors/response.interceptor';

// These enums are defined for documentation/reference but exported to avoid unused vars lint errors
export enum _OrderStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum _OrderCardErrorType {
  NETWORK_CONFIG_ERROR = 'network_config_error',
  FEE_CONFIG_ERROR = 'fee_config_error',
  CONCURRENT_ORDER = 'concurrent_order',
  WALLET_NOT_FOUND = 'wallet_not_found',
  BALANCE_CHECK_FAILED = 'balance_check_failed',
  UNSUPPORTED_TOKEN = 'unsupported_token',
  BALANCE_FETCH_ERROR = 'balance_fetch_error',
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  USER_NOT_FOUND = 'user_not_found',
  MAIN_USER_NOT_FOUND = 'main_user_not_found',
  NO_LOCKED_FUNDS = 'no_locked_funds',
  BALANCE_CHANGED = 'balance_changed',
  FEE_CHANGED = 'fee_changed',
  FUNDS_LOCK_CHANGED = 'funds_lock_changed',
  RECIPIENT_NOT_CONFIGURED = 'recipient_not_configured',
  DEBIT_FAILED = 'debit_failed',
  TRANSACTION_HASH_EMPTY = 'transaction_hash_empty',
  INTERNAL_SERVER_ERROR = 'internal_server_error',
}

/**
 * Input DTO for ordering a card
 */
export class OrderCardInputDto {
  @ApiProperty({
    description: 'User ID ordering the card',
    example: 'did:privy:user12345',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Token symbol for payment',
    example: 'USDC',
  })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({
    description: 'Blockchain type',
    enum: ['ethereum', 'solana'],
    example: 'ethereum',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['ethereum', 'solana'])
  chainType: 'ethereum' | 'solana';

  @ApiProperty({
    description: 'Specific blockchain network',
    example: 'mainnet',
  })
  @IsString()
  @IsNotEmpty()
  blockchainNetwork: string;
}

/**
 * Response DTO for the data field of a successful card order.
 */
export class OrderCardResponseDto {
  @ApiProperty({
    description: 'Status of the card order process',
    example: 'success',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Detailed message about the order process outcome',
    example: 'Card ordered successfully for user did:privy:user12345',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'User ID associated with the card order',
    example: 'did:privy:user12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Transaction hash of the debit operation',
    example: '0x123abc456def7890fedcba0987654321fedcba0987654321abcdef1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  transactionHash?: string;

  @ApiProperty({
    description: 'Current status of the card order in the system',
    example: 'ordered', // e.g., not_ordered, ordered, shipped, active
    required: false,
  })
  @IsString()
  @IsOptional()
  cardOrderStatus?: string;
}

// Success Response Definition for Swagger
export class OrderCardSuccess {
  static readonly R201 = { // Typically 201 for resource creation, or 200 if just an operation
    status: 200, // Changed to 200 to match controller @HttpCode(HttpStatus.OK)
    description: 'Card ordered successfully and debit processed.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            data: { $ref: getSchemaPath(OrderCardResponseDto) },
          },
        },
      ],
    },
    examples: {
      success: {
        summary: 'Successful Card Order',
        value: {
          statusCode: 200,
          success: true,
          data: {
            status: 'success',
            message: 'Card ordered successfully for user did:privy:user12345',
            userId: 'did:privy:user12345',
            transactionHash:
              '0x123abc456def7890fedcba0987654321fedcba0987654321abcdef1234567890',
            cardOrderStatus: 'ordered',
          },
        },
      },
    },
  };
}

// Error Responses Definition for Swagger
export class OrderCardErrors {
  static readonly R400 = {
    status: 400,
    description:
      'Bad Request - Invalid input, unsupported token/network, insufficient balance, user status issues, or concurrent order in progress.',
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
      invalidInput: {
        summary: 'Invalid Input Parameter',
        value: {
          statusCode: 400,
          success: false,
          message: 'Network type is not properly configured',
        },
      },
      unsupportedToken: {
        summary: 'Unsupported Token/Network',
        value: {
          statusCode: 400,
          success: false,
          message:
            'Unsupported token ETH for ethereum on testnet. Please select a supported token and network combination.',
        },
      },
      insufficientBalance: {
        summary: 'Insufficient Balance',
        value: {
          statusCode: 400,
          success: false,
          message:
            'Insufficient balance for USDC on mainnet. Required: 10, Available: 5. Please ensure you have enough funds to cover the card order fee.',
        },
      },
      concurrentOrder: {
        summary: 'Concurrent Order Attempt',
        value: {
          statusCode: 400,
          success: false,
          message:
            'Another card order is already in progress for this user. Please try again later.',
        },
      },
    },
  };

  static readonly R404 = {
    status: 404,
    description: 'Not Found - User or related data (e.g., main user for sub-user) not found.',
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
          message: 'User with ID did:privy:userNonExistent not found',
        },
      },
    },
  };

  static readonly R500 = {
    status: 500,
    description: 'Internal Server Error - Unexpected issues during card order processing.',
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
          message: 'An unexpected internal error occurred. Please try again later.',
        },
      },
    },
  };
}
