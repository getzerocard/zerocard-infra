import { Logger } from '@nestjs/common';
import fetch from 'node-fetch';

/**
 * Verifies an account name using the Paycrest API.
 * @param institution - The institution code (e.g., 'KUDANGPC')
 * @param accountIdentifier - The account number to verify
 * @returns Promise<string> - The verified account name
 * @throws Error if the verification fails
 */
export async function verifyAccountName(
  institution: string,
  accountIdentifier: string,
): Promise<string> {
  const logger = new Logger('AccountVerification');
  const url = 'https://api.paycrest.io/v1/verify-account';
  const body = {
    institution,
    accountIdentifier,
  };

  try {
    logger.log(`Verifying account with identifier: ${accountIdentifier}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 'success' && data.data) {
      logger.log(`Account name fetched successfully for ${accountIdentifier}`);
      return data.data;
    } else {
      throw new Error(
        `Verification failed: ${data.message || 'Unknown error'}`,
      );
    }
  } catch (error) {
    logger.error(`Error verifying account: ${(error as Error).message}`);
    throw error;
  }
}
