import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface GetAccountResponse {
  statusCode: number;
  message: string;
  data: {
    _id: string;
    business: string;
    type: string;
    currency: string;
    accountName: string;
    bankCode: string;
    accountType: string;
    accountNumber: string;
    currentBalance: number;
    availableBalance: number;
    provider: string;
    providerReference: string;
    referenceCode: string;
    isDefault: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    charges: any[];
    __v: number;
  };
}

/**
 * Fetches details of a specific account using ZeroCard's API
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param accountId The unique identifier of the account to fetch
 * @returns Account details response data
 */
export async function getAccount(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  accountId: string,
): Promise<GetAccountResponse> {
  try {
    const response = await axios.get(
      `${zerocardBaseUrl}/accounts/${accountId}`,
      {
        headers: {
          Authorization: zerocardAuthToken,
          accept: 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message || 'Failed to fetch account details',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
