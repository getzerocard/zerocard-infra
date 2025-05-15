import { ApiProperty } from '@nestjs/swagger';

export class UpgradeSubUserErrorResponses {
  static responses = [
    {
      status: 400,
      description: 'Bad Request',
      examples: {
        badRequest: {
          summary: 'Invalid Request',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid user ID provided',
          },
        },
        alreadyMainUser: {
          summary: 'Already Main User',
          value: {
            statusCode: 400,
            success: false,
            message: 'User is already a main user',
          },
        },
        alreadyPending: {
          summary: 'Request Already Pending',
          value: {
            statusCode: 400,
            success: false,
            message: 'Upgrade request is already pending',
          },
        },
        alreadyApproved: {
          summary: 'Request Already Approved',
          value: {
            statusCode: 400,
            success: false,
            message: 'Upgrade request already approved',
          },
        },
        noMainUser: {
          summary: 'No Main User Associated',
          value: {
            statusCode: 400,
            success: false,
            message: 'No main user associated with this sub-user',
          },
        },
        databaseError: {
          summary: 'Database Error',
          value: {
            statusCode: 400,
            success: false,
            message: 'Failed to request upgrade due to a database error',
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
          value: {
            statusCode: 401,
            success: false,
            message: 'Not authorized to upgrade this sub-user',
          },
        },
      },
    },
    {
      status: 404,
      description: 'Not Found',
      examples: {
        notFound: {
          summary: 'User Not Found',
          value: {
            statusCode: 404,
            success: false,
            message: 'Sub-user not found',
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

export class UpgradeSubUserResponse {
  @ApiProperty({
    description: 'Unique identifier of the sub-user',
    example: 'did:privy:example123',
  })
  userId: string;

  @ApiProperty({
    description: 'Email of the sub-user',
    example: 'example.user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Indicates if the user is a main user',
    example: false,
  })
  isMainUser: boolean;

  @ApiProperty({
    description: 'Status of the upgrade request',
    example: 'pending',
  })
  upgradeRequestStatus: string;

  @ApiProperty({
    description: 'Main user associated with the sub-user',
    example: { userId: 'did:privy:mainuser456' },
  })
  parentUser: { userId: string };
}
