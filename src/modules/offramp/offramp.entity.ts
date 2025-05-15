import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { User } from '../user/entity/user.entity';
import { SpendingLimit } from '../spendingLimit/spendingLimit.entity';

@Entity('offramp_orders')
export class Offramp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.offrampOrders)
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

  @Column({ type: 'varchar', length: 255, nullable: true })
  orderId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  token: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  txHash: string;

  @OneToOne(() => SpendingLimit, (spendingLimit) => spendingLimit.offramp, {
    nullable: true,
  })
  spendingLimit?: SpendingLimit;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
