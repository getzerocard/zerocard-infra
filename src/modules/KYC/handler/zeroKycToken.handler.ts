import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Interface defining the parameters required for ZeroKYC token request.
 */
export interface ZeroKycTokenParams {
  baseUrl: string;
  clientId: string;
  clientAssertion: string;
}

/**
 * Obtains an OAuth2 token from the ZeroKYC API.
 * @param params - The parameters for the token request including base URL, client ID, and client assertion.
 * @returns Promise resolving to the access_token string.
 * @throws HttpException if the token request fails.
 */
export async function getZeroKycToken(
  params: ZeroKycTokenParams,
): Promise<string> {
  const url = `${params.baseUrl}/oauth2/token`;
  const data = {
    grant_type: 'client_credentials',
    client_assertion_type:
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_id: params.clientId,
    client_assertion: params.clientAssertion,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new HttpException(
        `Failed to obtain token: ${response.statusText}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await response.json();
    if (!result.access_token) {
      throw new HttpException(
        'Access token not found in response',
        HttpStatus.BAD_REQUEST,
      );
    }
    return result.access_token;
  } catch (error) {
    throw new HttpException(
      `Error obtaining token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
