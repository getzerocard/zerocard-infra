import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressMonitoringWebhookController } from './controllers/addressMonitoring.webhook.controller';
import { User } from '../user/entity/user.entity';
import { Transaction } from '../Transaction/entity/transaction.entity';
import { PusherModule } from '../pusher/pusher.module';

@Module({
    imports: [
        ConfigModule, // For ConfigService used in the controller
        TypeOrmModule.forFeature([User, Transaction]), // For EntityManager to be aware of these entities
        PusherModule,
    ],
    controllers: [AddressMonitoringWebhookController],
    providers: [], // No new providers in this module itself for now
})
export class AddressMonitoringModule { }
