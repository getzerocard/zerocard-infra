export class CheckUsernameErrorResponses {
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
  ];
}

// DTO for the data part of the check username response
import { ApiProperty } from '@nestjs/swagger';

export class CheckUsernameDataDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the username is available',
  })
  available: boolean;
}
