import { Controller, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PrivyAuthGuard } from '../../modules/auth/guards/privy-auth.guard';

/**
 * Custom decorator to apply common controller configurations
 * including authentication guard and Swagger documentation tags.
 * @param path - The path for the controller route
 * @param tag - An optional tag for Swagger documentation (defaults to path)
 * @returns A decorator with pre-configured settings for controllers
 */
export function ApiController(path: string, tag?: string) {
  return applyDecorators(
    Controller(path),
    ApiTags(tag || path),
    ApiBearerAuth(),
    ApiSecurity('identity-token'),
    UseGuards(PrivyAuthGuard),
  );
}
