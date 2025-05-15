import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationModule } from './common/notification/notification.module';
import { OfframpModule } from './modules/offramp/offramp.module';
import { CardModule } from './modules/Card/card.module';
import { KycModule } from './modules/KYC/kyc.module';
import { SpendingLimitModule } from './modules/spendingLimit/spendingLimit.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { TransactionModule } from './modules/Transaction/transaction.module';
import { ShipmentModule } from './modules/shipment/shipment.module';
import { AddressMonitoringModule } from './modules/AddressMonitoring/address-monitoring.module';
import { AppController } from './app.controller';
import { HealthCheckService } from './healthcheck.service';
import config from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [() => config],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('db.url');
        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL is not defined in environment variables',
          );
        }
        return {
          type: 'postgres',
          url: databaseUrl,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('env') !== 'production',
          ssl: {
            rejectUnauthorized: false,
          },
          logging: configService.get('env') === 'development',
        };
      },
    }),
    UserModule,
    AuthModule,
    NotificationModule,
    OfframpModule,
    CardModule,
    KycModule,
    SpendingLimitModule,
    WithdrawalModule,
    TransactionModule,
    ShipmentModule,
    AddressMonitoringModule,
  ],
  controllers: [AppController],
  providers: [HealthCheckService],
  //TODO: remove todo latter
})
export class AppModule { }
