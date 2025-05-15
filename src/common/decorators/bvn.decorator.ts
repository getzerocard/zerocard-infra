import { registerDecorator } from 'class-validator';
import type { IBVNValidatorOptions } from '../interfaces';

/**
 * Custom validator for Bank Verification Number (BVN)
 * Validates that the BVN is exactly 11 digits (or custom length)
 *
 * @param validationOptions Additional validation options
 * @returns PropertyDecorator
 */
export function IsValidBVN(validationOptions?: IBVNValidatorOptions) {
  const length = validationOptions?.length || 11;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidBVN',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `BVN must be exactly ${length} digits`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Check if value contains exactly the specified number of digits and nothing else
          const bvnRegex = new RegExp(`^\\d{${length}}$`);
          return bvnRegex.test(value);
        },
      },
    });
  };
}
