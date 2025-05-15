import { HttpException, HttpStatus } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { User } from '../../user/entity/user.entity';
import type { CreateCustomerResponse } from '../../Card/infrastructureHandlers/createCustomer.handler';
import { createCustomer } from '../../Card/infrastructureHandlers/createCustomer.handler';
import { convertToDatabaseDateFormat } from '../../../common/util/dateFormat.util';

/**
 * Prepares and creates a new customer using KYC data for ZeroCard API
 * @param userRepository The repository to fetch user data
 * @param userId The ID of the user to prepare customer data for
 * @param identityType The type of identity (BVN or NIN)
 * @param identityNumber The identity number
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @returns Promise resolving to the customer creation response
 */
export async function prepareNewCustomerWithKyc(
  userRepository: Repository<User>,
  userId: string,
  identityType: 'BVN' | 'NIN',
  identityNumber: string,
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
): Promise<CreateCustomerResponse> {
  try {
    // Fetch user data from the database
    const user = await userRepository.findOne({ where: { userId: userId } });
    if (!user) {
      throw new HttpException(
        `User with ID ${userId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Prepare customer data
    const name = `${user.lastName || ''} ${user.firstName || ''}`.trim();
    const customerData = {
      type: 'individual',
      status: 'active',
      name: name,
      phoneNumber: user.phoneNumber,
      emailAddress: user.email,
      billingAddress: {
        line1: user.shippingAddress?.street,
        city: user.shippingAddress?.city,
        state: user.shippingAddress?.state,
        country: user.shippingAddress?.country,
        postalCode: user.shippingAddress?.postalCode,
      },
      individual: {
        firstName: user.firstName,
        lastName: user.lastName,
        dob: user.dateOfBirth ? convertToDatabaseDateFormat(user.dateOfBirth.toString()) : '',
        identity: {
          type: identityType,
          number: identityNumber,
        },
      },
    };

    // Call createCustomer handler from Card module
    const response = await createCustomer(
      zerocardBaseUrl,
      zerocardAuthToken,
      customerData,
    );

    // Log the full API response from createCustomer
    console.log('Full API response from createCustomer:', JSON.stringify(response, null, 2));

    return response;
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(
      `Failed to prepare and create customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
