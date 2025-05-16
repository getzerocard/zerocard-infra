import { IsNotEmpty, IsString } from 'class-validator';

export class PusherUserAuthRequestDto {
    @IsString()
    @IsNotEmpty()
    socket_id: string;
}

// This interface defines the structure Pusher expects for user data in authenticateUser
export interface PusherAuthUser {
    id: string; // Unique ID for the user
    user_info?: Record<string, any>; // Optional: additional user information
    // You can add other Pusher-specific fields like watchlist if needed
    // watchlist?: string[];
}
