import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO for setting or updating spending limit constraint for a sub-user (Input)
 */
export class SetConstraintDto {
  @ApiProperty({
    description: 'ID of the sub-user to set constraint for',
    example: 'did:privy:subuser456',
  })
  @IsString()
  subUserId: string;

  @ApiProperty({ description: 'Spending limit value', example: 100.5 })
  @IsNumber()
  constraintValue: number;

  @ApiProperty({
    description: 'Time period for the constraint (optional)',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: false,
    example: 'monthly',
  })
  @IsOptional()
  @IsString()
  timePeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

/**
 * DTO for the constraint data in response
 */
export class ConstraintResponseDto {
  @ApiProperty({
    example: 'constraint_uuid_1',
    description: 'Unique ID of the constraint',
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: 'spending_limit',
    description: 'Type of the constraint',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: 'monthly',
    description: 'Time period of the constraint',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  timePeriod?: string | null;

  @ApiProperty({ example: 500.0, description: 'Value of the constraint' })
  @IsNumber()
  value: number;

  @ApiProperty({ example: 'active', description: 'Status of the constraint' })
  @IsString()
  status: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2023-10-27T11:00:00.000Z',
    description: 'Creation timestamp',
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2023-10-27T11:00:00.000Z',
    description: 'Last update timestamp',
  })
  @IsDate()
  updatedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: null,
    description: 'Expiration date of the constraint',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  expirationDate?: Date | null;
}

export class SetConstraintErrorResponses {
  static responses = [
    {
      status: 400,
      description: 'Invalid data provided',
      // Note: The original DTO had an array for value, which is unusual for Swagger examples.
      // Representing as distinct examples for clarity.
      examples: {
        invalidData: {
          summary: 'Invalid Data',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid data provided',
          },
        },
        nonPositiveValue: {
          summary: 'Non-Positive Value',
          value: {
            statusCode: 400,
            success: false,
            message: 'Constraint value must be positive',
          },
        },
        invalidTimePeriod: {
          summary: 'Invalid Time Period',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid time period provided',
          },
        },
        exceedsLimit: {
          summary: 'Exceeds Limit',
          value: {
            statusCode: 400,
            success: false,
            message: 'Constraint value exceeds maximum limit',
          },
        },
        userUpgrading: {
          summary: 'User Upgrading',
          value: {
            statusCode: 400,
            success: false,
            message:
              'Cannot add constraints to a sub-user who is upgraded or upgrading',
          },
        },
      },
    },
    {
      status: 401,
      description: 'Unauthorized',
      examples: {
        unauthorized: {
          summary: 'Unauthorized Access',
          value: { statusCode: 401, success: false, message: 'Unauthorized' },
        },
      },
    },
    {
      status: 403,
      description: 'Not authorized to set constraints on this sub-user',
      examples: {
        forbidden: {
          summary: 'Forbidden',
          value: {
            statusCode: 403,
            success: false,
            message: 'Not authorized to set constraints on this sub-user',
          },
        },
      },
    },
    {
      status: 404,
      description: 'User not found',
      examples: {
        notFound: {
          summary: 'User Not Found',
          value: { statusCode: 404, success: false, message: 'User not found' },
        },
      },
    },
    {
      status: 409,
      description: 'Conflict due to existing constraint',
      examples: {
        conflict: {
          summary: 'Constraint Conflict',
          value: {
            statusCode: 409,
            success: false,
            message:
              'A constraint of this type already exists for the sub-user.',
          },
        },
      },
    },
  ];
}
