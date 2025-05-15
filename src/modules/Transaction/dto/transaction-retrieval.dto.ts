import { IsEnum, IsNumber, IsOptional, Min, IsString, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Response } from '../../../common/interceptors/response.interceptor';
import { Type } from 'class-transformer';

/**
 * Input DTO for retrieving transactions
 */
export class GetTransactionsInputDto {
  @ApiProperty({
    description: 'Optional user ID to filter transactions for a specific user',
    example: 'did:privy:user123',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    default: 1,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'Number of transactions per page',
    default: 10,
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit: number = 10;

  @ApiProperty({
    description: 'Optional transaction type to filter (spending or withdrawal)',
    required: false,
    enum: ['spending', 'withdrawal'],
    example: 'spending',
  })
  @IsOptional()
  @IsEnum(['spending', 'withdrawal'])
  type?: 'spending' | 'withdrawal';

  @ApiProperty({
    description: 'Optional minimum USD amount to filter transactions',
    required: false,
    example: 10.50,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minUsdAmount?: number;

  @ApiProperty({
    description: 'Optional maximum USD amount to filter transactions',
    required: false,
    example: 100.75,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsdAmount?: number;
}

/**
 * Response DTO for transaction data
 */
export class TransactionResponseDto {
  @ApiProperty({ description: 'User ID associated with the transaction' })
  userId: string;

  @ApiProperty({ description: 'Date and time of the transaction' })
  dateAndTime: Date;

  @ApiProperty({ description: 'Transaction amount in USD' })
  usdAmount: number;

  @ApiProperty({
    description: 'Token information related to the transaction',
    required: false,
  })
  tokenInfo?: { chain: string; blockchain: string; token: string }[] | null;

  @ApiProperty({
    description: 'Type of transaction (e.g., spending, withdrawal)',
  })
  transactionType: string;

  @ApiProperty({ description: 'Transaction amount in Naira', required: false })
  nairaAmount?: number;

  @ApiProperty({ description: 'Category of the transaction' })
  category: string;

  @ApiProperty({
    description: 'Effective exchange rate for the transaction',
    required: false,
  })
  effectiveRate?: number;

  @ApiProperty({
    description: 'Channel through which the transaction was made',
  })
  channel: string;

  @ApiProperty({
    description: 'Transaction hash, if applicable',
    required: false,
  })
  transactionHash?: string | null;

  @ApiProperty({ description: 'Status of the transaction' })
  transactionStatus: 'pending' | 'completed' | 'refund' | 'failed';

  @ApiProperty({ description: 'Type of transaction mode' })
  modeType: string;

  @ApiProperty({ description: 'Authorization ID for the transaction' })
  authorizationId: string;

  @ApiProperty({
    description: 'Merchant details associated with the transaction',
  })
  merchant: {
    merchantName: string;
    city: string;
    state: string;
  };

  @ApiProperty({
    description: 'Recipient address, if applicable',
    required: false,
  })
  recipientAddress?: string;

  @ApiProperty({ description: 'To address, if applicable', required: false })
  toAddress?: string;
}

/**
 * Response DTO for successful transaction retrieval
 */
export class GetTransactionsSuccessResponse {
  static readonly R200 = {
    status: 200,
    description: 'Transactions retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(TransactionResponseDto) },
            },
          },
        },
      ],
    },
    examples: {
      success: {
        summary: 'Successful Retrieval of Transactions',
        value: {
          statusCode: 200,
          success: true,
          data: [
            {
              userId: 'did:privy:abc123xyz',
              dateAndTime: '2023-01-01T00:00:00.000Z',
              usdAmount: 50.25,
              tokenInfo: [
                { chain: 'ethereum', blockchain: 'Base', token: 'USDC' },
              ],
              transactionType: 'spending',
              nairaAmount: 22500.0,
              category: 'purchase',
              effectiveRate: 450.0,
              channel: 'card',
              transactionHash: null,
              transactionStatus: 'completed',
              modeType: 'payment',
              authorizationId: 'auth_123xyz',
              merchant: {
                merchantName: 'Example Store',
                city: 'Lagos',
                state: 'Lagos',
              },
              recipientAddress: null,
              toAddress: null,
            },
            {
              userId: 'did:privy:abc123xyz',
              dateAndTime: '2023-01-02T10:30:00.000Z',
              usdAmount: 20.00,
              tokenInfo: [
                { chain: 'solana', blockchain: 'Mainnet', token: 'SOL' },
              ],
              transactionType: 'withdrawal',
              nairaAmount: 9000.00,
              category: 'transfer',
              effectiveRate: 450.0,
              channel: 'internal',
              transactionHash: '0xSolanaTxHash',
              transactionStatus: 'completed',
              modeType: 'transfer',
              authorizationId: 'auth_456abc',
              merchant: {
                merchantName: 'Self-Withdrawal',
                city: 'N/A',
                state: 'N/A',
              },
              recipientAddress: '0xRecipientWalletAddress',
              toAddress: '0xToWalletAddress',
            },
          ],
        },
      },
    },
  };
}

/**
 * Response DTO for transaction retrieval errors
 */
export class GetTransactionsErrorResponses {
  static readonly R401 = {
    status: 401,
    description: 'Unauthorized. Occurs if the user attempts to access transactions of another user without permission, or if the auth token is invalid/missing.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' }
          }
        }
      ]
    },
    examples: {
      unauthorizedGeneral: {
        summary: 'Unauthorized Access (General)',
        value: {
          statusCode: 401,
          success: false,
          message: 'Unauthorized'
        },
      },
      cannotAccessOtherUser: {
        summary: 'Not Authorized to Access Another User\'s Transactions',
        value: {
          statusCode: 401,
          success: false,
          message: 'Cannot access transactions of another user'
        },
      },
    },
  };

  static readonly R404 = {
    status: 404,
    description: 'User not found. Occurs if the specified user ID does not exist.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(Response) },
        {
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' }
          }
        }
      ]
    },
    examples: {
      userNotFound: {
        summary: 'User Not Found',
        value: {
          statusCode: 404,
          success: false,
          message: 'User with ID did:privy:abc123xyz not found'
        },
      },
    },
  };
}

