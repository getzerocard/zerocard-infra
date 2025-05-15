import type { ValidationArguments } from 'class-validator';
import { registerDecorator } from 'class-validator';
import type { IDateOfBirthValidatorOptions } from '../interfaces';

/**
 * Custom validator for date of birth
 * Validates that:
 * - Value is a valid date
 * - Age is at least 18 years (or custom minimumAge)
 * - Date is not in the future
 *
 * @param validationOptions Additional validation options with minimumAge setting
 * @returns PropertyDecorator
 */
export function IsValidDateOfBirth(
  validationOptions?: IDateOfBirthValidatorOptions,
) {
  const minimumAge = validationOptions?.minimumAge || 18;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateOfBirth',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `Date of birth must be a valid date and person must be at least ${minimumAge} years old`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (!(value instanceof Date) && typeof value !== 'string') {
            return false;
          }

          const dateOfBirth = value instanceof Date ? value : new Date(value);

          // Check if date is valid
          if (isNaN(dateOfBirth.getTime())) {
            return false;
          }

          // Check if date is not in the future
          const today = new Date();
          if (dateOfBirth > today) {
            return false;
          }

          // Check if person meets minimum age requirement
          const age = today.getFullYear() - dateOfBirth.getFullYear();
          const monthDiff = today.getMonth() - dateOfBirth.getMonth();

          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
          ) {
            return age - 1 >= minimumAge;
          }

          return age >= minimumAge;
        },
      },
    });
  };
}
