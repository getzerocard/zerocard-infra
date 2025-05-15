import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrivyService } from '../privy.service';

/**
 * Guard to verify Privy authentication tokens
 */
@Injectable()
export class PrivyAuthGuard implements CanActivate {
  private readonly logger = new Logger(PrivyAuthGuard.name);

  constructor(private readonly privyService: PrivyService) {}

  /**
   * Verify if the request has a valid Privy access token
   *
   * @param context The execution context
   * @returns Boolean indicating if the request is authorized
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requestId = Date.now().toString(36);

    try {
      // Extract the access token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        this.logAuthError(requestId, 'Missing authorization header');
        throw new UnauthorizedException('Authentication failed');
      }

      // Extract the access token, handling potential double "Bearer" prefix
      let accessToken = '';
      if (authHeader.startsWith('Bearer Bearer ')) {
        // Handle case where "Bearer" is duplicated
        accessToken = authHeader.substring('Bearer Bearer '.length);
      } else if (authHeader.startsWith('Bearer ')) {
        // Standard case
        accessToken = authHeader.substring('Bearer '.length);
      } else {
        // Try to use the header as-is
        accessToken = authHeader;
      }

      // Ensure token is not empty
      if (!accessToken || accessToken.trim() === '') {
        this.logAuthError(requestId, 'Invalid authorization header format');
        throw new UnauthorizedException('Authentication failed');
      }

      // Extract identity token from headers or body
      const identityToken =
        request.headers['x-identity-token'] ||
        (request.body && request.body.identityToken);

      if (!identityToken) {
        this.logAuthError(requestId, 'Missing identity token');
        throw new UnauthorizedException('Authentication failed');
      }

      // Perform token verification and user details retrieval in parallel
      // Using retry for remote API calls that might occasionally fail
      this.logger.debug('Verifying tokens in parallel');
      const [verificationResult, userDetails] = await Promise.all([
        this.retryOperation(
          () => this.privyService.verifyAccessToken(accessToken),
          2, // Max 2 retries
          300, // Initial 300ms delay
        ),
        this.retryOperation(
          () => this.privyService.getUserDetails(identityToken),
          2, // Max 2 retries
          300, // Initial 300ms delay
        ),
      ]);

      // Validate verification result - note that Privy handles token expiration
      if (!verificationResult.success) {
        this.logAuthError(requestId, 'Invalid or expired access token');
        throw new UnauthorizedException('Authentication failed');
      }

      // Validate user details
      if (!userDetails) {
        this.logAuthError(requestId, 'Invalid identity token');
        throw new UnauthorizedException('Authentication failed');
      }

      // Verify that the userId from the access token matches the one from identity token
      if (verificationResult.userId !== userDetails.userId) {
        this.logAuthError(
          requestId,
          `Token mismatch: User IDs do not match (${verificationResult.userId} vs ${userDetails.userId})`,
        );
        throw new UnauthorizedException('Authentication failed');
      }

      // Add the user details to the request for use in handlers
      request.privyUser = userDetails;

      // Log successful authentication with full user ID for traceability
      this.logger.log(`User authenticated: ${userDetails.userId}`);

      return true;
    } catch (error) {
      // Ensure we log any errors for debugging, but don't expose details to client
      if (error instanceof UnauthorizedException) {
        // Already logged and formatted appropriately
        throw error;
      }

      // For unexpected errors, log details but return generic message
      this.logAuthError(
        requestId,
        `Unexpected auth error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Logs authentication errors with a request ID for correlation
   *
   * @param requestId Unique identifier for the request
   * @param message Detailed error message (for logs only)
   */
  private logAuthError(requestId: string, message: string): void {
    this.logger.warn(`Auth error [${requestId}]: ${message}`);
  }

  /**
   * Utility method to retry operations with exponential backoff
   * Uses a shorter delay for auth operations to maintain responsiveness
   *
   * @param operation The async operation to retry
   * @param maxRetries Maximum number of retries
   * @param delay Initial delay in ms (will be doubled each retry)
   * @returns Result of the operation
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delay: number,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt > maxRetries) {
          this.logger.error(
            `Authentication operation failed after ${maxRetries} retries`,
          );
          throw lastError;
        }

        const retryDelay = delay * Math.pow(1.5, attempt - 1); // Using 1.5 for gentler backoff
        this.logger.warn(`Auth operation retry scheduled in ${retryDelay}ms`);

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    throw lastError!; // Should never reach here but TypeScript requires it
  }
}
