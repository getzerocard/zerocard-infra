import { Logger } from '@nestjs/common';
import type { WhitelistAddressDto } from '../dto/address-monitoring.dto';
import fetch from 'node-fetch';

// Define the structure for the handler's successful outcome
interface HandlerWhitelistOutcome {
    walletAddress: string;
    whitelisted: boolean;
    name?: string;      // From payload, can be undefined
    network: string;    // From payload
}

const logger = new Logger('CallBlockRadarWhitelistApi');

/**
 * Calls the BlockRadar API to whitelist an address, with retry for 500 errors
 * and special handling for "Address already whitelisted".
 *
 * @param apiUrl - The full URL for the BlockRadar whitelist endpoint.
 * @param apiKey - The BlockRadar API key.
 * @param address - The wallet address to whitelist.
 * @param name - The name to associate with the whitelisted address (e.g., userId).
 * @returns The data from the BlockRadar API response on success or a representation for "already whitelisted".
 * @throws HttpException if the API call fails after retries or for unhandled errors.
 */
export async function callBlockRadarWhitelistApi(
    apiKey: string,
    walletId: string,
    baseUrl: string,
    payload: WhitelistAddressDto,
    retryCount = 0,
): Promise<HandlerWhitelistOutcome> {
    const url = `${baseUrl}/wallets/${walletId}/whitelist`;
    logger.log(
        `Attempting to whitelist address. URL: ${url}, Payload: ${JSON.stringify(payload)}, Retry: ${retryCount}`,
    );

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            // Even if API returns more data, we only care that it was successful
            await response.json(); // Consume the JSON body to prevent issues
            logger.log(
                `Successfully whitelisted address ${payload.address} via API.`,
            );
            return {
                walletAddress: payload.address,
                whitelisted: true,
                name: payload.name,
                network: payload.network,
            };
        }

        let errorBody: any;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = { message: response.statusText || 'Failed to parse error response' };
        }

        logger.warn(
            `API call to ${url} failed with status: ${response.status}, Body: ${JSON.stringify(errorBody)}`,
        );

        if (response.status === 400) {
            const errorMessage = (errorBody?.message || errorBody?.errors?.[0]?.message || '').toLowerCase();
            if (errorMessage.includes('address already whitelisted') || errorMessage.includes('address is already on the whitelist')) {
                logger.log(
                    `Address ${payload.address} is already whitelisted. Treating as success.`,
                );
                return {
                    walletAddress: payload.address,
                    whitelisted: true,
                    name: payload.name,
                    network: payload.network,
                };
            }
        }

        if (response.status >= 500 && response.status < 600 && retryCount < 1) {
            logger.warn(
                `Received ${response.status} error. Retrying in 1 second... (Attempt ${retryCount + 1})`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return callBlockRadarWhitelistApi(
                apiKey,
                walletId,
                baseUrl,
                payload,
                retryCount + 1,
            );
        }

        // For any other error, throw
        const error = new Error(
            `Failed to whitelist address. Status: ${response.status}. Message: ${JSON.stringify(errorBody)}`,
        );
        (error as any).status = response.status;
        (error as any).responseBody = errorBody;
        throw error;

    } catch (error: any) {
        if (!error.status) { // Indicates an error not constructed by our API response handling logic
            logger.error(
                `Network or unexpected error in callBlockRadarWhitelistApi: ${error.message}`,
                error.stack,
            );
            const newError = new Error(`Network or unexpected error in callBlockRadarWhitelistApi: ${error.message}`);
            (newError as any).status = 503; // Service Unavailable or a generic client-side error
            (newError as any).originalError = error;
            throw newError;
        }
        // Rethrow errors that were already processed (e.g. non-200, non-400-whitelisted, non-500-retry)
        throw error;
    }
}
