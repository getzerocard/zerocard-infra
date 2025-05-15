import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';
import { getShipment } from './getShipment.handler';
import { createShipment } from './createShipment.handler';
import type { CreateShipmentResponseDataDto } from './dto/create-shipment.dto';
import type { GetShipmentResponseDataDto } from './dto/get-shipment.dto';

@Injectable()
export class ShipmentService {
  private readonly zerocardShippingApiUrl: string;
  private readonly zerocardShippingAuthToken: string;
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.zerocardShippingApiUrl = this.configService.get<string>(
      'ZEROCARD_SHIPPING_API_URL',
    );
    this.zerocardShippingAuthToken = this.configService.get<string>(
      'ZEROCARD_SHIPPING_AUTH_TOKEN',
    );
  }

  /**
   * Creates a shipment for a user using the Zerocard Shipping API
   * @param userId The ID of the user creating the shipment
   * @param destination The recipient's address details
   * @param pickupDate The date for pickup in YYYY-MM-DD format
   * @param callbackUrl Webhook URL for tracking updates
   * @param origin Optional sender's address details
   * @param weight Optional weight of the package in kg
   * @param dimension Optional dimensions of the package
   * @param incomingOption Optional whether the shipment is 'pickup' or 'dropoff'
   * @param region Optional region the shipment is being shipped from
   * @param serviceType Optional type of service ('international', 'nation-wide', 'local')
   * @param packageType Optional type of package
   * @param totalValue Optional total value of the shipment
   * @param currency Optional currency of the total value
   * @param items Optional array of items in the shipment
   * @param serviceCode Optional service code ('standard', 'express', 'economy')
   * @param customsOption Optional who handles customs ('recipient' or 'sender')
   * @returns Promise resolving to the shipment creation response
   * @throws HttpException if shipment creation fails
   */
  async createShipmentForUser(
    userId: string,
    destination: any,
    pickupDate: string,
    callbackUrl: string,
    origin?: any,
    weight?: number,
    dimension?: any,
    incomingOption?: 'pickup' | 'dropoff',
    region?: string,
    serviceType?: 'international' | 'nation-wide' | 'local',
    packageType?: string,
    totalValue?: number,
    currency?: string,
    items?: any[],
    serviceCode?: 'standard' | 'express' | 'economy',
    customsOption?: 'recipient' | 'sender',
  ): Promise<CreateShipmentResponseDataDto> {
    try {
      this.logger.log(`Creating shipment for user ${userId}`);
      const shipmentResponse = await createShipment(
        this.zerocardShippingApiUrl,
        this.zerocardShippingAuthToken,
        userId,
        this.userRepository,
        origin,
        destination,
        weight,
        dimension,
        incomingOption,
        region,
        serviceType,
        packageType,
        totalValue,
        currency,
        pickupDate,
        items,
        serviceCode,
        customsOption,
        callbackUrl,
      );
      this.logger.log(`Shipment created successfully for user ${userId}`);
      return shipmentResponse;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create shipment for user ${userId}: ${errorMessage}`,
      );
      throw new HttpException(
        `Shipment creation failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retrieves shipment information for a user using the Zerocard Shipping API
   * @param userId The ID of the user to retrieve the shipment for
   * @returns Promise resolving to an object containing shipment data with specific fields
   * @throws HttpException if retrieval fails or user/tracking number not found
   */
  async getShipmentForUser(userId: string): Promise<GetShipmentResponseDataDto> {
    try {
      this.logger.log(`Retrieving shipment for user ${userId}`);
      const shipmentData = await getShipment(
        this.zerocardShippingApiUrl,
        this.zerocardShippingAuthToken,
        userId,
        this.userRepository,
      );

      // Update user's cardOrderStatus based on the shipment status
      const statusCode = shipmentData.current_status.code;
      let newStatus;

      switch (statusCode) {
        case 'pickup_completed':
          newStatus = 'shipped';
          break;
        case 'in_delivery':
          newStatus = 'in_delivery';
          break;
        case 'in_transit':
          newStatus = 'in_transit';
          break;
        case 'delivered':
          newStatus = 'delivered';
          break;
        default:
          // Do not change status for other codes like 'drafted' or 'pending'
          break;
      }

      if (newStatus) {
        await this.userRepository.update(
          { id: userId },
          { cardOrderStatus: newStatus },
        );
        this.logger.log(
          `Updated cardOrderStatus to ${newStatus} for user ${userId}`,
        );
      }

      // Fetch the current cardOrderStatus from the database
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        shipmentData.database_status = user.cardOrderStatus;
      }

      this.logger.log(`Shipment retrieved successfully for user ${userId}`);
      return shipmentData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to retrieve shipment for user ${userId}: ${errorMessage}`,
      );
      throw new HttpException(
        `Shipment retrieval failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
