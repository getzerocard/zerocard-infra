import { BadRequestException } from '@nestjs/common';

/**
 * Fetches and validates user wallet information for card ordering.
 * @param userId - The ID of the user to fetch wallet for
 * @param chainType - The blockchain type, either 'ethereum' or 'solana'
 * @param privyService - The Privy service instance to fetch wallet information
 * @returns Promise<string> - The user's wallet address
 * @throws BadRequestException if wallet fetch fails or no wallet is found
 */
export async function fetchWallet(
  userId: string,
  chainType: 'ethereum' | 'solana',
  privyService: any,
): Promise<string> {
  const userWalletPromise = privyService
    .getWalletId(userId, chainType)
    .then((wallets) => {
      if (wallets.length === 0) {
        throw new BadRequestException(
          `No wallet found for user ${userId} to check balance`,
        );
      }
      return wallets[0].address;
    })
    .catch((error) => {
      throw new BadRequestException(
        `Failed to fetch wallet for user ${userId}: ${error.message || error.toString()}`,
      );
    });

  const userWalletResult = await Promise.allSettled([userWalletPromise]);

  if (userWalletResult[0].status === 'rejected') {
    throw new BadRequestException(userWalletResult[0].reason.message);
  }

  return userWalletResult[0].value;
}
