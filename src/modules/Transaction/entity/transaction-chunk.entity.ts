import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { SpendingLimit } from '../../spendingLimit/spendingLimit.entity'; // Adjust path if needed

@Entity()
export class TransactionChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Transaction, (txn) => txn.chunks)
  transaction: Transaction;

  @ManyToOne(() => SpendingLimit, (limit) => limit.transactionChunks)
  spendingLimit: SpendingLimit; // The spending limit from which this chunk was taken

  @Column('decimal', { precision: 10, scale: 2 })
  nairaUsed: number; // Amount of Naira used from this spending limit

  @Column('decimal', { precision: 10, scale: 2 })
  usdEquivalent: number; // USD equivalent (nairaUsed / fxRate)

  @CreateDateColumn()
  createdAt: Date;
}
