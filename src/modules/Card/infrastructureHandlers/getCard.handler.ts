import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface GetCardResponse {
  statusCode: number;
  message: string;
  data: {
    _id: string;
    business: string;
    customer: {
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
        documents: Record<string, any>;
      };
      billingAddress: {
        line1: string;
        line2: string;
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
    account: {
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
    fundingSource: {
      _id: string;
      business: string;
      type: string;
      status: string;
      jitGateway: null | string;
      isDefault: boolean;
      isDeleted: boolean;
      createdAt: string;
      updatedAt: string;
      __v: number;
    };
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
    __v: number;
  };
}

/**
 * Fetches details of a specific card using ZeroCard's API
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param cardId The unique identifier of the card to fetch
 * @returns Card details response data
 */
export async function getCard(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  cardId: string,
): Promise<GetCardResponse> {
  try {
    const response = await axios.get(`${zerocardBaseUrl}/cards/${cardId}`, {
      headers: {
        Authorization: zerocardAuthToken,
        accept: 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message || 'Failed to fetch card details',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
