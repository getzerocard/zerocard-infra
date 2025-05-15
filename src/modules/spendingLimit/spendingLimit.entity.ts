import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { User } from '../user/entity/user.entity';
import { TransactionChunk } from '../Transaction/entity/transaction-chunk.entity';
import { Offramp } from '../offramp/offramp.entity';

@Entity('spending_limits')
export class SpendingLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.spendingLimits)
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0.0 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  usdAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0.0 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  fxRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0.0 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  nairaAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0.0 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  nairaRemaining: number;

  @OneToMany(() => TransactionChunk, (chunk) => chunk.spendingLimit)
  transactionChunks: TransactionChunk[];

  @OneToOne(() => Offramp, { nullable: true, lazy: true })
  @JoinColumn({ name: 'offrampId', referencedColumnName: 'id' })
  offramp?: Offramp;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: false })
  chainType: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  tokenSymbol: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  blockchainNetwork?: string;
}
