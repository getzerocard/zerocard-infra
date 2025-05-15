import {
  Logger,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
  Get,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { PrivyAuthGuard } from '../../common/guards';
import { PrivyUser } from '../auth/decorators/privy-user.decorator';
import { PrivyUserData } from '../auth/interfaces/privy-user.interface';
import {
  WithdrawalQueryDto,
  WithdrawalResponseDataDto,
  ProcessWithdrawalErrorResponses,
  TokenBalanceResponseDto,
  GetBalanceErrorResponses,
} from './dto/withdrawal.dto';
import { Trim } from '../../common/decorators/trim.decorator';
import { ApiController } from '../../common/decorators/api-controller.decorator';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Response } from '../../common/interceptors/response.interceptor';

/**
 * Controller for managing cryptocurrency withdrawals
 */
@ApiController('withdrawal', 'Withdrawal')
@ApiBearerAuth()
@ApiSecurity('identity-token')
@UseGuards(PrivyAuthGuard)
@ApiExtraModels(
  Response,
  WithdrawalQueryDto,
  WithdrawalResponseDataDto,
  TokenBalanceResponseDto,
)
export class WithdrawalController {
  private readonly logger = new Logger(WithdrawalController.name);

  constructor(private readonly withdrawalService: WithdrawalService) { }

  /**
   * Process a cryptocurrency withdrawal for the authenticated user.
   * Parameters are provided via query string.
   * @param query The validated query parameters for the withdrawal request.
   * @param userData The authenticated user's data.
   * @returns Object containing the transaction details of the withdrawal.
   */
  @Post('process/me')
  @ApiOperation({
    summary: 'Process cryptocurrency withdrawal for authenticated user',
    description:
      'Initiate a cryptocurrency withdrawal for the authenticated user using query parameters.',
  })
  @ApiQuery({ name: 'tokenSymbol', type: String, required: true, example: 'USDC' })
  @ApiQuery({ name: 'amount', type: String, required: true, example: '50.25' })
  @ApiQuery({
    name: 'recipientAddress',
    type: String,
    required: true,
    example: '0x123...',
  })
  @ApiQuery({
    name: 'chainType',
    enum: ['ethereum', 'solana'],
    required: true,
    example: 'ethereum',
  })
  @ApiQuery({
    name: 'blockchainNetwork',
    type: String,
    required: false,
    description: 'Optional specific network (e.g., Base Sepolia). Leave empty or omit for default.',
    example: 'Base Sepolia',
  })
  @ApiStandardResponse(WithdrawalResponseDataDto, 'Withdrawal processed successfully')
  @ApiResponse(ProcessWithdrawalErrorResponses.R400_INVALID)
  @ApiResponse(ProcessWithdrawalErrorResponses.R400_INSUFFICIENT_BALANCE)
  @ApiResponse(ProcessWithdrawalErrorResponses.R400_WALLET_NOT_FOUND)
  @ApiResponse(ProcessWithdrawalErrorResponses.R400_CONFIG_ERROR)
  @ApiResponse(ProcessWithdrawalErrorResponses.R401_UNAUTHORIZED)
  @ApiResponse(ProcessWithdrawalErrorResponses.R404_USER_NOT_FOUND)
  @ApiResponse(ProcessWithdrawalErrorResponses.R500)
  async processWithdrawal(
    @Query(new ValidationPipe({ transform: true })) query: WithdrawalQueryDto,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<WithdrawalResponseDataDto> {
    const targetUserId = userData.userId;
    this.logger.log(
      `Processing withdrawal request via query for user ${targetUserId} with params: ${JSON.stringify(query)}`,
    );

    const result = await this.withdrawalService.processWithdrawal(
      targetUserId,
      query.tokenSymbol,
      query.amount,
      query.recipientAddress,
      query.chainType,
      query.blockchainNetwork,
    );
    return result;
  }

  /**
   * Get token balances for the authenticated user
   * @param userData The authenticated user's data
   * @param symbols The token symbols to check balances for (comma-separated)
   * @param chainType The blockchain type (ethereum or solana)
   * @param blockchainNetwork The specific blockchain network(s) to check (optional)
   * @returns Object containing balances for the specified tokens on the given networks
   */
  @Get('balance')
  @ApiOperation({
    summary: 'Get token balances',
    description: 'Fetch token balances for the authenticated user across specified blockchain networks',
  })
  @ApiQuery({
    name: 'symbols',
    description: 'Token symbols to check balances for (comma-separated)',
    example: 'USDC,USDT',
    required: true,
  })
  @ApiQuery({
    name: 'chainType',
    description: 'Blockchain type',
    enum: ['ethereum', 'solana'],
    example: 'ethereum',
    required: true,
  })
  @ApiQuery({
    name: 'blockchainNetwork',
    description: 'Specific blockchain network (optional)',
    example: 'Base',
    required: false,
  })
  @ApiStandardResponse(TokenBalanceResponseDto, 'Token balances retrieved successfully')
  @ApiResponse(GetBalanceErrorResponses.responses[0])
  @ApiResponse(GetBalanceErrorResponses.responses[1])
  @ApiResponse(GetBalanceErrorResponses.responses[2])
  async getBalance(
    @PrivyUser() userData: PrivyUserData,
    @Query('symbols') symbols: string,
    @Query('chainType') chainType: 'ethereum' | 'solana',
    @Query('blockchainNetwork') blockchainNetwork?: string,
  ): Promise<TokenBalanceResponseDto> {
    this.logger.log(`Fetching token balances for user ${userData.userId}`);
    const balances = await this.withdrawalService.getTokenBalance(userData.userId, symbols, chainType, blockchainNetwork);
    return { balances };
  }
}
