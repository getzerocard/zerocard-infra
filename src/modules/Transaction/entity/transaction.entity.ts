import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { TransactionChunk } from './transaction-chunk.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user: User;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    default: 0.0,
  })
  nairaAmount: number; // Transaction amount in Naira

  @Column({
    type: 'enum',
    enum: ['spending', 'withdrawal', 'deposit'],
  })
  type: 'spending' | 'withdrawal' | 'deposit'; // e.g., 'spending', 'withdrawal'

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'refund', 'failed'],
  })
  status: 'pending' | 'completed' | 'refund' | 'failed'; // e.g., 'pending', 'completed', 'refund'

  @Column({ nullable: true })
  cardId: string; // Card identifier used for the transaction

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    default: 0.0,
  })
  usdAmount: number; // Total amount in USD

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    default: 0.0,
  })
  effectiveFxRate: number; // Effective exchange rate for the transaction

  @Column()
  transactionReference: string; // Unique reference for the transaction

  @Column()
  merchantName: string; // Name of the merchant

  @Column()
  merchantId: string; // Merchant identifier

  @Column({ nullable: true })
  recipientAddress: string; // Recipient address for withdrawals or transfers

  @Column({ nullable: true })
  toAddress: string; // To address for withdrawals or transfers

  @Column({ nullable: true })
  transactionHash: string; // Transaction hash for blockchain transactions

  @Column({ nullable: true })
  state: string; // State where the transaction occurred

  @Column({ nullable: true })
  city: string; // City where the transaction occurred

  @Column()
  authorizationId: string; // Authorization ID for the transaction

  @Column()
  category: string; // Category of the merchant

  @Column()
  channel: string; // Channel through which the transaction was made

  @Column()
  transactionModeType: string; // Type of transaction mode

  @Column({ type: 'jsonb', nullable: true })
  tokenInfo: { chain: string; blockchain: string; token: string }[];

  // Establish the one-to-many relationship with cascade option
  @OneToMany(() => TransactionChunk, (chunk) => chunk.transaction, {
    cascade: true, // Enable cascading operations
  })
  chunks: TransactionChunk[];
}
