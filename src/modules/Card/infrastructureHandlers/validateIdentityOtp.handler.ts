import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ZeroKYCErrorResponse {
  message: string;
}

type IdentityType = 'BVN';

interface ValidateOtpResponse {
  // We'll extend this interface once we know the actual response structure
  [key: string]: any;
}

/**
 * Validates the OTP for identity verification
 * @param baseUrl The base URL for the ZeroKYC API
 * @param clientId The client ID for authentication
 * @param identityType The type of identity document being verified (BVN)
 * @param identityId The identity ID received from initiateVerification
 * @param otp The OTP to validate
 * @returns Validation response data
 */
export async function validateIdentityOtp(
  baseUrl: string,
  clientId: string,
  identityType: IdentityType,
  identityId: string,
  otp: string,
): Promise<ValidateOtpResponse> {
  try {
    const response = await axios.post(
      `${baseUrl}/identity/v2/validate`,
      {
        type: identityType,
        identityId,
        otp,
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
      axiosError.response?.data?.message || 'OTP validation failed',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
