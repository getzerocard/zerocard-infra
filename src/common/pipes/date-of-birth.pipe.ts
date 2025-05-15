import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Date of birth validation pipe
 *
 * Validates that:
 * - Value is a valid date
 * - Age is at least 18 years (or custom minimumAge)
 * - Date is not in the future
 *
 * @example
 * @Post()
 * createUser(@Body('dateOfBirth', new DateOfBirthPipe()) dateOfBirth: Date) {
 *   // dateOfBirth is guaranteed to be valid
 *   return this.userService.create({ dateOfBirth });
 * }
 */
@Injectable()
export class DateOfBirthPipe implements PipeTransform {
  /**
   * @param minimumAge Minimum age required (default: 18)
   * @param errorMessage Custom error message
   */
  constructor(
    private readonly minimumAge: number = 18,
    private readonly errorMessage?: string,
  ) {}

  transform(value: any, _metadata: ArgumentMetadata) {
    try {
      // Convert to Date if string
      const dateOfBirth = value instanceof Date ? value : new Date(value);

      // Check if date is valid
      if (isNaN(dateOfBirth.getTime())) {
        throw new Error('Invalid date format');
      }

      // Check if date is not in the future
      const today = new Date();
      if (dateOfBirth > today) {
        throw new Error('Date of birth cannot be in the future');
      }

      // Check if person meets minimum age requirement
      const age = today.getFullYear() - dateOfBirth.getFullYear();
      const monthDiff = today.getMonth() - dateOfBirth.getMonth();

      let isOldEnough = age > this.minimumAge;

      // If same year or months haven't passed yet, we need to check more carefully
      if (age === this.minimumAge) {
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
        ) {
          isOldEnough = false;
        }
      }

      if (!isOldEnough) {
        throw new Error(`Must be at least ${this.minimumAge} years old`);
      }

      // Return the valid date
      return dateOfBirth;
    } catch (error) {
      throw new BadRequestException(
        this.errorMessage ||
          (error instanceof Error ? error.message : 'Invalid date of birth'),
      );
    }
  }
}
