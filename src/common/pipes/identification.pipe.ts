import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';

export type IdentificationType = 'BVN' | 'NIN';

/**
 * Identification number validation pipe
 *
 * Validates BVN and NIN numbers:
 * - BVN: 11 digits (or custom length)
 * - NIN: 11 digits (or custom length)
 * - Only one of BVN or NIN can be provided, not both
 *
 * @example
 * @Post()
 * createUser(
 *   @Body('identificationType') type: IdentificationType,
 *   @Body('identificationNumber', new IdentificationPipe()) number: string
 * ) {
 *   return this.userService.create({ identification: { type, number } });
 * }
 *
 * // Or with type specified in the pipe:
 * @Post()
 * createUser(
 *   @Body('identificationNumber', new IdentificationPipe('BVN')) number: string
 * ) {
 *   return this.userService.create({ identification: { type: 'BVN', number } });
 * }
 *
 * // Check for exclusive BVN/NIN (not both)
 * @Post()
 * createUser(
 *   @Body() body: any,
 *   @Body('bvn', new IdentificationPipe('BVN', 11, undefined, 'bvn', body)) bvn?: string,
 *   @Body('nin', new IdentificationPipe('NIN', 11, undefined, 'nin', body)) nin?: string,
 * ) {
 *   if (bvn && nin) {
 *     throw new BadRequestException('You can only provide either BVN or NIN, not both');
 *   }
 *   // ...process valid input
 * }
 */
@Injectable()
export class IdentificationPipe implements PipeTransform {
  /**
   * @param type Specific type to validate (BVN or NIN)
   * @param length Expected length of the identification number (default: 11)
   * @param errorMessage Custom error message
   * @param fieldName Field name in the request body for exclusive checking
   * @param requestBody Complete request body for exclusive checking
   */
  constructor(
    private readonly type?: IdentificationType,
    private readonly length: number = 11,
    private readonly errorMessage?: string,
    private readonly fieldName?: string,
    private readonly requestBody?: any,
  ) {}

  transform(value: any, _metadata: ArgumentMetadata) {
    // If value is undefined or null, and we're doing exclusive checking
    if (!value && this.fieldName && this.requestBody) {
      return undefined;
    }

    // Skip validation if value isn't provided
    if (value === undefined || value === null) {
      return value;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(
        this.errorMessage || 'Identification number must be a string',
      );
    }

    // Check if value contains exactly the specified number of digits and nothing else
    const numberRegex = new RegExp(`^\\d{${this.length}}$`);
    if (!numberRegex.test(value)) {
      const typeMsg = this.type ? `${this.type} ` : '';
      throw new BadRequestException(
        this.errorMessage ||
          `${typeMsg}number must be exactly ${this.length} digits`,
      );
    }

    // If we have the request body and we're checking for exclusivity
    if (this.fieldName && this.requestBody) {
      const otherField = this.fieldName === 'bvn' ? 'nin' : 'bvn';
      if (this.requestBody[this.fieldName] && this.requestBody[otherField]) {
        throw new BadRequestException(
          'You can only provide either BVN or NIN, not both',
        );
      }
    }

    return value;
  }
}
