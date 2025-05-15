import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserType {
  SUB_USER = 'sub_user',
  PARENT_USER = 'parent_user',
}

export class WalletAddresses {
  @ApiProperty({
    required: false,
    example: '0xAbC123DEF456GHI789jKLmN01pQ2RSTuvWxYZabcdEFe',
  })
  @IsString()
  @IsOptional()
  ethereum?: string;

  @ApiProperty({
    required: false,
    example: 'SoL ÖrneğinAdres123456789ABCDEFGHJKLMNPQRSTUVW',
  })
  @IsString()
  @IsOptional()
  solana?: string;

  @ApiProperty({
    required: false,
    example: 'bc1qexampleaddress0123456789abcdefghijklmnopqrstuv',
  })
  @IsString()
  @IsOptional()
  bitcoin?: string;

  @ApiProperty({
    required: false,
    example: 'TRONÖrnekAdres123456789ABCDEFGHJKLMNP',
  })
  @IsString()
  @IsOptional()
  tron?: string;
}

export class CreateNewUserResponseDto {
  @ApiProperty({ example: 'did:privy:cm94emxt901iyl50l4zr9bg7h' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: UserType, example: UserType.PARENT_USER })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-07-29T10:00:00.000Z',
  })
  @IsDate()
  timeCreated: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-07-29T10:00:00.000Z',
  })
  @IsDate()
  timeUpdated: Date;

  @ApiProperty({ type: WalletAddresses })
  @IsObject()
  walletAddresses: WalletAddresses;

  @ApiProperty({ example: 'new.user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Indicates if the user was newly created in this request.',
  })
  @IsBoolean()
  @IsOptional()
  isNewUser?: boolean;

  @ApiProperty({
    example: 'not_ordered',
    required: false,
    description: 'The status of the user\'s card order.',
  })
  @IsString()
  @IsOptional()
  cardOrderStatus?: string;

  @ApiProperty({
    example: 'john_doe',
    required: false,
    description: 'The username of the user.',
  })
  @IsString()
  @IsOptional()
  username?: string;
}

export class CreateUserErrorResponses {
  static responses = [
    {
      status: 400,
      description: 'Invalid data provided or invalid user identifier',
      examples: {
        badRequest: {
          summary: 'Bad Request',
          value: {
            statusCode: 400,
            success: false,
            message: "Invalid user identifier. Use 'me' to create a user.",
          },
        },
      },
    },
    {
      status: 401,
      description: 'Unauthorized access',
      examples: {
        unauthorized: {
          summary: 'Unauthorized Access',
          value: { statusCode: 401, success: false, message: 'Unauthorized' },
        },
      },
    },
    {
      status: 409,
      description: 'Conflict, user already exists with this identifier',
      examples: {
        conflict: {
          summary: 'User Already Exists',
          value: {
            statusCode: 409,
            success: false,
            message: 'User already exists with this email or phone number.',
          },
        },
      },
    },
  ];
}
