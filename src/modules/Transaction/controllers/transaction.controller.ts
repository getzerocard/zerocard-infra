import {
  Get,
  Logger,
  Param,
  UnauthorizedException,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TransactionRetrievalService } from '../services/transactionRetrieval.service';
import { PrivyUser } from '../../auth/decorators/privy-user.decorator';
import { PrivyUserData } from '../../auth/interfaces/privy-user.interface';
import { Trim } from '../../../common/decorators/trim.decorator';
import {
  TransactionResponseDto,
  GetTransactionsSuccessResponse,
  GetTransactionsErrorResponses,
  WeeklySpendingSummaryDto,
} from '../dto/transaction-retrieval.dto';
import { UserNotFoundException } from '../../../common/interfaces/exceptions';
import { ApiController } from '../../../common/decorators/api-controller.decorator';
import { Response } from '../../../common/interceptors/response.interceptor';
import { Request } from 'express';
import { TransactionQuery, TransactionQueryParams } from '../decorators';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';

/**
 * Controller for transaction retrieval
 */
@ApiController('transactions', 'User Transactions')
@ApiExtraModels(Response, TransactionResponseDto)
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(
    private readonly transactionRetrievalService: TransactionRetrievalService,
  ) { }

  /**
   * Retrieve transactions with optional filters and pagination.
   * @param userId - The user ID or 'me' for the authenticated user.
   * @param query - Query parameters for pagination and filtering.
   * @param userData - The authenticated user's data.
   * @returns An array of transaction responses.
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Retrieve transactions for a user',
    description:
      'Get transactions for a specific user or the authenticated user with optional filters and pagination.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for the authenticated user',
    example: 'did:privy:abc123xyz',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of transactions per page',
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Transaction type to filter (spending or withdrawal)',
    type: String,
    enum: ['spending', 'withdrawal'],
    example: 'spending',
  })
  @ApiQuery({
    name: 'minUsdAmount',
    required: false,
    description: 'Minimum USD amount to filter transactions',
    type: Number,
    example: 10.5,
  })
  @ApiQuery({
    name: 'maxUsdAmount',
    required: false,
    description: 'Maximum USD amount to filter transactions',
    type: Number,
    example: 100.75,
  })
  @ApiResponse(GetTransactionsSuccessResponse.R200)
  @ApiResponse(GetTransactionsErrorResponses.R401)
  @ApiResponse(GetTransactionsErrorResponses.R404)
  async getTransactions(
    @Req() request: Request,
    @Param('userId') @Trim() userIdParam: string,
    @TransactionQuery() query: TransactionQueryParams,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<TransactionResponseDto[]> {
    this.logger.log(`Raw request query: ${JSON.stringify(request.query)}`);

    // Resolve target user ID
    const targetUserId = userIdParam === 'me' ? userData.userId : userIdParam;

    // Authorization check - users can only access their own transactions
    if (targetUserId !== userData.userId) {
      this.logger.warn(
        `User ${userData.userId} attempted to access transactions of user ${targetUserId}`,
      );
      throw new UnauthorizedException(
        'Cannot access transactions of another user',
      );
    }

    this.logger.log(`Retrieving transactions for user ${targetUserId}`);
    try {
      const transactions =
        await this.transactionRetrievalService.getTransactions(
          targetUserId,
          query.page,
          query.limit,
          query.type,
          query.minUsdAmount,
          query.maxUsdAmount,
        );
      this.logger.log(
        `Successfully retrieved transactions for user ${targetUserId}`,
      );
      return transactions;
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        this.logger.error(`User not found: ${targetUserId}`);
        throw error; // Status code will be 404 as defined in the exception filter
      }
      this.logger.error(
        `Error retrieving transactions for user ${targetUserId}: ${(error as Error).message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Get(':userId/spending-summary/weekly')
  @ApiStandardResponse(WeeklySpendingSummaryDto)
  @ApiResponse(GetTransactionsErrorResponses.R401)
  @ApiResponse(GetTransactionsErrorResponses.R404) // For user not found
  @UsePipes(new ValidationPipe({ transform: true }))
  async getWeeklySpendingSummary(
    @PrivyUser() authUser: PrivyUserData,
    @Param('userId') @Trim() targetUserIdParam: string,
  ): Promise<WeeklySpendingSummaryDto> {
    const resolvedTargetUserId = targetUserIdParam === 'me' ? authUser.userId : targetUserIdParam;

    if (resolvedTargetUserId !== authUser.userId) {
      this.logger.warn(
        `User ${authUser.userId} attempted to access weekly spending summary of user ${resolvedTargetUserId}. Request param: ${targetUserIdParam}`,
      );
      throw new UnauthorizedException(
        'Cannot access weekly spending summary of another user.',
      );
    }
    this.logger.log(`Retrieving weekly spending summary for user ${resolvedTargetUserId}`);
    return this.transactionRetrievalService.getWeeklySpendingSummary(resolvedTargetUserId);
  }
}
