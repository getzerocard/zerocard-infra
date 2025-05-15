import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';

/**
 * Entity to store withdrawal transactions for users.
 */
@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user: User;

  @Column()
  symbol: string;

  @Column()
  amount: string; // Stored as string to maintain precision with Decimal.js

  @Column()
  transactionHash: string;

  @Column()
  chainType: string;

  @Column()
  blockchainNetwork: string;

  @Column({
    type: 'enum',
    enum: ['withdrawal'],
    default: 'withdrawal',
  })
  transactionType: 'withdrawal';

  @Column({
    type: 'enum',
    enum: ['completed', 'failed', 'pending'],
    default: 'pending',
  })
  status: 'completed' | 'failed' | 'pending';

  @Column({ nullable: true })
  toAddress: string; // To address for withdrawals

  @Column({ nullable: true })
  recipientAddress: string; // Recipient address for withdrawals

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
