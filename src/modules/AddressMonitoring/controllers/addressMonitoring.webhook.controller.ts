import { Controller, Post, Body, Headers, Res, RawBodyRequest, Req, HttpStatus, Logger, HttpException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Response, Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger'; // To exclude from Swagger if it's an internal webhook
import { extractErrorDetails } from '../../../common/util/error.util'; // Import from new location
import { EntityManager } from 'typeorm'; // Removed Repository as it's used via entityManager now
import { User } from '../../user/entity/user.entity'; // Added User import
import { Transaction } from '../../Transaction/entity/transaction.entity'; // Added Transaction import
import { processDepositSuccessEvent } from '../handler/processDepositSuccess.handler'; // Import the new handler
import { PusherService } from '../../pusher/pusher.service'; // Added PusherService import
import { PrivyService } from '../../auth/privy.service'; // Added PrivyService import


// --- BlockRadar Webhook Specific DTOs/Interfaces ---

// Removed old BlockRadarCurrencyDto as it's replaced by asset object and string currency

export interface BlockRadarAmlScreeningDto {
    provider: string;
    status: string;
    message: string;
}

export interface BlockRadarUserMetadataDto {
    user_id?: number | null; // Made optional and nullable based on new logs
    // Add other potential metadata fields if any
}

export interface BlockRadarAssetDto {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    address: string; // Contract address of the token
    standard?: string | null; // e.g., ERC20 - Reverted to include null for accuracy
    isActive: boolean;
    logoUrl?: string;
    network: string; // e.g., "testnet"
    isNative?: boolean; // Added from new log
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}

export interface BlockRadarAddressConfigurationsAmlDto {
    status: string;
    message: string;
    provider: string;
}

export interface BlockRadarAddressConfigurationsDto {
    aml: BlockRadarAddressConfigurationsAmlDto;
    showPrivateKey?: boolean; // Made optional as not in new log for deposit.address
    disableAutoSweep?: boolean; // Made optional
    enableGaslessWithdraw?: boolean; // Made optional
}

export interface BlockRadarAddressDto {
    id: string;
    address: string;
    name: string; // e.g., "did:privy:cmajl8kib008el40oyzu819kl" - Now primary source for userId
    isActive: boolean;
    type: string; // e.g., "EXTERNAL"
    derivationPath?: string | null;
    metadata?: BlockRadarUserMetadataDto | null; // Contains user_id, made nullable
    configurations: BlockRadarAddressConfigurationsDto;
    network: string; // e.g., "testnet"
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}

export interface BlockRadarBlockchainFullDto { // Renamed from BlockRadarBlockchainDto and expanded
    id: string; // UUID e.g., "85ffc132-3972-4c9e-99a5-5cf0ccb688bf"
    name: string; // e.g., "base"
    symbol: string; // e.g., "eth"
    slug: string; // e.g., "base" - useful for chainType
    derivationPath?: string;
    isEvmCompatible: boolean;
    isL2?: boolean; // Added from new log
    logoUrl?: string;
    isActive: boolean;
    tokenStandard?: string | null; // e.g., "ERC20" - Made optional/nullable
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}

export interface BlockRadarWalletBusinessDto {
    id: string;
    name: string;
    sector: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface BlockRadarWalletConfigurationsWithdrawalGaslessDto {
    isActive: boolean;
    operator: string;
    threshold: number;
}

export interface BlockRadarWalletConfigurationsWithdrawalDto {
    gasless: BlockRadarWalletConfigurationsWithdrawalGaslessDto;
}

export interface BlockRadarWalletConfigurationsAutoSweepingDto {
    isActive: boolean;
    threshold: number;
}
export interface BlockRadarWalletConfigurationsDto {
    withdrawal?: BlockRadarWalletConfigurationsWithdrawalDto;
    autoSweeping?: BlockRadarWalletConfigurationsAutoSweepingDto;
}

export interface BlockRadarWalletDto {
    id: string;
    name: string;
    description?: string;
    address: string;
    derivationPath?: string;
    isActive: boolean;
    status: string;
    network: string;
    configurations?: BlockRadarWalletConfigurationsDto; // Added from new log
    createdAt: string;
    updatedAt: string;
    business?: BlockRadarWalletBusinessDto;
}

export interface BlockRadarDepositSuccessEventDataDto {
    id: string;
    reference: string;
    senderAddress: string;
    recipientAddress: string;
    tokenAddress?: string; // Added from new log
    amount: string; // Keep as string for precision
    amountPaid: string; // Keep as string
    fee: string | null;
    currency: string; // e.g. "USD"
    blockNumber: number;
    blockHash: string;
    hash: string; // Transaction hash
    confirmations: number;
    confirmed: boolean;
    gasPrice?: string;
    gasUsed?: string;
    gasFee?: string;
    status: string; // e.g., "SUCCESS"
    type: string;   // e.g., "DEPOSIT"
    note: string | null;
    amlScreening?: BlockRadarAmlScreeningDto;
    assetSwept?: any | null;
    assetSweptAt?: string | null;
    assetSweptGasFee?: string | null;
    assetSweptHash?: string | null;
    assetSweptSenderAddress?: string | null;
    assetSweptRecipientAddress?: string | null;
    assetSweptAmount?: string | null;
    reason?: string | null;
    network: string; // e.g., "testnet"
    chainId?: number;
    metadata?: BlockRadarUserMetadataDto | null; // Made nullable
    toAmount?: string | null; // Added from new log (present in withdraw, maybe in deposit too)
    rate?: string | null; // Added from new log
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
    asset: BlockRadarAssetDto;
    address: BlockRadarAddressDto; // This contains the target address and its name (potential userId)
    blockchain: BlockRadarBlockchainFullDto;
    wallet?: BlockRadarWalletDto | null; // Made optional/nullable as it might not always be there for deposit
    beneficiary?: any | null;
    paymentLink?: any | null; // Added from new log
    toAsset?: any | null; // Added from new log
    toBlockchain?: any | null; // Added from new log
    toWallet?: any | null; // Added from new log
}

export interface BlockRadarWebhookPayloadDto {
    event: string; // e.g., "deposit.success"
    data: BlockRadarDepositSuccessEventDataDto | any; // Specific for deposit.success, any for others
    // blockchain: BlockRadarBlockchainDto; // Removed: Blockchain info is now inside 'data' object
}
// --- End BlockRadar Webhook DTOs/Interfaces ---

@ApiExcludeController() // Exclude this webhook controller from Swagger UI if it's not meant for public documentation
@Controller('address-monitoring/webhook')
export class AddressMonitoringWebhookController {
    private readonly logger = new Logger(AddressMonitoringWebhookController.name);
    private readonly blockradarApiKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly entityManager: EntityManager, // Injected EntityManager
        private readonly pusherService: PusherService, // Injected PusherService
        private readonly privyService: PrivyService, // Injected PrivyService
    ) {
        this.blockradarApiKey = this.configService.get<string>('WALLET_API_KEY');
        if (!this.blockradarApiKey) {
            this.logger.error('BlockRadar API Key (WALLET_API_KEY) is not configured.');
        }
    }

    @Post('blockradar')
    async handleBlockRadarWebhook(
        @Headers('x-blockradar-signature') signature: string,
        @Req() req: RawBodyRequest<Request>, // Requires rawBody: true in main.ts or specific middleware
        @Res() res: Response,
        @Body() payload: BlockRadarWebhookPayloadDto, // Use the new DTO for the payload
    ) {
        this.logger.log('Received BlockRadar webhook.'); // General log for any incoming webhook

        if (payload.event !== 'deposit.success') {
            // No specific logging for non-deposit.success events, just acknowledge.
            return res.status(HttpStatus.OK).send('Webhook acknowledged.');
        }

        // All subsequent logic is now only for deposit.success events

        if (!this.blockradarApiKey) {
            this.logger.error('Cannot verify BlockRadar webhook (deposit.success): API key is not configured.');
            return res.status(HttpStatus.OK).send('Webhook received (deposit.success), internal configuration error for signature verification.');
        }

        if (!req.rawBody) {
            this.logger.error('Raw body not available for BlockRadar webhook signature verification (deposit.success). Ensure rawBody is enabled in NestJS bootstrap.');
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Webhook received (deposit.success), internal server error prevents signature validation.');
        }

        if (!signature) {
            this.logger.error('CRITICAL: Missing signature for deposit.success event. Acknowledging receipt with 200 OK as requested.');
            return res.status(HttpStatus.OK).send('Webhook received (deposit.success), signature missing.');
        }

        try {
            const hash = crypto
                .createHmac('sha512', this.blockradarApiKey)
                .update(req.rawBody)
                .digest('hex');

            if (hash !== signature) {
                this.logger.warn(`BlockRadar webhook signature mismatch. Event: ${payload.event}, Received: ${signature}, Calculated: ${hash}`);
                this.logger.error('CRITICAL: Signature mismatch for deposit.success event.');
                return res.status(HttpStatus.UNAUTHORIZED).send('Unauthorized: Signature mismatch for deposit.success.');
            }

            this.logger.log('BlockRadar webhook signature verified successfully for deposit.success.');
            this.logger.log('Full BlockRadar webhook payload (deposit.success):', JSON.stringify(payload, null, 2));

            const eventData = payload.data as BlockRadarDepositSuccessEventDataDto;
            this.logger.log({
                message: 'Processing deposit.success event',
                senderAddress: eventData.senderAddress,
                recipientAddress: eventData.recipientAddress,
                amount: eventData.amount,
                hash: eventData.hash,
                name: eventData.address.name,
                status: eventData.status,
                type: eventData.type,
                userId: eventData.address?.name,
                tokenSymbol: eventData.asset.symbol,
                blockchainNetwork: eventData.blockchain.slug,
                chainType: eventData.blockchain.isEvmCompatible ? "ethereum" : "solana",
            });

            if (!eventData.address || !eventData.address.name) {
                this.logger.error('User ID (address.name) missing in BlockRadar deposit.success event data.');
                return res.status(HttpStatus.OK).send('Webhook processed (deposit.success), user identifier missing.');
            }

            if (!eventData.blockchain || !eventData.blockchain.slug || !eventData.network || !eventData.asset || !eventData.asset.symbol) {
                this.logger.error('Essential blockchain or asset information (slug, network, symbol) missing in BlockRadar deposit.success webhook payload.');
                return res.status(HttpStatus.OK).send('Webhook processed (deposit.success), essential blockchain/asset information missing.');
            }

            if (eventData.status === "SUCCESS") {
                // Call the new handler function
                await processDepositSuccessEvent(eventData, this.entityManager);

                // --- Begin Pusher Event Trigger ---
                const userIdForPusher = eventData.address?.name; // This is the Privy User ID
                if (userIdForPusher) {
                    try {
                        const wallets = await this.privyService.getWalletId(userIdForPusher, 'ethereum');
                        if (wallets && wallets.length > 0 && wallets[0].address) {
                            const walletAddress = wallets[0].address;
                            const pusherChannel = `private-${walletAddress}`;
                            const pusherEvent = 'deposit-update';
                            const pusherPayload = {
                                tokenSymbol: eventData.asset.symbol,
                                type: eventData.type,
                                blockchainNetwork: eventData.blockchain.slug,
                                chainType: eventData.blockchain.isEvmCompatible ? "ethereum" : "solana",
                                status: eventData.status,
                                hash: eventData.hash,
                                senderAddress: eventData.senderAddress,
                                recipientAddress: eventData.recipientAddress, // Added recipient address for completeness
                                amount: eventData.amount, // Added amount for completeness
                            };

                            this.logger.log(`Attempting to send Pusher event to channel ${pusherChannel} for event ${pusherEvent}`);
                            await this.pusherService.trigger(pusherChannel, pusherEvent, pusherPayload);
                            this.logger.log(`Pusher event sent successfully to channel ${pusherChannel}.`);
                        } else {
                            this.logger.warn(`Could not send Pusher event for deposit.success: No Ethereum wallet address found in Privy for user ${userIdForPusher}.`);
                        }
                    } catch (privyOrPusherError: any) {
                        // Log errors from PrivyService or PusherService but don't let them break the webhook response
                        this.logger.error(`Error during Privy wallet fetch or Pusher event trigger for deposit.success: ${privyOrPusherError.message}`, privyOrPusherError.stack);
                    }
                } else {
                    this.logger.warn('Could not send Pusher event for deposit.success: User ID (address.name) not available in eventData.');
                }
                // --- End Pusher Event Trigger ---

                // If handler is successful, send OK response
                return res.status(HttpStatus.OK).send('Webhook processed and transaction created (deposit.success).');

            } else {
                this.logger.log(`Deposit event received with non-SUCCESS status: ${eventData.status}. Transaction not created.`);
                return res.status(HttpStatus.OK).send('Webhook processed, non-SUCCESS status for deposit (deposit.success).');
            }
        } catch (error: unknown) {
            const { message: errorMessage, stack: errorStack } = extractErrorDetails(error);
            this.logger.error(`Error during BlockRadar webhook processing (deposit.success): ${errorMessage}`, errorStack);
            if (error instanceof NotFoundException) { // Handle user not found specifically
                return res.status(HttpStatus.NOT_FOUND).send(errorMessage || 'User not found during transaction processing (deposit.success).');
            }
            if (error instanceof UnauthorizedException) {
                return res.status(HttpStatus.UNAUTHORIZED).send(errorMessage || 'Unauthorized (deposit.success)');
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error processing webhook (deposit.success).');
        }
    }
}
