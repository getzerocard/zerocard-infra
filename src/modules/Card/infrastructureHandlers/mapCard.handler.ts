import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface MapCardResponse {
  statusCode: number;
  message: string;
  data: {
    business: string;
    customer: string;
    account: string;
    fundingSource: string;
    type: string;
    brand: string;
    currency: string;
    maskedPan: string;
    expiryMonth: string;
    expiryYear: string;
    metadata: {
      user_id: string;
    };
    status: string;
    spendingControls: {
      channels: {
        atm: boolean;
        pos: boolean;
        web: boolean;
        mobile: boolean;
      };
      allowedCategories: string[];
      blockedCategories: string[];
      spendingLimits: Array<{
        amount: number;
        interval: string;
        categories: string[];
      }>;
    };
    is2FAEnrolled: boolean;
    isDigitalized: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    _id: string;
    __v: number;
  };
}

/**
 * Maps a card to a specific customer using ZeroCard's API
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param cardData The card data to be sent in the request body
 * @returns Card mapping response data
 */
export async function mapCard(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  cardData: {
    type: string;
    currency: string;
    status: string;
    issuerCountry: string;
    spendingControls: {
      channels: {
        mobile: boolean;
        atm: boolean;
        pos: boolean;
        web: boolean;
      };
      allowedCategories: string[];
      blockedCategories: string[];
      spendingLimits: Array<{
        interval: string;
        amount: number;
      }>;
    };
    sendPINSMS: boolean;
    customerId: string;
    brand: string;
    expirationDate?: string;
    metadata: {
      user_id: string;
    };
    number: string;
  },
): Promise<MapCardResponse> {
  try {
    const response = await axios.post(`${zerocardBaseUrl}/cards`, cardData, {
      headers: {
        Authorization: zerocardAuthToken,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message || 'Failed to map card',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
