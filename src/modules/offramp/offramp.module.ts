import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfframpService } from './offramp.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../user/entity/user.entity';

@Module({
  imports: [ConfigModule, AuthModule, TypeOrmModule.forFeature([User])],
  providers: [OfframpService],
  exports: [OfframpService],
})
export class OfframpModule {}
