import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface SendPinResponse {
  // We'll extend this interface once we know the actual response structure
  [key: string]: any;
}

/**
 * Sends default PIN for a specific card
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param cardId The unique identifier of the card
 * @returns Response data from PIN sending operation
 */
export async function sendCardDefaultPin(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  cardId: string,
): Promise<SendPinResponse> {
  try {
    const response = await axios.put(
      `${zerocardBaseUrl}/cards/${cardId}/send-pin`,
      {}, // Empty body as it's not required
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
      axiosError.response?.data?.message || 'Failed to send card PIN',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
