import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Minimum value validation pipe
 *
 * Validates that a numeric input is at least a specified minimum value.
 * Handles both number and string inputs, automatically converting strings to numbers.
 * Perfect for query parameters which come in as strings.
 *
 * @example
 * // Body parameter
 * @Post()
 * setLimit(
 *   @Body('usdAmount', new MinimumValuePipe(1)) usdAmount: number
 * ) {
 *   // usdAmount is guaranteed to be at least 1
 *   return this.service.setLimit(usdAmount);
 * }
 *
 * // Query parameter
 * @Get()
 * getWithLimit(
 *   @Query('minValue', new MinimumValuePipe(1)) minValue: number
 * ) {
 *   // minValue is properly converted from string and validated
 *   return this.service.getWithMinValue(minValue);
 * }
 */
@Injectable()
export class MinimumValuePipe implements PipeTransform {
  /**
   * @param minimumValue The minimum allowed value for the input
   * @param errorMessage Custom error message for validation failure
   * @param allowEmpty Whether to allow empty values (undefined, null, '') and return them as undefined
   */
  constructor(
    private readonly minimumValue: number,
    private readonly errorMessage?: string,
    private readonly allowEmpty: boolean = false,
  ) { }

  transform(value: any, _metadata: ArgumentMetadata): number | undefined {
    // Handle empty values if allowed
    if (this.allowEmpty && (value === undefined || value === null || value === '')) {
      return undefined;
    }

    // Handle empty values if not allowed
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(
        this.errorMessage || `Value is required and must be at least ${this.minimumValue}`,
      );
    }

    // Convert string to number if it's a string (common for query parameters)
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    // Check if value is a valid number
    if (typeof numericValue !== 'number' || isNaN(numericValue)) {
      throw new BadRequestException(
        this.errorMessage || 'Value must be a valid number',
      );
    }

    // Check minimum value constraint
    if (numericValue < this.minimumValue) {
      throw new BadRequestException(
        this.errorMessage || `Value must be at least ${this.minimumValue}`,
      );
    }

    return numericValue; // Return the numeric value, not the original string
  }
}
