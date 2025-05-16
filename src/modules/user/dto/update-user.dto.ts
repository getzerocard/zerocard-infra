import { IsObject, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// UserResponseDto will be imported from get-user.dto.ts in the controller/service
// For this DTO file, we only need the input DTO and error responses.

/**
 * DTO for updating user profile
 */
export class UpdateUserDto {
  @ApiProperty({
    required: false,
    description: 'Username of the user',
    example: 'john_doe_new',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    required: false,
    description:
      'Timezone of the user in IANA format (e.g., America/New_York or UTC)',
    example: 'Europe/London',
  })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiProperty({
    required: false,
    description:
      "User's shipping address. Include any fields to update: street, city, state, country, postalCode.",
    example: {
      street: '456 Main St',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10002',
    },
  })
  @IsOptional()
  @IsObject()
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

// Remove UpdateUserSuccessResponse class
// ... existing code ...
// export class UpdateUserSuccessResponse {
//   static responses = [
//     {
//       status: 200,
//       description: 'User profile updated successfully',
//       schema: {
//         properties: {
//           statusCode: { type: 'number', example: 200 },
//           success: { type: 'boolean', example: true },
//           data: {
//             $ref: '#/components/schemas/UserResponseDto', // This would point to UserResponseDto
//           },
//         },
//       },
//       examples: {
//         success: {
//           summary: 'Successful Update',
//           value: {
//             statusCode: 200,
//             success: true,
//             data: { // Example of UserResponseDto
//               userId: 'did:privy:abc123xyz',
//               username: 'john_doe_updated',
//               // ... other UserResponseDto fields
//               shippingAddress: {
//                 street: '456 Main St',
//                 city: 'New York',
//                 state: 'NY',
//                 country: 'USA',
//                 postalCode: '10002',
//               },
//               updatedAt: '2023-01-03T12:34:56.789Z',
//             },
//           },
//         },
//       },
//     },
//   ];
// }

export class UpdateUserErrorResponses {
  static responses = [
    {
      status: 400,
      description: 'Invalid data provided',
      examples: {
        badRequest: {
          summary: 'Bad Request',
          value: {
            statusCode: 400,
            success: false,
            message: 'Invalid data provided',
          },
        },
        // Keep other specific 400 error examples if they are distinct messages
        invalidTimezone: {
          summary: 'Invalid Timezone',
          value: {
            statusCode: 400,
            success: false,
            message:
              'Invalid timezone format. Use IANA format like \"America/New_York\" or \"UTC\".',
          },
        },
        dbError: {
          summary: 'Database Error on Update',
          value: {
            statusCode: 400,
            success: false,
            message: 'Failed to update user due to a database error',
          },
        },
        noChanges: {
          summary: 'No Updates Provided or Unchanged',
          value: {
            statusCode: 400,
            success: false,
            message: 'No updates provided or values are unchanged',
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
      description: "Cannot update another user's profile",
      examples: {
        forbidden: {
          summary: 'Forbidden',
          value: {
            statusCode: 403,
            success: false,
            message: "Cannot update another user's profile",
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
      description: 'Conflict due to existing username',
      examples: {
        conflict: {
          summary: 'Username Conflict',
          value: {
            statusCode: 409,
            success: false,
            message: 'Username already exists',
          },
        },
      },
    },
    // Removed the redundant 400 for no updates, covered above.
  ];
}
