import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { PrivyService } from '../../auth/privy.service';

/**
 * Interface for the response from the BlockRadar API
 */
interface WhitelistAddressResponse {
    success: boolean;
    message?: string;
    data?: any;
}

/**
 * Reusable function to whitelist an address using BlockRadar API.
 * It fetches the user's Ethereum address from PrivyService.
 * @param configService - ConfigService instance to access environment variables.
 * @param privyService - PrivyService instance to fetch the user's wallet address.
 * @param userId - The Privy user ID (used as `name` in BlockRadar payload and to fetch wallet).
 * @param retryCount - Number of retries attempted (default: 0).
 * @returns Promise with the outcome of the whitelisting operation.
 */
export async function whitelistAddress(
    configService: ConfigService,
    privyService: PrivyService,
    userId: string,
    retryCount = 0
): Promise<WhitelistAddressResponse> {
    const logger = new Logger('WhitelistAddressHandler');

    if (!userId) {
        logger.error('User ID (Privy ID) is required');
        return { success: false, message: 'User ID (Privy ID) is required' };
    }

    // Get BlockRadar API configurations first
    const walletIdentifier = configService.get<string>('addressMonitoring.WALLET_ID');
    const apiKey = configService.get<string>('addressMonitoring.WALLET_API_KEY');
    const baseUrl = configService.get<string>('addressMonitoring.ADDRESS_MONITORING_BASE_URL');

    if (!walletIdentifier) {
        logger.error('Wallet identifier not found in configuration for BlockRadar API');
        return { success: false, message: 'BlockRadar wallet identifier not configured' };
    }
    if (!apiKey || !baseUrl) {
        logger.error('Missing required environment variables for BlockRadar API (API key or base URL)');
        // Throw an error here as this is a critical configuration issue,
        // rather than returning a success:false which might be misinterpreted as a transient API issue.
        throw new Error('Configuration error: Missing BlockRadar API key or base URL');
    }

    let privyEthereumAddress: string;
    try {
        const wallets = await privyService.getWalletId(userId, 'ethereum');
        if (wallets.length === 0 || !wallets[0] || !wallets[0].address) {
            logger.error(`No Ethereum wallet address found in Privy for user ${userId}`);
            return { success: false, message: 'No Ethereum wallet address found in Privy for user' };
        }
        privyEthereumAddress = wallets[0].address;
        logger.log(`Fetched Ethereum address ${privyEthereumAddress} from Privy for user ${userId}`);
    } catch (error: any) {
        logger.error(`Failed to fetch Ethereum wallet address from Privy for user ${userId}: ${error.message}`);
        return { success: false, message: 'Failed to fetch wallet details from Privy' };
    }

    const url = `${baseUrl}/wallets/${walletIdentifier}/addresses/whitelist`;

    const apiPayload = {
        address: privyEthereumAddress, // Address fetched from PrivyService
        name: userId                   // Privy User ID
    };

    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
    };

    logger.log(`Attempting to whitelist address ${apiPayload.address} (from Privy) for user (Privy ID) ${apiPayload.name} using BlockRadar wallet ${walletIdentifier} (Retry #${retryCount})`);

    try {
        const response = await axios.post<WhitelistAddressResponse>(url, apiPayload, { headers });
        logger.log(`BlockRadar API Response Status: ${response.status}`);

        if (response.status === 200 || response.data.success) {
            logger.log(`Successfully whitelisted address ${apiPayload.address} for user ${apiPayload.name}`);
            return { success: true, data: response.data };
        } else if (response.status === 400 && response.data.message?.includes('already whitelisted')) {
            logger.log(`Address ${apiPayload.address} already whitelisted for user ${apiPayload.name}, treating as success`);
            return { success: true, message: 'Address already whitelisted' };
        } else if (response.status >= 500 && retryCount < 1) {
            logger.warn(`Server error ${response.status} for BlockRadar API, retrying...`);
            return whitelistAddress(configService, privyService, userId, retryCount + 1);
        } else {
            logger.error(`BlockRadar API failed with status ${response.status}: ${response.data.message || 'Unknown error'}`);
            return { success: false, message: response.data.message || 'Failed to whitelist address via BlockRadar' };
        }
    } catch (error: any) {
        logger.error(`Error whitelisting address ${apiPayload.address} for user ${apiPayload.name} (Retry #${retryCount}): ${error.message}`);
        if (error.response) {
            logger.error(`BlockRadar API Response Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
            if (error.response.status >= 500 && retryCount < 1) {
                logger.warn('BlockRadar API server error, retrying...');
                return whitelistAddress(configService, privyService, userId, retryCount + 1);
            } else if (error.response.status === 400 && error.response.data?.message?.includes('already whitelisted')) {
                logger.log(`Address ${apiPayload.address} already whitelisted (caught in error block), treating as success`);
                return { success: true, message: 'Address already whitelisted' };
            }
        }
        return { success: false, message: error.message || 'Network or unknown error occurred with BlockRadar API' };
    }
}
