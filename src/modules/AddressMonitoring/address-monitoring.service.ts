import { Injectable, Logger, InternalServerErrorException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyService } from 'src/modules/auth/privy.service'; // Adjusted path
import type { AddressWhitelistedResponseDto } from './dto/address-monitoring.dto';
import { WhitelistAddressDto } from './dto/address-monitoring.dto';
import { callBlockRadarWhitelistApi } from './handler/adressWhitelist.handler'; // Restore import for the actual exported function


// Helper function to extract error details (can be moved to a common util if used elsewhere, specific to non-HttpException errors)
function extractErrorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error && !(error instanceof HttpException)) {
        return { message: error.message, stack: error.stack };
    }
    if (error instanceof HttpException) {
        return { message: error.message, stack: error.stack }; // Or handle HttpExceptions differently if needed
    }
    return { message: 'An unknown error occurred while processing the request.', stack: undefined };
}

@Injectable()
export class AddressMonitoringService {
    private readonly logger = new Logger(AddressMonitoringService.name);
    private readonly addressmonitoringApiKey: string;
    private readonly addressmonitoringWalletId: string; // Assuming this is a general wallet ID for the API path
    private readonly addressmonitoringBaseUrl: string; // Added for base URL

    constructor(
        private readonly privyService: PrivyService,
        private readonly configService: ConfigService,
    ) {
        this.addressmonitoringApiKey = this.configService.get<string>('addressMonitoring.WALLET_API_KEY');
        this.addressmonitoringWalletId = this.configService.get<string>('addressMonitoring.WALLET_ID');
        this.addressmonitoringBaseUrl = this.configService.get<string>('addressMonitoring.ADDRESS_MONITORING_BASE_URL');

        if (!this.addressmonitoringApiKey || !this.addressmonitoringWalletId || !this.addressmonitoringBaseUrl) {
            this.logger.error('AddressMonitoring configuration (API Key, Wallet ID, or Base URL) is missing. Please check environment variables and config files.');
            throw new InternalServerErrorException('AddressMonitoring configuration is critically missing.');
        }
    }

    /**
     * Whitelists a user's wallet address on addressmonitoring.
     * @param userId - The ID of the user whose address is to be whitelisted.
     * @param chainType - The blockchain type ('ethereum' or 'solana').
     * @returns The structured success response or throws an error.
     */
    async whitelistUserAddress(
        userId: string,
        chainType: 'ethereum' | 'solana',
    ): Promise<AddressWhitelistedResponseDto> {
        this.logger.log(
            `Service: Starting address whitelist for userId: ${userId}, chainType: ${chainType}`,
        );

        let privyWallets;
        try {
            privyWallets = await this.privyService.getWalletId(userId, chainType);
        } catch (error: unknown) {
            const { message: errorMessage, stack: errorStack } = extractErrorDetails(error);
            this.logger.error(
                `Service: Error fetching wallet ID from Privy for userId ${userId}: ${errorMessage}`,
                errorStack,
            );
            throw new InternalServerErrorException('Failed to fetch wallet details from Privy.');
        }

        if (!privyWallets || privyWallets.length === 0) {
            this.logger.warn(`Service: No ${chainType} wallet found for userId ${userId} in Privy.`);
            throw new NotFoundException(`No ${chainType} wallet found for user ${userId}. Please ensure the user has a linked ${chainType} wallet.`);
        }

        const walletAddressToWhitelist = privyWallets[0].address;
        if (!walletAddressToWhitelist) {
            this.logger.error(`Service: Found wallet for userId ${userId} on chain ${chainType}, but address is missing.`);
            throw new InternalServerErrorException(`Wallet address is missing for user ${userId} on chain ${chainType}.`);
        }

        this.logger.debug(`Service: Wallet address to whitelist for userId ${userId}: ${walletAddressToWhitelist}`);

        // Construct the payload as WhitelistAddressDto
        const payload: WhitelistAddressDto = {
            address: walletAddressToWhitelist,
            network: chainType === 'ethereum' ? 'ethereum' : 'solana',
            name: `User-${userId}`,
        };

        try {
            const result = await callBlockRadarWhitelistApi(
                this.addressmonitoringApiKey,
                this.addressmonitoringWalletId,
                this.addressmonitoringBaseUrl,
                payload
            );

            this.logger.log(
                `Service: Successfully whitelisted address ${walletAddressToWhitelist} for userId ${userId} via handler.`,
            );

            return {
                userId: userId,
                walletAddress: result.walletAddress,
                whitelisted: result.whitelisted
            };
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                this.logger.error(
                    `Service: Error from addressmonitoring handler for userId ${userId}: ${error.message} (Status: ${error.getStatus()})`,
                    error.stack,
                );
                throw error;
            }

            const { message: errorMessage, stack: errorStack } = extractErrorDetails(error);
            this.logger.error(
                `Service: Unexpected error during addressmonitoring whitelist process for userId ${userId}: ${errorMessage}`,
                errorStack,
            );
            throw new InternalServerErrorException('An unexpected error occurred during the whitelist process.');
        }
    }
}
