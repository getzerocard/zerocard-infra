import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Response } from '../../../common/interceptors/response.interceptor';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for setting a spending limit input
 */
export class SetSpendingLimitInputDto {
  @ApiProperty({ description: 'USD amount for the spending limit' })
  @IsNumber()
  @Min(0.5)
  @Type(() => Number) // Ensures transformation from string to number for query params
  usdAmount: number;

  @ApiProperty({ description: 'Chain type' })
  @IsString()
  @IsEnum(['ethereum', 'solana'], { message: 'chainType must be either "ethereum" or "solana"' })
  chainType: string;

  @ApiProperty({ description: 'Token symbol' })
  @IsString()
  @IsEnum(['USDC', 'USDT'], { message: 'tokenSymbol must be either "USDC" or "USDT"' })
  @Transform(({ value }) => value?.toUpperCase()) // Normalize token symbols to uppercase
  tokenSymbol: string;

  @ApiProperty({ description: 'Blockchain network' })
  @IsString()
  @IsOptional()
  blockchainNetwork?: string;
}

/**
 * DTO for setting a spending limit response data
 */
export class SetSpendingLimitResponseDto {
  @ApiProperty({
    description: 'ID of the spending limit record',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'User ID associated with the limit',
    example: 'did:privy:user123',
  })
  userId: string;

  @ApiProperty({
    description: 'USD amount of the limit',
    example: 100,
  })
  usdAmount: number;

  @ApiProperty({
    description: 'FX rate used for conversion',
    example: '1200.50',
  })
  fxRate: string;

  @ApiProperty({
    description: 'Naira amount of the limit',
    example: 120050,
  })
  nairaAmount: number;

  @ApiProperty({
    description: 'Naira remaining for spending',
    example: 120050,
  })
  nairaRemaining: number;

  @ApiProperty({
    description: 'Date and time the limit was created',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time the limit was last updated',
    example: '2024-01-01T12:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Order ID from the offramp service',
    example: 'order_xyz789',
  })
  orderId: string;

  @ApiProperty({
    description: 'Status of the offramp order',
    example: 'COMPLETED',
  })
  status: string;

  @ApiProperty({
    description: 'Transaction hash of the offramp order',
    example:
      '0x123abc456def7890fedcba0987654321fedcba0987654321abcdef1234567890',
  })
  txHash: string;
}

export class SetSpendingLimitSuccessResponse {
  static readonly R200 = {
    status: 200,
    description: 'Spending limit set successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            data: { $ref: getSchemaPath(SetSpendingLimitResponseDto) },
          },
        },
      ],
    },
    examples: {
      success: {
        summary: 'Successful Setting of Spending Limit',
        value: {
          statusCode: 200,
          success: true,
          data: {
            id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            userId: 'did:privy:user123',
            usdAmount: 100,
            fxRate: '1200.50',
            nairaAmount: 120050,
            nairaRemaining: 120050,
            createdAt: '2024-01-01T12:00:00.000Z',
            updatedAt: '2024-01-01T12:30:00.000Z',
            orderId: 'order_xyz789',
            status: 'COMPLETED',
            txHash:
              '0x123abc456def7890fedcba0987654321fedcba0987654321abcdef1234567890',
          },
        },
      },
    },
  };
}

export class SetSpendingLimitErrorResponses {
  static readonly R400 = {
    status: 400,
    description: 'Invalid data provided',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            message: {
              type: 'string',
              example: 'Invalid data provided. USD amount must be at least 1.',
            },
          },
        },
      ],
    },
    examples: {
      badRequest: {
        summary: 'Bad Request',
        value: {
          statusCode: 400,
          success: false,
          message: 'Invalid data provided. USD amount must be at least 1.',
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
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      ],
    },
    examples: {
      unauthorized: {
        summary: 'Unauthorized Access',
        value: { statusCode: 401, success: false, message: 'Unauthorized' },
      },
    },
  };

  static readonly R403 = {
    status: 403,
    description: 'Cannot set limit for another user',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            message: {
              type: 'string',
              example: 'Cannot set spending limit for another user',
            },
          },
        },
      ],
    },
    examples: {
      forbidden: {
        summary: 'Forbidden Action',
        value: {
          statusCode: 403,
          success: false,
          message: 'Cannot set spending limit for another user',
        },
      },
    },
  };
}
