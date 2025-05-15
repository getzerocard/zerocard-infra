import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailHandlerService } from './email.handler.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailHandlerService],
  exports: [EmailService, EmailHandlerService],
})
export class NotificationModule {}
