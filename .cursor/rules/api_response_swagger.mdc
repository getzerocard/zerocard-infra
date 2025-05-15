---
description:
globs:
alwaysApply: true
---
# API Response and Swagger Documentation Conventions

This rule outlines the standards for API responses and their Swagger documentation to ensure consistency across the project.

## 1. Standard Response Wrapping

All API responses, both success and error, **must** be wrapped in the standard format:
```json
// Success
{
  "statusCode": 200, // or 201, etc.
  "success": true,
  "data": { /* Core data DTO content */ }
}

// Error
{
  "statusCode": 400, // or 401, 403, 404, 500, etc.
  "success": false,
  "message": "Descriptive error message"
}
```
This wrapping is primarily handled by the global `ResponseInterceptor` (see `[response.interceptor.ts](mdc:src/common/interceptors/response.interceptor.ts)`).

## 2. Swagger for Success Responses

Controller methods **must** use the `@ApiStandardResponse(CoreDataDto)` decorator for documenting successful responses.
- `CoreDataDto` should be the specific DTO representing the `data` field (e.g., `UserResponseDto`, `ApprovedUserDataDto`).
- Example: `[user.controller.ts](mdc:src/modules/user/user.controller.ts)`

```typescript
// Example in a controller
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator'; // Correct path
import { UserResponseDto } from './dto/get-user.dto';

// ...
@Get(':userId')
@ApiStandardResponse(UserResponseDto)
async getUser(...): Promise<UserResponseDto> {
  // ...
}
```
- Avoid using older `XXXSuccessResponse` DTOs that define the full wrapper directly with `@ApiResponse`. If such a DTO *must* be used for legacy reasons, its internal `schema` and `example` must conform to the standard wrapper shown above.

## 3. Swagger for Error Responses

- Error responses **must** be documented using `@ApiResponse` with the relevant `XXXErrorResponses` DTO.
- The `examples` within these `XXXErrorResponses` DTOs (e.g., in `[get-user.dto.ts](mdc:src/modules/user/dto/get-user.dto.ts)`) **must** reflect the standard wrapped error format: `{ statusCode, success: false, message }`.

```typescript
// Example in an error DTO (e.g., get-user.dto.ts)
export class GetUserErrorResponses {
  static responses = [
    {
      status: 404,
      description: 'User not found',
      examples: {
        notFound: {
          summary: 'User Not Found',
          value: { statusCode: 404, success: false, message: 'User not found' }, // Wrapped format
        },
      },
    },
  ];
}
```

## 4. Return Types

- Controller methods should have return types that match the `CoreDataDto` used in `@ApiStandardResponse` (e.g., `Promise<UserResponseDto>`).
- The actual data returned by the controller method will be the raw `CoreDataDto`; the `ResponseInterceptor` handles the final wrapping.
