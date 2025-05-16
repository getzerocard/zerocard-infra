import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Pusher from 'pusher';
import type { PusherAuthUser } from './dto/pusher.dto';

@Injectable()
export class PusherService {
    private pusher: Pusher;
    private readonly logger = new Logger(PusherService.name);

    constructor(private readonly configService: ConfigService) {
        const appId = this.configService.get<string>('pusher.appId');
        const key = this.configService.get<string>('pusher.key');
        const secret = this.configService.get<string>('pusher.secret');
        const cluster = this.configService.get<string>('pusher.cluster');
        const useTLS = this.configService.get<boolean>('pusher.useTLS', true); // Default to true

        if (!appId || !key || !secret || !cluster) {
            this.logger.error(
                'Pusher configuration is incomplete. Please check PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER in .env',
            );
            // Depending on strictness, you might throw an error here to prevent app startup
            // For now, it will log an error, and Pusher calls will likely fail.
        } else {
            this.pusher = new Pusher({
                appId,
                key,
                secret,
                cluster,
                useTLS,
            });
            this.logger.log('Pusher client initialized.');
        }
    }

    /**
     * Authenticates a user for Pusher user authentication.
     * @param socketId The socket ID from the client.
     * @param userData The user data, must include an `id` field.
     * @returns The authentication response from Pusher.
     */
    authenticateUser(socketId: string, userData: PusherAuthUser): any {
        if (!this.pusher) {
            this.logger.error('Pusher client not initialized due to missing configuration.');
            throw new Error('Pusher service not available due to configuration errors.');
        }
        try {
            this.logger.debug(`Authenticating user for Pusher. Socket ID: ${socketId}, User ID: ${userData.id}`);
            const authResponse = this.pusher.authenticateUser(socketId, userData);
            this.logger.debug('Pusher user authentication successful.');
            return authResponse;
        } catch (error: any) {
            this.logger.error(`Pusher user authentication failed: ${error.message}`, error.stack);
            throw error; // Re-throw the error to be handled by the controller
        }
    }

    // You can add other Pusher methods here, like trigger, authorizeChannel etc.
    // For example, a generic trigger method:
    async trigger(channel: string, event: string, data: any): Promise<any> {
        if (!this.pusher) {
            this.logger.error('Pusher client not initialized due to missing configuration.');
            // We should not throw here, as it might break critical flows if Pusher is optional
            // Instead, log the error and return a value indicating failure or skip.
            // For now, returning undefined, but a more specific error object could be used.
            return undefined;
        }
        try {
            this.logger.debug(`Triggering Pusher event. Channel: ${channel}, Event: ${event}`);
            const response = await this.pusher.trigger(channel, event, data);
            this.logger.debug('Pusher event triggered successfully.');
            return response;
        } catch (error: any) {
            this.logger.error(`Failed to trigger Pusher event on channel ${channel}, event ${event}: ${error.message}`, error.stack);
            // Re-throwing might be too disruptive for a notification.
            // Consider returning an error object or a specific status.
            // For now, re-throwing to make it visible, but this might need adjustment based on desired behavior.
            throw error;
        }
    }
}
