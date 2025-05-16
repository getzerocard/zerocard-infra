import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsValidBVN,
  IsValidDateOfBirth,
  IsValidNIN,
  IsValidPhoneNumber,
  IsWalletAddress,
} from '../../../common/decorators';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  IIdentification,
  IShippingAddress,
} from '../../../common/interfaces';
import { SpendingLimit } from '../../spendingLimit/spendingLimit.entity';
import { Transaction } from '../../Transaction/entity/transaction.entity';
import { Constraint } from './authorisedUserConstraint.entity';
import { Offramp } from '../../offramp/offramp.entity';

/**
 * Shipping address embedded entity
 */
class ShippingAddress implements IShippingAddress {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

/**
 * Identification embedded entity
 */
export class _Identification implements IIdentification {
  @IsEnum(['NIN', 'BVN'])
  type: 'NIN' | 'BVN';

  @ValidateIf((o) => o.type === 'BVN')
  @IsValidBVN()
  @ValidateIf((o) => o.type === 'NIN')
  @IsValidNIN()
  @IsNotEmpty()
  number: string;
}

/**
 * User entity
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  @IsString()
  @IsOptional()
  userId: string | null;

  @Index()
  @Column({ nullable: true, unique: true })
  @IsString()
  @IsOptional()
  username: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  accountNumber: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  accountName: string;

  @Column({ nullable: true })
  @IsWalletAddress({ message: 'EVM wallet address must be a valid address' })
  EVMWalletAddress: string;

  @Column({ nullable: true })
  @IsWalletAddress({ message: 'Solana wallet address must be a valid address' })
  SolanaWalletAddress: string;

  @Column({ nullable: true })
  @IsWalletAddress({
    message: 'Bitcoin wallet address must be a valid address',
  })
  BitcoinWalletAddress: string;

  @Column({ nullable: true })
  @IsWalletAddress({ message: 'Tron wallet address must be a valid address' })
  TronWalletAddress: string;

  @Column({ nullable: true })
  @IsString()
  firstName: string;

  @Column({ nullable: true })
  @IsString()
  lastName: string;

  @Column({ type: 'date', nullable: true })
  @IsValidDateOfBirth({ minimumAge: 18 })
  @Type(() => Date)
  dateOfBirth: Date;

  @Column({ nullable: true })
  @IsValidPhoneNumber()
  phoneNumber: string;

  @Column({ type: 'json', nullable: true })
  @ValidateNested()
  @Type(() => ShippingAddress)
  shippingAddress: ShippingAddress;

  // Verification and Identity fields
  @Column({ type: 'enum', enum: ['pending', 'verified'], default: 'pending' })
  verificationStatus: 'pending' | 'verified';

  @Column({
    type: 'enum',
    enum: ['NIN', 'BVN'],
    nullable: true,
  })
  identityType: 'NIN' | 'BVN' | null;

  @Column({ type: 'boolean', default: false })
  isIdentityVerified: boolean;

  // Card Order Status
  @Column({
    type: 'enum',
    enum: [
      'not_ordered',
      'ordered',
      'shipped',
      'delivered',
      'processed',
      'in_delivery',
      'in_transit',
      'activated',
    ],
    default: 'not_ordered',
  })
  /**
   * Status of the card order for this user. Used in card ordering process to track progress.
   */
  cardOrderStatus:
    | 'not_ordered'
    | 'ordered'
    | 'shipped'
    | 'delivered'
    | 'processed'
    | 'in_delivery'
    | 'in_transit'
    | 'activated';

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  trackingNumber: string;

  @Column({ nullable: true })
  @IsString()
  customerId: string;

  @Column({ nullable: true })
  @IsString()
  email: string;

  @Column({ nullable: true })
  @IsString()
  timeZone: string; // IANA time zone format, e.g., 'America/New_York'

  @Column({ nullable: true })
  accountId: string; // Account identifier

  @Column({ nullable: true })
  cardId: string; // Card identifier

  // Self-reference: this user's parent (if any)
  @ManyToOne(() => User, (user) => user.subUsers, { nullable: true })
  @JoinColumn({ name: 'parentUserId' })
  parentUser: User | null;

  // Inverse side: sub-users under this user
  @OneToMany(() => User, (user) => user.parentUser)
  subUsers: User[];

  // Flag indicating if the user is a main user or a sub-user
  @Column({ type: 'boolean', default: false })
  isMainUser: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SpendingLimit, (spendingLimit) => spendingLimit.user)
  spendingLimits: SpendingLimit[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Constraint, (constraint) => constraint.user)
  constraints: Constraint[];

  @Column({ nullable: true, default: null })
  upgradeRequestStatus: string | null;

  @OneToMany(() => Offramp, (offramp) => offramp.user)
  offrampOrders: Offramp[];

  @Column({ nullable: true, type: 'text' })
  @IsString()
  @IsOptional()
  base64Photo: string;

  @Column({ type: 'boolean', default: false })
  isWhitelisted: boolean;
}
