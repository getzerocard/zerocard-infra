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
import { IsEnum, IsNumber, IsString } from 'class-validator';

/**
 * Enum for the status of locked funds
 */
export enum LockStatus {
  LOCKED = 'LOCKED',
  FREE = 'FREE',
}

/**
 * Enum for the type of lock
 */
export enum LockType {
  MAINUSER_CARD_ORDER = 'mainuser_card_order',
  SUBUSER_CARD_ORDER = 'subuser_card_order',
}

/**
 * Entity to track funds locked for specific purposes like card orders
 */
@Entity('funds_lock')
export class FundsLock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  @IsNumber()
  amountLocked: number;

  @Column()
  @IsString()
  tokenSymbolLocked: string;

  @Column()
  @IsString()
  chain: string;

  @Column()
  @IsString()
  blockchainNetwork: string;

  @Column({
    type: 'enum',
    enum: LockStatus,
    default: LockStatus.LOCKED,
  })
  @IsEnum(LockStatus)
  status: LockStatus;

  @Column({
    type: 'enum',
    enum: LockType,
  })
  @IsEnum(LockType)
  type: LockType;

  @ManyToOne(() => User, (user) => user.id, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'subUserId' })
  subUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
