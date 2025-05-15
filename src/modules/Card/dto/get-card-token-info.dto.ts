import { ApiProperty } from '@nestjs/swagger';

export class GetCardTokenInfoResponseDto {
  @ApiProperty({
    description: 'The ID of the user.',
    example: 'did:privy:user123',
  })
  userId: string;

  @ApiProperty({
    description: 'The secure card token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2VlODFhMj...',
  })
  token: string;
}

// Basic error response DTO structure (can be expanded)
export class GetCardTokenInfoErrorResponses {
  static readonly R400 = {
    status: 400,
    description: 'Bad Request (e.g., invalid user ID format).'
    // schema: { ... } // Add schema if needed, conforming to global standards
  };
  static readonly R401 = {
    status: 401,
    description: 'Unauthorized.',
  };
  static readonly R403 = {
    status: 403,
    description: 'Forbidden (e.g., trying to access another user\'s card token).'
  };
  static readonly R404 = {
    status: 404,
    description: 'Not Found (e.g., user or card not found).'
  };
  static readonly R500 = {
    status: 500,
    description: 'Internal Server Error.'
  };
}
