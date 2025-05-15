import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface UpdateCardResponse {
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
    dummyAccount: {
      currency: string;
      bankCode: string;
      accountType: string;
      accountNumber: string;
    };
    is2FAEnrolled: boolean;
    updatedAt: string;
  };
}

/**
 * Updates details of a specific card using ZeroCard's API
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param cardId The unique identifier of the card to update
 * @param cardData The card data to be updated
 * @returns Updated card details response data
 */
export async function updateCard(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  cardId: string,
  cardData: {
    status: string;
    spendingControls: {
      channels: {
        mobile: boolean;
        web: boolean;
        pos: boolean;
        atm: boolean;
      };
      blockedCategories: string[];
      allowedCategories: string[];
      spendingLimits: Array<{
        interval: string;
        amount: number;
      }>;
    };
  },
): Promise<UpdateCardResponse> {
  try {
    const response = await axios.put(
      `${zerocardBaseUrl}/cards/${cardId}`,
      cardData,
      {
        headers: {
          Authorization: zerocardAuthToken,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    throw new HttpException(
      axiosError.response?.data?.message || 'Failed to update card details',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
