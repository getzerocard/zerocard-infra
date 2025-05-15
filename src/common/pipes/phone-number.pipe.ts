import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Phone number validation pipe
 *
 * Validates phone numbers in international format:
 * - +1234567890
 * - +123 456 7890 (if allowSpaces = true)
 * - +123-456-7890 (if allowHyphens = true)
 *
 * @example
 * @Post()
 * createUser(@Body('phoneNumber', new PhoneNumberPipe()) phoneNumber: string) {
 *   // phoneNumber is guaranteed to be valid
 *   return this.userService.create({ phoneNumber });
 * }
 */
@Injectable()
export class PhoneNumberPipe implements PipeTransform {
  /**
   * @param options Configuration options for the pipe
   */
  constructor(
    private readonly options: {
      allowSpaces?: boolean;
      allowHyphens?: boolean;
      errorMessage?: string;
    } = {},
  ) {
    // Set defaults
    this.options.allowSpaces = this.options.allowSpaces !== false;
    this.options.allowHyphens = this.options.allowHyphens !== false;
  }

  transform(value: any, _metadata: ArgumentMetadata) {
    if (typeof value !== 'string') {
      throw new BadRequestException(
        this.options.errorMessage || 'Phone number must be a string',
      );
    }

    // Build regex pattern based on options
    let separatorPattern = '';
    if (this.options.allowSpaces && this.options.allowHyphens) {
      separatorPattern = '[\\s-]?';
    } else if (this.options.allowSpaces) {
      separatorPattern = '\\s?';
    } else if (this.options.allowHyphens) {
      separatorPattern = '-?';
    }

    // Match international format: +country code and 7-15 digits
    let phoneRegex;
    if (separatorPattern) {
      phoneRegex = new RegExp(
        `^\\+[1-9]\\d{0,3}${separatorPattern}(?:\\d${separatorPattern}){7,14}\\d$`,
      );
    } else {
      phoneRegex = /^\+[1-9]\d{0,3}\d{7,14}$/;
    }

    if (!phoneRegex.test(value)) {
      throw new BadRequestException(
        this.options.errorMessage ||
          'Invalid phone number format. Must be international format (e.g., +1234567890)',
      );
    }

    return value;
  }
}
