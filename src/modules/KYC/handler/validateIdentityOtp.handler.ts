import { HttpException, HttpStatus } from '@nestjs/common';

interface ZeroKYCErrorResponse {
  message: string;
}

type IdentityType = 'BVN' | 'NIN';

interface ValidateOtpResponse {
  // We'll extend this interface once we know the actual response structure
  [key: string]: any;
}

/**
 * Validates the OTP for identity verification using fetch
 * @param baseUrl The base URL for the ZeroKYC API
 * @param accessToken The Bearer token for authentication
 * @param identityType The type of identity document being verified (BVN)
 * @param identityId The identity ID received from initiateVerification
 * @param otp The OTP to validate
 * @returns Validation response data
 */
export async function validateIdentityOtp(
  baseUrl: string,
  accessToken: string,
  identityType: IdentityType,
  identityId: string,
  otp: string,
): Promise<ValidateOtpResponse> {
  const payload = {
    type: identityType,
    identityId,
    otp,
  };

  const apiUrl = `${baseUrl}/identity/v2/validate`;
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
      let errorData: ZeroKYCErrorResponse = { message: 'OTP validation failed' };
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore if response is not JSON or parsing fails
      }
      throw new HttpException(
        errorData.message || 'OTP validation failed',
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
      error instanceof Error ? error.message : 'Network error or unexpected issue during OTP validation',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
