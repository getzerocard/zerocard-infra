import { registerDecorator } from 'class-validator';
import { isValidWalletAddress } from '../util/address.validator';
import type { IWalletAddressValidatorOptions } from '../interfaces';

/**
 * Custom decorator for validating wallet addresses in DTOs
 *
 * @param validationOptions - Standard class-validator options
 * @returns PropertyDecorator
 *
 * @example
 * export class WalletDto {
 *   @IsWalletAddress()
 *   address: string;
 * }
 */
export function IsWalletAddress(
  validationOptions?: IWalletAddressValidatorOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isWalletAddress',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} must be a valid wallet address`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          return typeof value === 'string' && isValidWalletAddress(value);
        },
      },
    });
  };
}
