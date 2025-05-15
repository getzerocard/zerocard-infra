import { HttpCode, HttpStatus, Post, Query, Get, Param, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { OrderCardService } from '../services/orderCard.service';
import {
  OrderCardResponseDto,
  OrderCardSuccess,
  OrderCardErrors,
} from '../dto/order-card.dto';
import { PrivyUser } from '../../auth/decorators/privy-user.decorator';
import { PrivyUserData } from '../../auth/interfaces/privy-user.interface';
import { MapCardService } from '../services/mapCard.service';
import {
  MapCardResponseDto,
  MappedCardDataDto,
  MapCardSuccess,
  MapCardErrors,
} from '../dto/mapCard.dto';
import { ApiController } from '../../../common/decorators/api-controller.decorator';
import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ApiStandardResponse } from '../../../common/decorators/api-response.decorator';
import { Response } from '../../../common/interceptors/response.interceptor';
import { PrivyAuthGuard } from '../../../common/guards';
import { resolveAndAuthorizeUserId } from "../../../common/util/auth.util";
import { GetCardTokenInfoResponseDto, GetCardTokenInfoErrorResponses } from '../dto/get-card-token-info.dto';
import { Trim } from '../../../common/decorators/trim.decorator';

/**
 * Controller to handle card ordering requests
 */
@ApiController('cards', 'Cards')
@ApiExtraModels(
  Response,
  OrderCardResponseDto,
  MapCardResponseDto,
  MappedCardDataDto,
  GetCardTokenInfoResponseDto,
)
export class CardController {
  private readonly logger = new Logger(CardController.name);

  constructor(
    private readonly orderCardService: OrderCardService,
    private readonly mapCardService: MapCardService,
  ) { }

  @Post(':userId/order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Order a new card for a user',
    description:
      "Initiates the card ordering process for the specified user. The user must have sufficient balance of the specified token to cover the card order fee. If the user is a sub-user, the main user must have pre-locked the necessary funds.",
  })
  @ApiParam({
    name: 'userId',
    description: "User ID (Privy DID) or 'me' for the currently authenticated user.",
    example: 'did:privy:user123',
    type: String,
  })
  @ApiQuery({
    name: 'symbol',
    type: String,
    description: 'Token symbol to be used for paying the order fee (e.g., USDC, ETH).',
    example: 'USDC',
    required: true,
  })
  @ApiQuery({
    name: 'chainType',
    enum: ['ethereum', 'solana'],
    description: "The blockchain type ('ethereum' or 'solana').",
    example: 'ethereum',
    required: true,
  })
  @ApiQuery({
    name: 'blockchainNetwork',
    type: String,
    description: 'The specific blockchain network (e.g., mainnet, sepolia, solana-mainnet).',
    example: 'sepolia',
    required: true,
  })
  @ApiStandardResponse(OrderCardResponseDto)
  @ApiResponse(OrderCardErrors.R400)
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized. Invalid or missing token.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden. User lacks permission to order card for the target user.' })
  @ApiResponse(OrderCardErrors.R500)
  async orderNewCard(
    @Param('userId') @Trim() userIdParam: string,
    @Query('symbol') @Trim() symbol: string,
    @Query('chainType') @Trim() chainType: 'ethereum' | 'solana',
    @Query('blockchainNetwork') @Trim() blockchainNetwork: string,
    @PrivyUser() authenticatedUser: PrivyUserData,
  ): Promise<OrderCardResponseDto> {
    this.logger.log(
      `Request to order card for user param: ${userIdParam} with symbol: ${symbol}, chain: ${chainType}, network: ${blockchainNetwork}`,
    );

    const targetUserId = resolveAndAuthorizeUserId(
      userIdParam,
      authenticatedUser.userId,
      'You are not authorized to order a card for this user.',
    );

    this.logger.log(
      `Authorized. Ordering card for resolved user ID: ${targetUserId}`,
    );

    if (chainType !== 'ethereum' && chainType !== 'solana') {
      throw new BadRequestException("Invalid chainType. Must be 'ethereum' or 'solana'.");
    }

    return await this.orderCardService.orderCard(
      targetUserId,
      symbol, // Service handles normalization
      chainType,
      blockchainNetwork,
    );
  }

  @Post('map')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Map a card to a user',
    description:
      'Maps a card to the specified user. All parameters must be provided as query parameters.',
  })
  @ApiStandardResponse(MapCardResponseDto, 'Card mapped successfully')
  @ApiResponse(MapCardErrors.R400)
  @ApiResponse(MapCardErrors.R403)
  @ApiResponse(MapCardErrors.R404)
  @ApiResponse(MapCardErrors.R500)
  @ApiQuery({
    name: 'userId',
    type: String,
    description: "User ID (Privy DID) or 'me' for the currently authenticated user.",
    example: 'me',
    required: true,
  })
  @ApiQuery({
    name: 'status',
    type: String,
    description: 'Status of the card mapping',
    example: 'active',
    required: true,
  })
  @ApiQuery({
    name: 'expirationDate',
    type: String,
    description: 'Expiration date of the card',
    example: '2025-12-31',
    required: true,
  })
  @ApiQuery({
    name: 'number',
    type: String,
    description: 'Card number',
    example: '1234567890123456',
    required: true,
  })
  async mapCard(
    @PrivyUser() authenticatedUser: PrivyUserData,
    @Query('userId') @Trim() userIdQuery: string,
    @Query('status') @Trim() status: string,
    @Query('expirationDate') @Trim() expirationDate: string,
    @Query('number') @Trim() number: string,
  ): Promise<MapCardResponseDto> {
    const targetUserId = resolveAndAuthorizeUserId(
      userIdQuery,
      authenticatedUser.userId,
      'You are not authorized to map a card for this user.',
    );

    this.logger.log(`Authorized. Mapping card for resolved user ID: ${targetUserId}`);

    return await this.mapCardService.mapCard(
      targetUserId,
      status,
      expirationDate,
      number,
    );
  }

  @Get(':userId/token-info')
  @ApiOperation({
    summary: "Get secure token information for a user's card",
    description: "Retrieves a short-lived secure token associated with the user's mapped card. This token can be used for displaying sensitive card details securely on the client-side.",
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID (Privy DID) or \'me\' for the currently authenticated user.',
    example: 'did:privy:user123',
    type: String,
  })
  @ApiStandardResponse(GetCardTokenInfoResponseDto)
  @ApiResponse(GetCardTokenInfoErrorResponses.R400)
  @ApiResponse(GetCardTokenInfoErrorResponses.R401)
  @ApiResponse(GetCardTokenInfoErrorResponses.R403)
  @ApiResponse(GetCardTokenInfoErrorResponses.R404)
  @ApiResponse(GetCardTokenInfoErrorResponses.R500)
  async getCardTokenInformation(
    @Param('userId') @Trim() userIdParam: string,
    @PrivyUser() authenticatedUser: PrivyUserData,
  ): Promise<GetCardTokenInfoResponseDto> {
    this.logger.log(
      `Request to get card token information for user param: ${userIdParam}`,
    );

    const targetUserId = resolveAndAuthorizeUserId(
      userIdParam,
      authenticatedUser.userId,
      'Cannot fetch card token information for another user.',
    );

    this.logger.log(
      `Authorized. Fetching card token for resolved user ID: ${targetUserId}`,
    );

    const cardInfo = await this.mapCardService.getCardInfo(targetUserId);

    return cardInfo;
  }
}

