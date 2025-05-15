import { HttpException, HttpStatus } from '@nestjs/common';
import type { AxiosError } from 'axios';
import axios from 'axios';

/**
 * Interface for the expected error response from the card provider API
 * when fetching a card token fails.
 */
interface ApiErrorResponse {
    message: string;
    // statusCode?: number; // Depending on actual error structure
    // data?: any;
}

/**
 * Interface for the 'data' field in a successful card token response.
 */
interface GetCardTokenData {
    token: string;
}

/**
 * Interface for the expected successful response structure when fetching a card token.
 */
interface GetCardTokenApiResponse {
    statusCode: number;
    message: string;
    data: GetCardTokenData;
}

/**
 * Fetches a token for a specific card securely from ZeroCard's API.
 * This token can be used for operations that require card-specific authentication.
 *
 * @param zerocardBaseUrl The base URL for the ZeroCard API.
 * @param zerocardAuthToken The authentication token for ZeroCard API.
 * @param cardId The unique identifier of the card for which to fetch the token.
 * @returns A promise that resolves to the card token response data.
 * @throws {HttpException} If the API request fails or returns an error.
 */
export async function getCardToken(
    zerocardBaseUrl: string,
    zerocardAuthToken: string,
    cardId: string,
): Promise<GetCardTokenApiResponse> {
    if (!zerocardBaseUrl || !zerocardAuthToken || !cardId) {
        throw new HttpException(
            'Missing required parameters: zerocardBaseUrl, zerocardAuthToken, and cardId must be provided.',
            HttpStatus.BAD_REQUEST,
        );
    }

    const url = `${zerocardBaseUrl}/cards/${cardId}/token`;

    try {
        const response = await axios.get<GetCardTokenApiResponse>(url, {
            headers: {
                Authorization: zerocardAuthToken,
                accept: 'application/json',
            },
            timeout: 10000, // Optional: 10-second timeout
        });

        // It's good practice to validate if response.data matches the expected structure,
        // though axios with generics provides some level of type safety.
        if (
            !response.data ||
            typeof response.data.statusCode !== 'number' ||
            typeof response.data.message !== 'string' ||
            !response.data.data ||
            typeof response.data.data.token !== 'string'
        ) {
            // Log the unexpected response structure for debugging
            // console.error('Unexpected response structure from getCardToken API:', response.data);
            throw new HttpException(
                'Received an invalid response structure from the card token service.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        // Log the detailed error for server-side inspection
        // console.error(`Error fetching card token for cardId ${cardId}:`, axiosError.response?.data || axiosError.message);

        const errorMessage =
            axiosError.response?.data?.message || 'Failed to fetch card token.';
        const errorStatus =
            axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;

        throw new HttpException(errorMessage, errorStatus);
    }
}
