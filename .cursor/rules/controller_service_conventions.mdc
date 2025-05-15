---
description:
globs:
alwaysApply: true
---
# Controller and Service Layer Conventions

This rule outlines conventions for controllers and services to maintain a clear separation of concerns and consistent coding patterns.

## 1. Controller Decorators

- All controllers **must** use the `@ApiController(routeName, tag)` decorator at the class level.
  - Example: `[api-controller.decorator.ts](mdc:src/common/decorators/api-controller.decorator.ts)`
- This decorator is responsible for applying common concerns like `@ApiSecurity('identity-token')` and `@UseGuards(AuthGuard)`.
- Individual controller methods **should not** have redundant decorators like `@ApiBearerAuth`, `@UseGuards(AuthGuard)`, or `@ApiSecurity('identity-token')` if they are already covered by `@ApiController`.
- See `[user.controller.ts](mdc:src/modules/user/user.controller.ts)` for an example.

## 2. Controller Responsibilities

- Controllers should be lean and primarily focus on:
  - Handling incoming HTTP requests and outgoing responses.
  - Resolving basic input (e.g., `'me'` to an actual user ID using utilities like `resolveAndAuthorizeUserId`).
  - Validating request inputs (primarily `@Body` using DTOs and `ValidationPipe`).
  - Delegating business logic to service methods.
  - **Avoid** placing complex business logic or direct database interactions within controllers.

## 3. Service Layer Responsibilities

- Service methods (e.g., in `[user.service.ts](mdc:src/modules/user/user.service.ts)`) **must** contain the core business logic.
- This includes:
  - Data retrieval, creation, updates, and deletion.
  - Complex validations that require database lookups or involve multiple pieces of data (e.g., authorization checks, existence checks, balance checks).
  - **Prioritizing Checks and Early Error Handling**: Structure service methods to perform validations and checks in a prioritized order (e.g., quick input validation first, then faster database checks, then more resource-intensive operations like transactions). Throw exceptions as soon as an invalid condition is met to avoid unnecessary further processing. See `[user.service.ts](mdc:src/modules/user/user.service.ts)` for examples of this pattern (e.g., in the `update` or `addSubUser` methods).
  - Interactions with repositories and other services.
  - Managing database transactions for operations requiring atomicity.
    - When using TypeORM transactions, ensure repositories or query builders used *within* the transaction callback are obtained from the `transactionalEntityManager` passed to the callback, not from the class's injected repositories. For example:
      ```typescript
      // Inside a service method
      return await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const userRepositoryInTransaction = transactionalEntityManager.getRepository(User);
          // Use userRepositoryInTransaction for operations within this transaction
        }
      );
      ```

## 4. Authorization

- Basic authorization checks (e.g., "can this user update this specific resource they own?") should often reside in the service layer, close to the data access.
- The `@PrivyUser()` decorator provides authenticated user data in controllers. This data can be passed to service methods for authorization purposes.

## 5. Logging

- Use the `@nestjs/common` `Logger` for logging within services and controllers.
- Instantiate it with the class name: `private readonly logger = new Logger(MyClassName.name);`
- Log important events, errors, and warnings with appropriate context.
