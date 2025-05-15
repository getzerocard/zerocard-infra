import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Parameter decorator that automatically trims string values
 *
 * @example
 * ```typescript
 * // Single parameter
 * @Get(':id')
 * findOne(@Param('id') @Trim() id: string) {}
 *
 * // With parameter object destructuring
 * @Post()
 * create(@Body() @Trim() createDto: CreateDto) {}
 * ```
 */
export const Trim = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // Simple param handling for direct parameters
    const args = ctx.getArgByIndex(0);

    // If it's a string, just trim it and return
    if (typeof args === 'string') {
      return args.trim();
    }

    // Special case: if it's an object parameter, apply trim to all string properties
    if (typeof args === 'object' && args !== null) {
      return trimStringProperties(args);
    }

    // Default: return the parameter as is
    return args;
  },
);

/**
 * Recursively trims all string properties in an object
 * Safely handles circular references
 */
function trimStringProperties(obj: any): any {
  // Handle primitive types
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => trimStringProperties(item));
  }

  // Use WeakSet to track already processed objects (prevents circular reference loops)
  const processed = new WeakSet();

  // Inner trim function to handle circular references
  function trimObjectProps(input: Record<string, any>): Record<string, any> {
    // Prevent circular references
    if (processed.has(input)) {
      return input;
    }

    // Mark this object as processed
    processed.add(input);

    // Create a new object with trimmed values
    const result: Record<string, any> = {};

    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        const value = input[key];

        if (typeof value === 'string') {
          // Trim strings
          result[key] = value.trim();
        } else if (typeof value === 'object' && value !== null) {
          // Recursively process nested objects (with circular ref protection)
          result[key] = trimObjectProps(value);
        } else {
          // Keep other types as is
          result[key] = value;
        }
      }
    }

    return result;
  }

  return trimObjectProps(obj);
}
