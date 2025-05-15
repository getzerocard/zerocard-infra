import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

export interface CreateCustomerResponse {
  statusCode: number;
  message: string;
  data: {
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
    _id: string;
    __v: number;
  };
}

/**
 * Creates a new customer using ZeroCard's API
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param customerData The customer data to be sent in the request body
 * @returns Customer creation response data
 */
export async function createCustomer(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  customerData: {
    type: string;
    status: string;
    name: string;
    phoneNumber: string;
    billingAddress: {
      city: string;
      state: string;
      postalCode: string;
      country: string;
      line1: string;
    };
    emailAddress: string;
    individual: {
      firstName: string;
      lastName: string;
      dob: string;
      identity: {
        type: string;
        number: string;
      };
    };
  },
): Promise<CreateCustomerResponse> {
  const apiUrl = `${zerocardBaseUrl}/customers`;
  const headers = {
    Authorization: zerocardAuthToken,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(
      apiUrl,
      customerData,
      {
        headers: headers,
      },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message || 'Failed to create customer',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
