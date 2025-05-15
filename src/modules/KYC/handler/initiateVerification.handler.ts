import { HttpException, HttpStatus } from '@nestjs/common';

interface ZeroKYCErrorResponse {
  message: string;
}

type IdentityType = 'BVN' | 'NIN';

/**
 * Initiates identity verification using ZeroKYC's API with fetch
 * @param baseUrl The base URL for the ZeroKYC API
 * @param accessToken The Bearer token for authentication
 * @param identityType The type of identity document to verify (BVN)
 * @param number Identity number to verify
 * @param debitAccountNumber Account number for debit
 * @param async Boolean flag for asynchronous processing
 * @returns API response data
 */
export async function initiateVerification(
  baseUrl: string,
  accessToken: string,
  identityType: IdentityType,
  number: string,
  debitAccountNumber: string,
  async: boolean,
) {
  const payload = {
    type: identityType,
    async: async,
    number,
    debitAccountNumber,
  };

  const apiUrl = `${baseUrl}/identity/v2`;
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: `Bearer ${accessToken}`,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData: ZeroKYCErrorResponse = { message: 'Verification initiation failed' };
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore if response is not JSON or parsing fails, use default message
      }
      throw new HttpException(
        errorData.message || 'Verification initiation failed',
        response.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return await response.json(); // Assuming successful response is JSON
  } catch (error) {
    if (error instanceof HttpException) {
      throw error; // Re-throw if already an HttpException
    }
    // Catch network errors or other unexpected errors from fetch itself
    throw new HttpException(
      error instanceof Error ? error.message : 'Network error or unexpected issue during verification initiation',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
