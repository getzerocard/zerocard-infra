import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ZeroKYCErrorResponse {
  message: string;
}

type IdentityType = 'BVN';

/**
 * Initiates identity verification using ZeroKYC's API
 * @param baseUrl The base URL for the ZeroKYC API
 * @param clientId The client ID for authentication
 * @param identityType The type of identity document to verify (BVN)
 * @param number Identity number to verify
 * @param debitAccountNumber Account number for debit
 * @returns API response data
 */
export async function initiateVerification(
  baseUrl: string,
  clientId: string,
  identityType: IdentityType,
  number: string,
  debitAccountNumber: string,
) {
  try {
    const response = await axios.post(
      `${baseUrl}/identity/v2`,
      {
        type: identityType,
        async: true,
        number,
        debitAccountNumber,
      },
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ClientID: clientId,
        },
      },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ZeroKYCErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message || 'Verification initiation failed',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
