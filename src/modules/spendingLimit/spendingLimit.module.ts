import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpendingLimit } from './spendingLimit.entity';
import { SpendingLimitController } from './spendingLimit.controller';
import { SetLimitService } from './services/setLimit.service';
import { UserModule } from '../user/user.module';
import { OfframpModule } from '../offramp/offramp.module';
import { ConfigModule } from '@nestjs/config';
import { User } from '../user/entity/user.entity';
import { Offramp } from '../offramp/offramp.entity';
import { FundsLock } from '../Card/entity/fundsLock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpendingLimit, User, Offramp, FundsLock]),
    UserModule,
    OfframpModule,
    ConfigModule,
  ],
  exports: [TypeOrmModule],
  controllers: [SpendingLimitController],
  providers: [SetLimitService],
})
export class SpendingLimitModule { }
