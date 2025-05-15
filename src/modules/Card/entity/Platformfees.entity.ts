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
 * Entity to store debit transactions for platform fees, specifically for card order fees.
 */
@Entity('platform_debits')
export class PlatformDebit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user: User;

  @Column({ nullable: true })
  debitedUserId: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'debitedUserId', referencedColumnName: 'userId' })
  debitedUser: User;

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
    enum: ['card_order', 'other'],
    default: 'card_order',
  })
  transactionType: 'card_order' | 'other';

  @Column({ type: 'enum', enum: ['completed', 'failed'], default: 'completed' })
  status: 'completed' | 'failed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
