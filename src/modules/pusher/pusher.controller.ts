import { Body, Post, Res, HttpStatus, Logger, InternalServerErrorException, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { PusherService } from './pusher.service';
import { PusherUserAuthRequestDto, type PusherAuthUser } from './dto/pusher.dto';
import { PrivyUser } from '../auth/decorators/privy-user.decorator';
import type { PrivyUserData } from '../auth/interfaces/privy-user.interface';
import { ApiController } from '../../common/decorators/api-controller.decorator';

@ApiController('pusher', 'Pusher')
export class PusherController {
    private readonly logger = new Logger(PusherController.name);

    constructor(private readonly pusherService: PusherService) { }

    @Post('user-auth')
    @ApiOperation({ summary: 'Authenticate a user for Pusher user channels' })
    @ApiBody({ type: PusherUserAuthRequestDto })
    @ApiResponse({ status: 200, description: 'Pusher user authentication successful.' })
    @ApiResponse({ status: 400, description: 'Bad Request (e.g., missing socket_id).' })
    @ApiResponse({ status: 401, description: 'Unauthorized (application auth failed).' })
    @ApiResponse({ status: 500, description: 'Internal server error during Pusher auth.' })
    async authenticatePusherUser(
        @Body(new ValidationPipe()) body: PusherUserAuthRequestDto,
        @PrivyUser() privyUser: PrivyUserData,
        @Res() res: Response,
    ) {
        this.logger.log(`Attempting Pusher user authentication for socket_id: ${body.socket_id} and user: ${privyUser.userId}`);

        if (!privyUser || !privyUser.userId) {
            this.logger.warn('Pusher auth called by an unauthenticated or invalid application user.');
            // AuthGuard should prevent this, but as a safeguard:
            return res.status(HttpStatus.UNAUTHORIZED).json({
                statusCode: HttpStatus.UNAUTHORIZED,
                success: false,
                message: 'Application user authentication failed.',
            });
        }

        // Construct the user data for Pusher.authenticateUser
        // The `id` for Pusher MUST be the privyUser.userId
        const pusherUserData: PusherAuthUser = {
            id: privyUser.userId, // Crucial: This is the user ID Pusher will use
            // user_info: { // Optional: Add more info if your client-side expects it for presence or other features
            //   name: privyUser.username || privyUser.email, // Example, adjust as needed
            //   email: privyUser.email,
            // },
        };

        try {
            const authResponse = this.pusherService.authenticateUser(body.socket_id, pusherUserData);
            return res.status(HttpStatus.OK).json(authResponse);
        } catch (error: any) {
            this.logger.error(`Pusher user authentication process failed in controller: ${error.message}`, error.stack);
            // The service might throw its own errors, or Pusher client might throw.
            throw new InternalServerErrorException(
                error.message || 'An error occurred during Pusher user authentication.'
            );
        }
    }
}
