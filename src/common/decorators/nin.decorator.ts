import { registerDecorator } from 'class-validator';
import type { ININValidatorOptions } from '../interfaces';

/**
 * Custom validator for National Identification Number (NIN)
 * Validates that the NIN is exactly 11 digits (or custom length)
 *
 * @param validationOptions Additional validation options
 * @returns PropertyDecorator
 */
export function IsValidNIN(validationOptions?: ININValidatorOptions) {
  const length = validationOptions?.length || 11;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidNIN',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `NIN must be exactly ${length} digits`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Check if value contains exactly the specified number of digits and nothing else
          const ninRegex = new RegExp(`^\\d{${length}}$`);
          return ninRegex.test(value);
        },
      },
    });
  };
}
