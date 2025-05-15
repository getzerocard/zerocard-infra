/**
 * Common auth guard export
 * This provides a single source of truth for authentication guards
 */

import { PrivyAuthGuard as OriginalPrivyAuthGuard } from '../../modules/auth/guards/privy-auth.guard';

// Export the guard with the same name for consistency
export const PrivyAuthGuard = OriginalPrivyAuthGuard;
