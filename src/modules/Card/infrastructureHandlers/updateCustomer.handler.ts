import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface UpdateCustomerResponse {
  statusCode: number;
  message: string;
  data: {
    _id: string;
    business: string;
    type: string;
    name: string;
    phoneNumber: string;
    emailAddress: string;
    status: string;
    individual: {
      firstName: string;
      lastName: string;
      dob: string;
      identity: {
        type: string;
        number: string;
      };
    };
    billingAddress: {
      line1: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
}

/**
 * Updates a customer's information using ZeroCard's API
 * Note: Only email address and phone number can be updated through this API.
 * Other data such as name, type, status, individual details, and billing address will be retrieved from the database and should not be modified via this endpoint.
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param customerId The unique identifier of the customer to update
 * @param customerData The customer data to be updated (limited to emailAddress and phoneNumber)
 * @returns Customer update response data
 */
export async function updateCustomer(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  customerId: string,
  customerData: {
    emailAddress: string;
    phoneNumber: string;
  },
): Promise<UpdateCustomerResponse> {
  try {
    const response = await axios.put(
      `${zerocardBaseUrl}/customers/${customerId}`,
      customerData,
      {
        headers: {
          Authorization: zerocardAuthToken,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message || 'Failed to update customer',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
