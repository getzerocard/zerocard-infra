import { registerDecorator } from 'class-validator';
import type { IPhoneNumberValidatorOptions } from '../interfaces';

/**
 * Custom validator for phone numbers
 * Validates phone numbers in international format
 *
 * Valid formats:
 * - +1234567890
 * - +123 456 7890 (if allowSpaces = true)
 * - +123-456-7890 (if allowHyphens = true)
 *
 * @param validationOptions Additional validation options
 * @returns PropertyDecorator
 */
export function IsValidPhoneNumber(
  validationOptions?: IPhoneNumberValidatorOptions,
) {
  const allowSpaces = validationOptions?.allowSpaces !== false;
  const allowHyphens = validationOptions?.allowHyphens !== false;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message:
          'Phone number must be in a valid international format (e.g., +234XXXXXXXXXX)',
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Build regex pattern based on options
          let separatorPattern = '';
          if (allowSpaces && allowHyphens) {
            separatorPattern = '[\\s-]?';
          } else if (allowSpaces) {
            separatorPattern = '\\s?';
          } else if (allowHyphens) {
            separatorPattern = '-?';
          } else {
            // No separators allowed, just match pure digits
            return /^\+[1-9]\d{0,3}\d{7,14}$/.test(value);
          }

          // Match international format: +country code and 7-15 digits
          // with configurable separators
          const phoneRegex = new RegExp(
            `^\\+[1-9]\\d{0,3}${separatorPattern}(?:\\d${separatorPattern}){7,14}\\d$`,
          );
          return phoneRegex.test(value);
        },
      },
    });
  };
}
