import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => UserModule)],
  providers: [KycService],
  exports: [KycService],
  controllers: [KycController],
})
export class KycModule {}
