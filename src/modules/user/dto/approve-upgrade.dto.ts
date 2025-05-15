import { ApiProperty } from '@nestjs/swagger';

// Error response DTO for approving an upgrade request
export class ApproveUpgradeErrorResponses {
  static responses = [
    {
      status: 400,
      description: 'Bad request due to invalid input or status',
      examples: {
        invalidInput: {
          summary: 'Invalid Input',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid user ID provided',
          },
        },
        alreadyApproved: {
          summary: 'Already Approved',
          value: {
            statusCode: 400,
            success: false,
            message: 'Upgrade request already approved or not pending',
          },
        },
      },
    },
    {
      status: 401,
      description: 'Unauthorized to approve the upgrade',
      examples: {
        unauthorized: {
          summary: 'Unauthorized',
          value: {
            statusCode: 401,
            success: false,
            message: 'Not authorized to approve upgrades',
          },
        },
      },
    },
    {
      status: 404,
      description: 'User not found',
      examples: {
        subUserNotFound: {
          summary: 'Sub-user Not Found',
          value: {
            statusCode: 404,
            success: false,
            message: 'Sub-user not found',
          },
        },
        approverNotFound: {
          summary: 'Approver Not Found',
          value: {
            statusCode: 404,
            success: false,
            message: 'Approver user not found',
          },
        },
      },
    },
    {
      status: 409,
      description:
        'Conflict due to unique constraint violation or other issues',
      examples: {
        conflict: {
          summary: 'Conflict',
          value: {
            statusCode: 409,
            success: false,
            message:
              'Failed to approve upgrade due to a unique constraint violation in user data or other conflict.',
          },
        },
      },
    },
  ];
}

// DTO for the data part of the successful approve upgrade response
export class ApprovedUserDataDto {
  @ApiProperty({
    description: 'The ID of the upgraded user',
    example: 'user123',
  })
  userId: string;

  @ApiProperty({
    description: 'The email of the upgraded user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Whether the user is now a main user',
    example: true,
  })
  isMainUser: boolean;
}
