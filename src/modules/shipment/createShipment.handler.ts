import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { User } from '../user/entity/user.entity';
import type { Repository } from 'typeorm';

/**
 * Interface for the origin and destination address data
 */
interface AddressData {
  first_name: string;
  last_name: string;
  street: string;
  street_line_2?: string;
  state: string;
  email?: string | null;
  city: string;
  country: string;
  post_code: string;
  phone: string;
  lng: number;
  lat: number;
  name?: string | null;
}

/**
 * Interface for the dimension data
 */
interface Dimension {
  length: number;
  width: number;
  height: number;
}

/**
 * Interface for the item data in the shipment
 */
interface ShipmentItem {
  item_type: string;
  hts_code?: string;
  quantity: number;
  name: string;
  value: number;
}

/**
 * Creates a shipment using the Zerocard Shipping API
 * @param apiUrl The base URL for the Zerocard Shipping API
 * @param authToken The authorization token for Zerocard Shipping API
 * @param userId The ID of the user creating the shipment
 * @param userRepository The repository for User entity to update tracking number and status
 * @param origin The sender's address details, structured as follows:
 *   - first_name: string - The sender's first name (default: 'Zerocard')
 *   - last_name: string - The sender's last name (default: 'Company')
 *   - street: string - The sender's street address (default: 'Moṣọbalaje Building, adjacent Ace Mall')
 *   - street_line_2?: string - Additional street information, if any (default: 'Akobo')
 *   - state: string - The sender's state or region (default: 'Oyo')
 *   - email?: string | null - The sender's email, if available (default: 'seyi357412@outlook.com')
 *   - city: string - The sender's city (default: 'Ibadan')
 *   - country: string - The sender's country code (default: 'NG')
 *   - post_code: string - The sender's postal code (default: '200132')
 *   - phone: string - The sender's phone number (default: '+2349110160868')
 *   - lng: number - Longitude of the sender's location (default: 3.9458514473826263)
 *   - lat: number - Latitude of the sender's location (default: 7.435812071743428)
 *   - name?: string | null - Optional name field, often null (default: null)
 * @param destination The recipient's address details, structured as follows:
 *   - first_name: string - The recipient's first name (e.g., 'Joe')
 *   - last_name: string - The recipient's last name (e.g., 'Goldberg')
 *   - street: string - The recipient's street address (e.g., '31 Hall Crescent')
 *   - street_line_2?: string - Additional street information, if any (e.g., '')
 *   - state: string - The recipient's state or region (e.g., 'paris')
 *   - email?: string | null - The recipient's email, if available (e.g., '')
 *   - city: string - The recipient's city (e.g., 'paris')
 *   - country: string - The recipient's country code (e.g., 'FR')
 *   - post_code: string - The recipient's postal code (e.g., '94612')
 *   - phone: string - The recipient's phone number (e.g., '+1 267 000 0')
 *   - lng: number - Longitude of the recipient's location (e.g., -122.27)
 *   - lat: number - Latitude of the recipient's location (e.g., 37.81)
 *   - name?: string | null - Optional name field, often null (e.g., null)
 * @param weight The weight of the package in kg (default: 0.5)
 * @param dimension The dimensions of the package (length, width, height), structured as follows:
 *   - length: number - Length of the package in meters or specified unit (default: 0.5)
 *   - width: number - Width of the package in meters or specified unit (default: 0.5)
 *   - height: number - Height of the package in meters or specified unit (default: 0.5)
 * @param incomingOption Whether the shipment is 'pickup' or 'dropoff' (default: 'pickup')
 * @param region The region the shipment is being shipped from (default: 'NG')
 * @param serviceType The type of service ('international', 'nation-wide', 'local') (default: 'nation-wide')
 * @param packageType The type of package (default: 'general')
 * @param totalValue The total value of the shipment (default: 2000)
 * @param currency The currency of the total value (default: 'NGN')
 * @param pickupDate The date for pickup in YYYY-MM-DD format (e.g., '2023-07-20')
 * @param items Array of items in the shipment, each structured as follows:
 *   - item_type: string - Type of item (default: 'unactivated credit card')
 *   - hts_code?: string - Optional Harmonized Tariff Schedule code (e.g., '9000.10')
 *   - quantity: number - Number of items (default: 1)
 *   - name: string - Name or description of the item (default: 'Zerocard')
 *   - value: number - Value of the item (default: 2000)
 * @param serviceCode The service code ('standard', 'express', 'economy') (default: 'standard')
 * @param customsOption Who handles customs ('recipient' or 'sender') (e.g., 'recipient')
 * @param callbackUrl Webhook URL for tracking updates
 * @returns Promise resolving to the API response
 * @throws HttpException if the API call fails or user not found
 */
export async function createShipment(
  apiUrl: string,
  authToken: string,
  userId: string,
  userRepository: Repository<User>,
  origin: AddressData = {
    first_name: 'Zerocard',
    last_name: 'Company',
    street: 'Moṣọbalaje Building, adjacent Ace Mall',
    street_line_2: 'Akobo',
    state: 'Oyo',
    email: 'seyi357412@outlook.com',
    city: 'Ibadan',
    country: 'NG',
    post_code: '200132',
    phone: '+2349110160868',
    lng: 3.9458514473826263,
    lat: 7.435812071743428,
    name: null,
  },
  destination: AddressData,
  weight: number = 0.5,
  dimension: Dimension = {
    length: 0.5,
    width: 0.5,
    height: 0.5,
  },
  incomingOption: 'pickup' | 'dropoff' = 'pickup',
  region: string = 'NG',
  serviceType: 'international' | 'nation-wide' | 'local' = 'nation-wide',
  packageType: string = 'general',
  totalValue: number = 2000,
  currency: string = 'NGN',
  pickupDate: string,
  items: ShipmentItem[] = [
    {
      item_type: 'unactivated credit card',
      quantity: 1,
      name: 'Zerocard',
      value: 2000,
    },
  ],
  serviceCode: 'standard' | 'express' | 'economy' = 'standard',
  customsOption: 'recipient' | 'sender' = 'recipient',
  callbackUrl: string,
): Promise<any> {
  try {
    // Check if user exists
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(
        `User with ID ${userId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const payload = {
      origin,
      destination,
      weight,
      dimension,
      incoming_option: incomingOption,
      region,
      service_type: serviceType,
      package_type: packageType,
      total_value: totalValue,
      currency,
      channel_code: 'api',
      pickup_date: pickupDate,
      items,
      service_code: serviceCode,
      customs_option: customsOption,
      callback_url: callbackUrl,
    };

    const response = await axios.post(`${apiUrl}/your/api/endpoint`, payload, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
    });

    const trackingNumber = response.data.tracking_code || response.data.code;
    if (trackingNumber) {
      // Use a transaction to ensure atomic update
      await userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          await transactionalEntityManager.update(
            User,
            { id: userId },
            {
              trackingNumber: trackingNumber,
              cardOrderStatus: 'processed',
            },
          );
        },
      );
    }

    return {
      tracking_number: response.data.tracking_code,
      status: response.data.status,
      message: response.data.message,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
    };
  } catch (error) {
    throw new HttpException(
      `Failed to create shipment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
//TODO: technical debt: this does not support replacement you can create a seperate entity and only return active card to the user entiy
