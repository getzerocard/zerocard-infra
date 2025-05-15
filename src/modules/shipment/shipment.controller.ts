import {
  Body,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ShipmentService } from './shipment.service';
import { PrivyAuthGuard } from '../../common/guards';
import { PrivyUser } from '../auth/decorators/privy-user.decorator';
import { PrivyUserData } from '../auth/interfaces/privy-user.interface';
import { Trim } from '../../common/decorators/trim.decorator';
import { ValidationPipe } from '../../common/pipes';
import {
  CreateShipmentDto,
  CreateShipmentResponseDataDto,
  CreateShipmentSuccessExamples,
  CreateShipmentErrorExamples,
} from './dto/create-shipment.dto';
import {
  GetShipmentResponseDataDto,
  GetShipmentSuccessExamples,
  GetShipmentErrorExamples,
} from './dto/get-shipment.dto';
import { ApiController } from '../../common/decorators/api-controller.decorator';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { Response } from '../../common/interceptors/response.interceptor';

/**
 * Controller for shipment management
 */
@ApiController('shipments', 'shipments')
@ApiBearerAuth()
@ApiSecurity('identity-token')
@UseGuards(PrivyAuthGuard) // Apply guard to all routes
@ApiExtraModels(Response, CreateShipmentResponseDataDto, GetShipmentResponseDataDto)
export class ShipmentController {
  private readonly logger = new Logger(ShipmentController.name);

  constructor(private readonly shipmentService: ShipmentService) { }

  /**
   * Create a shipment for the authenticated user
   * @param userId The user ID or 'me' for the current user
   * @param body The shipment creation data
   * @param userData The authenticated user's data
   * @returns The created shipment details
   */
  @Post(':userId')
  @ApiOperation({
    summary: 'Create a shipment',
    description:
      'Create a new shipment for the specified user or the authenticated user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
    example: 'did:privy:abc123xyz',
  })
  @ApiBody({ type: CreateShipmentDto })
  @ApiStandardResponse(CreateShipmentResponseDataDto, 'Shipment created successfully')
  @ApiResponse(CreateShipmentErrorExamples.responses[0])
  @ApiResponse(CreateShipmentErrorExamples.responses[1])
  @ApiResponse(CreateShipmentErrorExamples.responses[2])
  @ApiResponse(CreateShipmentErrorExamples.responses[3])
  @ApiResponse(CreateShipmentErrorExamples.responses[4])
  async createShipment(
    @Param('userId') @Trim() userId: string,
    @Body(new ValidationPipe()) body: CreateShipmentDto,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<CreateShipmentResponseDataDto> {
    const targetUserId = userId === 'me' ? userData.userId : userId;

    // Authorization check - can only create shipment for self
    if (userData.userId !== targetUserId) {
      throw new HttpException(
        'Cannot create shipment for another user',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.log(`Creating shipment for user ${targetUserId}`);
    return this.shipmentService.createShipmentForUser(
      targetUserId,
      body.destination,
      body.pickupDate,
      body.callbackUrl,
    );
  }

  /**
   * Get shipment details for the authenticated user
   * @param userId The user ID or 'me' for the current user
   * @param userData The authenticated user's data
   * @returns Shipment details for the user
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Get shipment details',
    description:
      'Retrieve shipment information for the specified user or the authenticated user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
    example: 'did:privy:abc123xyz',
  })
  @ApiStandardResponse(GetShipmentResponseDataDto, 'Shipment retrieved successfully')
  @ApiResponse(GetShipmentErrorExamples.responses[0])
  @ApiResponse(GetShipmentErrorExamples.responses[1])
  @ApiResponse(GetShipmentErrorExamples.responses[2])
  @ApiResponse(GetShipmentErrorExamples.responses[3])
  @ApiResponse(GetShipmentErrorExamples.responses[4])
  async getShipment(
    @Param('userId') @Trim() userId: string,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<GetShipmentResponseDataDto> {
    const targetUserId = userId === 'me' ? userData.userId : userId;

    // Authorization check - can only retrieve shipment for self
    if (userData.userId !== targetUserId) {
      throw new HttpException(
        'Cannot retrieve shipment for another user',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.log(`Retrieving shipment for user ${targetUserId}`);
    return this.shipmentService.getShipmentForUser(targetUserId);
  }
}
