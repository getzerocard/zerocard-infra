import { Post, UseGuards, Logger, Param, Query, ValidationPipe as NestValidationPipe, BadRequestException } from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { SetLimitService } from './services/setLimit.service';
import { PrivyAuthGuard } from '../../common/guards';
import { PrivyUser } from '../auth/decorators/privy-user.decorator';
import { PrivyUserData } from '../auth/interfaces/privy-user.interface';
import { ValidationPipe } from '../../common/pipes';
import { Trim } from '../../common/decorators/trim.decorator';
import {
  SetSpendingLimitInputDto,
  SetSpendingLimitResponseDto,
  SetSpendingLimitErrorResponses,
} from './dto/set-limit.dto';
import { MinimumValuePipe } from '../../common/pipes/minimum-value.pipe';
import { resolveAndAuthorizeUserId } from '../../common/util/auth.util';
import { ApiController } from '../../common/decorators/api-controller.decorator';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Response } from '../../common/interceptors/response.interceptor';

/**
 * Controller for managing spending limits
 */
@ApiController('spending-limits', 'Spending Limits')
@ApiBearerAuth()
@ApiSecurity('identity-token')
@UseGuards(PrivyAuthGuard) // Apply guard to all routes
@ApiExtraModels(Response, SetSpendingLimitResponseDto)
export class SpendingLimitController {
  private readonly logger = new Logger(SpendingLimitController.name);

  constructor(private readonly setLimitService: SetLimitService) { }

  /**
   * Set a spending limit for a user
   *
   * This endpoint allows setting a spending limit in USD for a user for security purpose .
   *
   * **Supported MAINET combinations:**
   *   - ethereum, USDC, Base
   *   - ethereum, USDC, BNB Smart Chain
   *   - ethereum, USDT, BNB Smart Chain
   *   - solana, USDC, Solana
   *
   * **Supported TESTNET combinations:**
   *   - ethereum, USDC, Base Sepolia
   *   - ethereum, USDT, BNB Smart Chain Testnet
   *   - solana, USDC, Solana Devnet
   *
   * @param userId The user ID or 'me' for the current authenticated user
   * @param inputDto The input data containing usdAmount, chainType, tokenSymbol, and optional blockchainNetwork
   * @param userData The authenticated user's data
   * @returns The created spending limit record
   */
  @Post('set-limit/:userId')
  @ApiOperation({
    summary: 'Set spending limit for a user',
    description:
      'Set a spending limit in USD for a user for security purpose.\n\n**Supported MAINET combinations:**\n- ethereum, USDC, Base\n- ethereum, USDC, BNB Smart Chain\n- ethereum, USDT, BNB Smart Chain\n- solana, USDC, Solana\n\n**Supported TESTNET combinations:**\n- ethereum, USDC, Base Sepolia\n- ethereum, USDT, BNB Smart Chain Testnet\n- solana, USDC, Solana Devnet',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
    example: 'did:privy:user123',
  })
  @ApiQuery({
    name: 'usdAmount',
    type: Number,
    required: true,
    description: 'USD amount for the spending limit',
    example: 100,
  })
  @ApiQuery({
    name: 'chainType',
    type: String,
    required: true,
    description: 'Chain type',
    example: 'ethereum',
    enum: ['ethereum', 'solana'],
  })
  @ApiQuery({
    name: 'tokenSymbol',
    type: String,
    required: true,
    description: 'Token symbol',
    example: 'USDC',
    enum: ['USDC', 'USDT'],
  })
  @ApiQuery({
    name: 'blockchainNetwork',
    type: String,
    required: true,
    description: 'Blockchain network',
    example: 'Base',
    enum: ['Base', 'BNB Smart Chain', 'Solana', 'Base Sepolia', 'BNB Smart Chain Testnet', 'Solana Devnet'],
  })
  @ApiStandardResponse(
    SetSpendingLimitResponseDto,
    'Spending limit set successfully',
  )
  @ApiResponse(SetSpendingLimitErrorResponses.R400)
  @ApiResponse(SetSpendingLimitErrorResponses.R401)
  @ApiResponse(SetSpendingLimitErrorResponses.R403)
  async setSpendingLimit(
    @Param('userId') @Trim() userId: string,
    @Query(new NestValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true,
      forbidUnknownValues: false,
    }))
    inputDto: SetSpendingLimitInputDto,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<SetSpendingLimitResponseDto> {
    this.logger.log(`Processing spending limit request for user ${userId} with params: ${JSON.stringify(inputDto)}`);

    // Resolve target user ID and check authorization
    const targetUserId = resolveAndAuthorizeUserId(
      userId,
      userData.userId,
      'Cannot set spending limit for another user',
    );

    this.logger.log(
      `Setting spending limit for user ${targetUserId} with USD amount ${inputDto.usdAmount}`,
    );

    const { spendingLimit, statusData } =
      await this.setLimitService.setSpendingLimit(
        targetUserId,
        inputDto.usdAmount,
        inputDto.chainType as 'ethereum' | 'solana',
        inputDto.tokenSymbol,
        inputDto.blockchainNetwork,
      );

    return {
      id: spendingLimit.id.toString(),
      userId: targetUserId,
      usdAmount: spendingLimit.usdAmount,
      fxRate: spendingLimit.fxRate.toString(),
      nairaAmount: spendingLimit.nairaAmount,
      nairaRemaining: spendingLimit.nairaRemaining,
      createdAt: spendingLimit.createdAt,
      updatedAt: spendingLimit.updatedAt,
      orderId: statusData.OrderID,
      status: statusData.Status,
      txHash: statusData.TxHash,
    };
  }
}
