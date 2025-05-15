/**
 * Re-export all custom decorators from a central location
 * This allows importing decorators from a consistent path
 * across the application.
 *
 * Example: import { PrivyUser } from '@common/decorators';
 */

// Auth decorators
export { PrivyUser } from '../../modules/auth/decorators/privy-user.decorator';

// Validation decorators
export { IsWalletAddress } from './wallet-address.decorator';
export { IsValidDateOfBirth } from './date-of-birth.decorator';
export { IsValidPhoneNumber } from './phone-number.decorator';
export { IsValidBVN } from './bvn.decorator';
export { IsValidNIN } from './nin.decorator';

export { Trim } from './trim.decorator';

export * from './api-response.decorator';
