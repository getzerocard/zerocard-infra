import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../user/entity/user.entity';
import { FundsLock } from '../Card/entity/fundsLock.entity';
import { Withdrawal } from './entity/withdrawal.entity';
import { Transaction } from '../Transaction/entity/transaction.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User, FundsLock, Withdrawal, Transaction])],
  controllers: [WithdrawalController],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule { }
