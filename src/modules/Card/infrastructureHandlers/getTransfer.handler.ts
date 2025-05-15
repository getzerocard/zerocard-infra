import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface GetTransferResponse {
  statusCode: number;
  data: {
    queued: boolean;
    _id: string;
    client: string;
    account: string;
    type: string;
    sessionId: string;
    nameEnquiryReference: string;
    paymentReference: string;
    mandateReference: null | string;
    isReversed: boolean;
    reversalReference: null | string;
    provider: string;
    providerChannel: string;
    providerChannelCode: string;
    destinationInstitutionCode: string;
    creditAccountName: string;
    creditAccountNumber: string;
    creditBankVerificationNumber: null | string;
    creditKYCLevel: string;
    debitAccountName: string;
    debitAccountNumber: string;
    debitBankVerificationNumber: null | string;
    debitKYCLevel: string;
    transactionLocation: string;
    narration: string;
    amount: number;
    fees: number;
    vat: number;
    stampDuty: number;
    responseCode: string;
    responseMessage: string;
    status: string;
    isDeleted: boolean;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    __v: number;
  };
}

/**
 * Fetches details of a specific transfer by ID using ZeroCard's API
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param transferId The _id of the transfer from the Fund Transfer endpoint. (Required)
 * @returns Transfer details response data
 */
export async function getTransfer(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  transferId: string,
): Promise<GetTransferResponse> {
  try {
    const response = await axios.get(
      `${zerocardBaseUrl}/accounts/transfers/${transferId}`,
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
      axiosError.response?.data?.message || 'Failed to fetch transfer details',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
