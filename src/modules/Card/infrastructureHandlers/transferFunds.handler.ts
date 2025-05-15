import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

interface ApiErrorResponse {
  message: string;
}

interface TransferFundsResponse {
  statusCode: number;
  message: string;
  data: {
    _id: string;
    business: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    narration: string;
    paymentReference: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
}

/**
 * Initiates a transfer of funds between accounts using ZeroCard's API
 * @param zerocardBaseUrl The base URL for the ZeroCard API
 * @param zerocardAuthToken The authentication token for ZeroCard API
 * @param transferData The data for the transfer operation
 * @param transferData.debitAccountId The _id of the account/wallet to debit the funds from. (Required)
 * @param transferData.amount The amount to be transferred. (Required)
 * @param transferData.creditAccountId The _id of the account/wallet to receive the funds. (Required if beneficiaryBankCode and beneficiaryAccountNumber are not present)
 * @param transferData.beneficiaryBankCode The bank code of the beneficiary account. (Required if creditAccountId is not present)
 * @param transferData.beneficiaryAccountNumber The account number of the beneficiary account. (Required if creditAccountId is not present)
 * @param transferData.narration The narration of the transfer.
 * @param transferData.paymentReference A payment reference can be provided to be attached to the transfer.
 * @returns Transfer operation response data
 */
export async function transferFunds(
  zerocardBaseUrl: string,
  zerocardAuthToken: string,
  transferData: {
    debitAccountId: string;
    amount: number;
    creditAccountId?: string;
    beneficiaryBankCode?: string;
    beneficiaryAccountNumber?: string;
    narration?: string;
    paymentReference?: string;
  },
): Promise<TransferFundsResponse> {
  try {
    const response = await axios.post(
      `${zerocardBaseUrl}/accounts/transfer`,
      transferData,
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
      axiosError.response?.data?.message || 'Failed to initiate transfer',
      axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