export class ChangeFromLastWeekDto {
  @ApiProperty({ example: 15.5 })
  @IsNumber()
  percentage: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isIncrease: boolean;
}

export class DailySpendingDto {
  @ApiProperty({ example: 10.0, description: "Spending on Sunday" })
  @IsNumber()
  S: number;

  @ApiProperty({ example: 20.5, description: "Spending on Monday" })
  @IsNumber()
  M: number;

  @ApiProperty({ example: 15.0, description: "Spending on Tuesday" })
  @IsNumber()
  T: number;

  @ApiProperty({ example: 30.0, description: "Spending on Wednesday" })
  @IsNumber()
  W: number;

  @ApiProperty({ example: 25.25, description: "Spending on Thursday" })
  @IsNumber()
  T2: number;

  @ApiProperty({ example: 40.0, description: "Spending on Friday" })
  @IsNumber()
  F: number;

  @ApiProperty({ example: 10.0, description: "Spending on Saturday" })
  @IsNumber()
  S2: number;
}

export class WeeklySpendingSummaryDto {
  @ApiProperty({ description: 'Total amount spent this week', example: 150.75 })
  @IsNumber()
  totalSpentThisWeek: number;

  @ApiProperty({ description: 'Currency of the spending', example: 'USDC' })
  @IsString()
  currency: string;

  @ApiProperty({ description: "Percentage change from last week\'s spending", type: ChangeFromLastWeekDto })
  @ValidateNested()
  @Type(() => ChangeFromLastWeekDto)
  changeFromLastWeek: ChangeFromLastWeekDto;

  @ApiProperty({ description: 'Daily spending for the current week (Sunday to Saturday)', type: DailySpendingDto })
  @ValidateNested()
  @Type(() => DailySpendingDto)
  dailySpending: DailySpendingDto;

  @ApiProperty({ description: 'The day with the highest spending in the current week', example: 'F' })
  @IsString()
  highlightDay: string;
}
