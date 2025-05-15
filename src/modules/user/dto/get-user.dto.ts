import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer'; // For @Type decorator if needed for nested objects
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// Define BaseResponseDto (can be moved to a common file later)
export class BaseResponseDto {
  @ApiProperty({
    description: 'Public unique identifier for the user (Privy DID).',
    example: 'did:privy:abc123xyz',
  })
  @IsString()
  userId: string; // Changed from 'id' to 'userId' for User context

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2023-01-01T00:00:00.000Z',
    description: 'Creation timestamp.',
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2023-01-02T12:34:56.789Z',
    description: 'Last update timestamp.',
  })
  @IsDate()
  updatedAt: Date;
}

// Define ShippingAddressDto for UserResponseDto
export class ShippingAddressDto {
  @ApiProperty({ example: '123 Main St', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ example: 'New York', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'NY', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'USA', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: '10001', required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;
}

// Define UserResponseDto
export class UserResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'john_doe', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'john.doe@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'America/New_York', required: false })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiProperty({ example: '0x123...', required: false })
  @IsOptional()
  @IsString()
  EVMWalletAddress?: string;

  @ApiProperty({ example: 'AYFkqCB...', required: false })
  @IsOptional()
  @IsString()
  SolanaWalletAddress?: string;

  @ApiProperty({ example: '1A1zP1e...', required: false })
  @IsOptional()
  @IsString()
  BitcoinWalletAddress?: string;

  @ApiProperty({ example: 'T9yD14N...', required: false })
  @IsOptional()
  @IsString()
  TronWalletAddress?: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '1990-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  dateOfBirth?: Date;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ type: () => ShippingAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiProperty({
    example: 'verified',
    description: "User's KYC verification status",
    required: false,
  })
  @IsOptional()
  @IsString()
  verificationStatus?: string; // e.g., 'verified', 'pending', 'failed', 'not_started'

  @ApiProperty({
    example: true,
    description: 'Indicates if user identity is verified',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isIdentityVerified?: boolean;

  @ApiProperty({
    example: 'ordered',
    description: "Status of the user's card order",
    required: false,
  })
  @IsOptional()
  @IsString()
  cardOrderStatus?: string; // e.g., 'not_ordered', 'ordered', 'shipped', 'delivered'

  @ApiProperty({
    example: 'track123',
    description: 'Tracking number for the card shipment',
    required: false,
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if the user is a main user or a sub-user',
  })
  @IsBoolean()
  isMainUser: boolean;

  @ApiProperty({
    example: 'pending',
    description: 'Status of upgrade request if any',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  upgradeRequestStatus?: string | null;

  @ApiProperty({
    example: 'acc_123xyz',
    description: 'Internal account ID, if applicable for mapping',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({
    type: () => [UserResponseDto],
    description: 'List of sub-users, if applicable',
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserResponseDto)
  subUsers?: UserResponseDto[];
}

export class GetUserErrorResponses {
  static responses = [
    {
      status: 400,
      description: 'Bad Request (e.g., invalid user ID format)',
      examples: {
        badRequest: {
          summary: 'Bad Request',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid user ID format.',
          },
        },
      },
    },
    {
      status: 401,
      description: 'Unauthorized',
      examples: {
        unauthorized: {
          summary: 'Unauthorized',
          value: {
            statusCode: 401,
            success: false,
            message: 'Unauthorized',
          },
        },
      },
    },
    {
      status: 404,
      description: 'User not found or authenticated user not found',
      examples: {
        userNotFound: {
          summary: 'User Not Found',
          value: {
            statusCode: 404,
            success: false,
            message: 'User not found',
          },
        },
        authUserNotFound: {
          summary: 'Authenticated User Not Found',
          value: {
            statusCode: 404,
            success: false,
            message: 'Authenticated user not found',
          },
        },
      },
    },
  ];
}
