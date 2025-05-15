import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsNotEmpty, IsString } from 'class-validator';
import { User } from './user.entity';

/**
 * Entity representing a constraint applied to a user
 */
@Entity('constraints')
export class Constraint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User to which this constraint applies
  @ManyToOne(() => User, (user) => user.constraints)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Type of constraint (e.g., spending limit, withdrawal limit, etc.)
  @Column()
  @IsString()
  @IsNotEmpty()
  type: string;

  // Time period of the constraint (e.g., weekly, monthly, yearly)
  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    nullable: true,
  })
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;

  // The value of the constraint (e.g., amount, percentage, etc.)
  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  // The status of the constraint (active or inactive)
  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  // Date of when the constraint was applied
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Date of when the constraint was last updated
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Optional: for constraints with expiration
  @Column({ type: 'date', nullable: true })
  expirationDate: Date;
}
