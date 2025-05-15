import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrivyService } from './privy.service';
import { KycModule } from '../KYC/kyc.module';
// Import guards and decorators if they exist as providers
// Adjust paths based on actual file locations
import { PrivyAuthGuard } from './guards/privy-auth.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    KycModule,
  ],
  providers: [
    PrivyService,
    // Provide guards for dependency injection
    PrivyAuthGuard,
  ],
  controllers: [],
  exports: [PrivyService, PrivyAuthGuard],
})
export class AuthModule { }
