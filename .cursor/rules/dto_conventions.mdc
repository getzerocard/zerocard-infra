---
description:
globs:
alwaysApply: true
---
# DTO (Data Transfer Object) Usage and Design

This rule defines how DTOs should be used for request inputs, service layer communication, and response structures.

## 1. Request Body Validation (`@Body`)

- All request bodies (`@Body`) **must** be validated using a DTO class.
- Apply `@nestjs/common`'s `ValidationPipe` to the `@Body` decorator to trigger validation.
- DTO classes **must** use `class-validator` decorators (e.g., `@IsString()`, `@IsEmail()`, `@IsOptional()`) for property validation.
- Example: `[update-user.dto.ts](mdc:src/modules/user/dto/update-user.dto.ts)`
- Example usage in `[user.controller.ts](mdc:src/modules/user/user.controller.ts)`:
  ```typescript
  import { UpdateUserDto } from './dto/update-user.dto';
  // ...
  @Patch(':userId')
  async updateUser(
    @Body(new ValidationPipe()) updateData: UpdateUserDto,
    // ...
  ): Promise<UserResponseDto> {
    // ...
  }
  ```

## 2. Path Parameters (`@Param`)

- Path parameters (`@Param`) generally **should not** use DTOs. They are typically simple scalar values.
- Control them with type hints and apply specific pipes (`@Trim()`, `ParseIntPipe`) as needed.

## 3. Query Parameters (`@Query`)

- For a small number of simple, unrelated query parameters, defining them directly in the method signature with `@Query()` is acceptable.
- For a larger number of related query parameters, or if they require complex validation as a group, they **should** be grouped into a DTO.
  - Apply `ValidationPipe` to the DTO: `@Query(new ValidationPipe({ transform: true })) queryDto: MyQueryDto`.

## 4. Service Layer Return Values

- Service methods that are called by controllers **should** return specific "core data DTOs" (e.g., `UserResponseDto`, `ApprovedUserDataDto` from `[approve-upgrade.dto.ts](mdc:src/modules/user/dto/approve-upgrade.dto.ts)`) rather than raw entities (like `User` from `[user.entity.ts](mdc:src/modules/user/entity/user.entity.ts)`).
- This ensures controlled data exposure and aligns with the types expected by `ApiStandardResponse` in controllers.
- Use `plainToClass` or `plainToInstance` from `class-transformer` for mapping entities to DTOs, especially when `excludeExtraneousValues: true` is desired. See `[user.service.ts](mdc:src/modules/user/user.service.ts)` for examples.

## 5. DTO Naming and Location

- DTOs for a specific module (e.g., `user`) should reside in that module's `dto` subdirectory (e.g., `src/modules/user/dto/`).
- Core data DTOs (representing the `data` field of a successful response) should be clearly named (e.g., `UserResponseDto`, `CheckUsernameDataDto`).
- DTOs for error responses should be named `XXXErrorResponses` (e.g., `GetUserErrorResponses`).
