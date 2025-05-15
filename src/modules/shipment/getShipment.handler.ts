import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import type { Repository } from 'typeorm';
import type { User } from '../user/entity/user.entity';

/**
 * Retrieves a shipment using the Zerocard Shipping API based on user tracking number
 * @param apiUrl The base URL for the Zerocard Shipping API
 * @param authToken The authorization token for Zerocard Shipping API
 * @param userId The ID of the user to retrieve the shipment for
 * @param userRepository The repository for User entity to fetch tracking number
 * @returns Promise resolving to an object containing shipment data with specific fields
 * @throws HttpException if the API call fails or user/tracking number not found
 */
export async function getShipment(
  apiUrl: string,
  authToken: string,
  userId: string,
  userRepository: Repository<User>,
): Promise<any> {
  try {
    // Fetch user to get tracking number
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(
        `User with ID ${userId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!user.trackingNumber) {
      throw new HttpException(
        `No tracking number found for user with ID ${userId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const headers = {
      Authorization: authToken,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(
      `${apiUrl}/shipping/shipments/${user.trackingNumber}`,
      { headers },
    );

    const data = response.data;
    return {
      user_id: userId,
      package_delivery_eta: data.delivery_eta,
      destination_address: data.destination_address,
      destination_name: data.destination_name,
      current_status: {
        code: data.status.code,
        name: data.status.name,
      },
      tracking_number: user.trackingNumber,
    };
  } catch (error) {
    throw new HttpException(
      `Failed to get shipment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
