import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PusherController } from './pusher.controller';
import { PusherService } from './pusher.service';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule if AuthGuard or PrivyUser relies on it being explicitly imported here

@Module({
    imports: [
        ConfigModule, // PusherService uses ConfigService
        AuthModule,   // For AuthGuard and PrivyUser decorator context if needed by guards/decorators themselves
    ],
    controllers: [PusherController],
    providers: [PusherService],
    exports: [PusherService], // Export PusherService if you plan to use it in other modules
})
export class PusherModule { }
