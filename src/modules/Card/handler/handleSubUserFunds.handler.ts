import { BadRequestException, Logger } from '@nestjs/common';
import type { User } from '../../user/entity/user.entity';
import { formatMoney, toMoney } from '../../../common/util/money';
import { getTokenBalance } from '../../../common/util/getTokenBalance';
import { validateUserAddressAndIdentity } from '../../../common/util/userValidation.util';

/**
 * Interface for the result of sub-user funds handling
 */
export interface SubUserFundsResult {
  isSubUser: boolean;
  mainUser: User | null;
  mainUserAddress: string | null;
  fundsLock: any | null;
}

/**
 * Handles sub-user funds lock and main user allowance check for card ordering.
 * @param user - The user entity to check for sub-user status
 * @param userId - The ID of the user
 * @param symbol - Token symbol to check allowance for
 * @param chainType - The blockchain type, either 'ethereum' or 'solana'
 * @param blockchainNetwork - The specific blockchain network to check
 * @param networkType - The network type, either 'MAINET' or 'TESTNET'
 * @param orderFee - The card order fee to check against
 * @param userRepository - Repository to fetch user data
 * @param privyService - The Privy service instance to fetch wallet information
 * @returns Promise<SubUserFundsResult> - The result of sub-user funds handling
 * @throws BadRequestException if main user fetch fails, wallet fetch fails, or allowance is insufficient
 */
export async function handleSubUserFunds(
  user: User,
  userId: string,
  symbol: string,
  chainType: 'ethereum' | 'solana',
  blockchainNetwork: string,
  networkType: 'MAINET' | 'TESTNET',
  orderFee: number,
  userRepository: any,
  privyService: any,
): Promise<SubUserFundsResult> {
  const isSubUser = !!user.parentUser;
  let mainUser: User | null = null;
  let mainUserAddress: string | null = null;
  let fundsLock: any | null = null;

  if (isSubUser) {
    mainUser = user.parentUser;
    if (!mainUser) {
      throw new BadRequestException(
        `Main user not found for sub-user ${userId}`,
      );
    }

    // Validate main user's address and identity using utility function
    validateUserAddressAndIdentity(mainUser, mainUser.userId);

    // Check for locked funds for this sub-user
    const fundsLockRepository =
      userRepository.manager.getRepository('FundsLock');
    fundsLock = await fundsLockRepository.findOne({
      where: {
        user: { userId: mainUser.userId },
        subUser: { userId: user.userId },
        type: 'SUBUSER_CARD_ORDER',
        status: 'LOCKED',
      },
      relations: ['user', 'subUser'],
    });

    if (fundsLock) {
      // Get main user's wallet address for allowance check only once
      const mainUserWalletPromise = privyService
        .getWalletId(mainUser.userId, chainType)
        .then((wallets) => {
          if (wallets.length === 0) {
            throw new BadRequestException(
              `No wallet found for main user ${mainUser.userId} to check allowance`,
            );
          }
          return wallets[0].address;
        })
        .catch((error) => {
          throw new BadRequestException(
            `Failed to fetch wallet for main user ${mainUser.userId}: ${error.message || error.toString()}`,
          );
        });

      const mainUserWalletResult = await Promise.allSettled([
        mainUserWalletPromise,
      ]);
      if (mainUserWalletResult[0].status === 'rejected') {
        throw new BadRequestException(mainUserWalletResult[0].reason.message);
      }
      mainUserAddress = mainUserWalletResult[0].value;

      // Perform allowance check on main user's address
      const allowanceCheckPromise = getTokenBalance(
        symbol,
        mainUserAddress,
        chainType,
        blockchainNetwork,
        networkType,
        userId,
        userRepository,
        fundsLockRepository,
      ).catch((error) => ({
        error,
        message: `Failed to check allowance for main user ${mainUser.userId}: ${error.message || error.toString()}`,
      }));

      const allowanceResult = await Promise.allSettled([allowanceCheckPromise]);
      if (allowanceResult[0].status === 'rejected') {
        throw new BadRequestException(allowanceResult[0].reason.message);
      }
      if (allowanceResult[0].value.error) {
        throw new BadRequestException(allowanceResult[0].value.message);
      }

      const allowanceData = allowanceResult[0].value;
      const allowanceStr = allowanceData[symbol]?.[blockchainNetwork] || '0';
      Logger.log(
        `Allowance result for ${symbol} on ${blockchainNetwork}: ${allowanceStr}`,
        'HandleSubUserFundsHandler',
      );

      if (
        allowanceStr.includes('Unsupported') ||
        allowanceStr.includes('Error')
      ) {
        throw new BadRequestException(
          `Allowance check failed for main user ${mainUser.userId}: ${allowanceStr}`,
        );
      }

      let allowanceDecimal;
      try {
        allowanceDecimal = toMoney(allowanceStr);
      } catch (e) {
        throw new BadRequestException(
          `Invalid allowance format for main user ${mainUser.userId}: ${allowanceStr}`,
        );
      }

      const orderFeeDecimal = toMoney(orderFee);
      if (!allowanceDecimal.gte(orderFeeDecimal)) {
        const allowanceFormatted = formatMoney(allowanceDecimal);
        const orderFeeFormatted = formatMoney(orderFeeDecimal);
        throw new BadRequestException(
          `Insufficient allowance for main user ${mainUser.userId}. Required: ${orderFeeFormatted}, Available: ${allowanceFormatted}`,
        );
      }
    }
  }

  return { isSubUser, mainUser, mainUserAddress, fundsLock };
}
