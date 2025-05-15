import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionWebhookController } from './controllers/transaction.webhook.controller';
import { ProcessTransactionService } from './services/processSpendingTransaction.service';
import { TransactionRetrievalService } from './services/transactionRetrieval.service';
import { Transaction } from './entity/transaction.entity';
import { SpendingLimit } from '../spendingLimit/spendingLimit.entity';
import { User } from '../user/entity/user.entity';
import { TransactionController } from './controllers/transaction.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, SpendingLimit, User])],
  controllers: [TransactionWebhookController, TransactionController],
  providers: [ProcessTransactionService, TransactionRetrievalService],
  exports: [TransactionRetrievalService],
})
export class TransactionModule { }
