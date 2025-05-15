import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm'; // Uncomment if you use TypeORM entities
import { AddressMonitoringWebhookController } from './controllers/addressMonitoring.webhook.controller';
import { AddressMonitoringService } from './address-monitoring.service';
import { AuthModule } from 'src/modules/auth/auth.module'; // Adjusted path

@Module({
    imports: [
        ConfigModule,
        AuthModule, // Import AuthModule to make PrivyService available for injection
        // TypeOrmModule.forFeature([/* Related Entities */]),
    ],
    controllers: [
        AddressMonitoringWebhookController,
        // If you create other controllers, add them here
    ],
    providers: [
        AddressMonitoringService,
    ],
    exports: [
        AddressMonitoringService, // Export if needed by other modules
    ],
})
export class AddressMonitoringModule { }
