// Import User entity
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { UserResponseDto } from './get-user.dto'; // Import UserResponseDto

// Define SubUserDetailDto
export class SubUserDetailDto extends UserResponseDto {
  @ApiProperty({
    example: 'verified',
    description:
      'Verification status of the sub-user (e.g., verified, not verified based on email/userId presence)',
  })
  @IsString()
  subuserstatus: string;
}

export class GetSubUsersErrorResponses {
  static responses = [
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
      description: 'Not authorized to fetch sub-users for another user',
      examples: {
        forbidden: {
          summary: 'Forbidden',
          value: {
            statusCode: 403,
            success: false,
            message: 'Not authorized to fetch sub-users for another user',
          },
        },
      },
    },
    {
      status: 404,
      description: 'Main user not found',
      examples: {
        notFound: {
          summary: 'Main User Not Found',
          value: {
            statusCode: 404,
            success: false,
            message: 'Main user not found',
          },
        },
      },
    },
    {
      status: 400,
      description: 'Bad Request',
      examples: {
        badRequest: {
          summary: 'Invalid Request Parameters',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid request parameters',
          },
        },
      },
    },
    // Removed 500 from here as global exception filter should handle generic 500s
    // unless there's a very specific 500 message for this endpoint.
    // For now, assuming generic handler for 500.
  ];
}
