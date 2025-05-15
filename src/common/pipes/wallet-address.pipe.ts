import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';
import { isValidWalletAddress } from '../util/address.validator';

/**
 * Wallet address validation pipe
 *
 * Use in controller methods to validate wallet addresses:
 * @example
 * @Get(':address')
 * getUserByWallet(@Param('address', WalletAddressPipe) address: string) {
 *   // address is guaranteed to be a valid wallet address
 *   return this.userService.findByWallet(address);
 * }
 */
@Injectable()
export class WalletAddressPipe implements PipeTransform {
  /**
   * @param errorMessage Custom error message to use when validation fails
   */
  constructor(private readonly errorMessage?: string) {}

  transform(value: any, _metadata: ArgumentMetadata) {
    // Validate the input
    if (!value || !isValidWalletAddress(value)) {
      throw new BadRequestException(
        this.errorMessage || 'Invalid wallet address format',
      );
    }

    // Value is valid, return it
    return value;
  }
}
