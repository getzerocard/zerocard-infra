import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface AccountBalanceResponse {
  // We'll extend this interface once we know the actual response structure
  [key: string]: any;
}

/**
 * Retrieves the balance for a specific account
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param accountId The unique identifier of the account
 * @returns Account balance information
 */
export async function getAccountBalance(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  accountId: string,
): Promise<AccountBalanceResponse> {
  try {
    const response = await axios.get(
      `${zerocardBaseUrl}/accounts/${accountId}/balance`,
      {
        headers: {
          Authorization: zerocardAuthToken,
        },
      },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message ||
        'Failed to retrieve account balance',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
