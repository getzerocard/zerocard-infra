import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { getTokenBalance } from '../../../common/util/getTokenBalance';
import type { User } from '../../user/entity/user.entity';
import { toMoney } from '../../../common/util/money';

/**
 * Checks if a user has sufficient balance to set a spending limit.
 * For sub-users, it uses the parent user's ID to fetch the wallet address.
 * This function checks a single token balance on a specific network.
 * @param userId - The ID of the user requesting the spending limit.
 * @param usdAmount - The requested spending limit amount in USD.
 * @param symbol - Token symbol to check balance for (single string).
 * @param chainType - The blockchain type, either 'ethereum' or 'solana'.
 * @param blockchainNetwork - The specific blockchain network to check (single string).
 * @param networkType - The network environment, either 'MAINET' or 'TESTNET'.
 * @param userRepository - Repository to fetch user data.
 * @param privyService - Service to fetch wallet ID.
 * @param fundsLockRepository - Repository to fetch funds lock data (optional).
 * @returns Promise<boolean> - True if balance is sufficient, false otherwise.
 * @throws NotFoundException - If user or wallet ID is not found.
 * @throws BadRequestException - If balance check fails or other validation errors occur.
 */
export async function limitBalanceCheck(
  userId: string,
  usdAmount: number | string,
  symbol: string,
  chainType: 'ethereum' | 'solana',
  blockchainNetwork: string,
  networkType: 'MAINET' | 'TESTNET',
  userRepository: any,
  privyService: any,
  fundsLockRepository: any = null,
): Promise<boolean> {
  const logger = new Logger('LimitBalanceCheck');
  // Step 1: Validate usdAmount is positive
  const usdAmountDecimal = toMoney(usdAmount);
  if (usdAmountDecimal.lte(0)) {
    logger.warn(
      `Invalid spending limit amount ${usdAmount} for user ${userId}: Amount must be positive`,
    );
    throw new BadRequestException(
      `Spending limit amount must be greater than zero`,
    );
  }

  // Sanity check for extremely large USD amount
  const MAX_REASONABLE_AMOUNT = toMoney(1000000000); // 1 billion USD as a reasonable threshold
  if (usdAmountDecimal.gt(MAX_REASONABLE_AMOUNT)) {
    logger.warn(
      `Extremely large spending limit amount requested: ${usdAmountDecimal.toString()} USD for user ${userId}`,
    );
    throw new BadRequestException(
      `Requested spending limit amount exceeds reasonable threshold`,
    );
  }

  // Step 2: Fetch user and determine the correct user ID for wallet lookup (parent for sub-users)
  const user: User = await userRepository.findOne({
    where: { userId },
    relations: ['parentUser'],
  });
  if (!user) {
    logger.error(`User with ID ${userId} not found`);
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  const walletUserId = user.isMainUser
    ? userId
    : user.parentUser
      ? user.parentUser.userId
      : null;
  if (!walletUserId) {
    logger.warn(`No parent user ID found for sub-user ${userId}`);
    throw new BadRequestException(
      `No parent user ID found for sub-user ${userId}`,
    );
  }

  // Step 3: Resolve wallet address using privyService
  let userAddress: string;
  try {
    // Fetch the array of wallets for the specified chain type
    const wallets = await privyService.getWalletId(walletUserId, chainType);

    // Check if any wallets were found for the given chainType
    if (!wallets || wallets.length === 0) {
      logger.warn(
        `No ${chainType} wallet address found for user ${walletUserId}`,
      );
      throw new NotFoundException(
        `No ${chainType} wallet address found for user ${walletUserId}. Ensure a wallet for this chain is linked.`,
      );
    }

    // Use the address from the first wallet found
    userAddress = wallets[0].address;

    if (!userAddress) {
      // This case might be redundant if privyService ensures address is always present in the returned object, but good for safety
      logger.warn(
        `Found wallet object for user ${walletUserId} on ${chainType} but address field is missing.`,
      );
      throw new NotFoundException(
        `Wallet found for user ${walletUserId} on ${chainType}, but address is missing.`,
      );
    }

    logger.debug(
      `Successfully retrieved ${chainType} address ${userAddress} for user ${walletUserId}`,
    );
  } catch (error: any) {
    // Log the specific error caught
    logger.error(
      `Error retrieving wallet address for user ${walletUserId} on ${chainType}: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );

    // Re-throw specific exceptions or a generic one
    if (error instanceof NotFoundException) {
      throw error; // Re-throw NotFoundException as is
    }
    // Catch other potential errors from privyService.getWalletId
    throw new BadRequestException(
      `Failed to resolve ${chainType} wallet address for user ${walletUserId}: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
    );
  }

  // Step 4: Normalize token symbol and network for case sensitivity
  const normalizedSymbol = symbol.toUpperCase();
  // Network name normalization is now handled within getTokenBalance and fetchsupportedTokens
  // const normalizedNetwork = blockchainNetwork
  //   .split(' ')
  //   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  //   .join(' ');
  logger.log(
    `Checking balance for ${normalizedSymbol} on ${blockchainNetwork} for user ${userId}`,
  );

  // Step 5: Check user's token balance using getTokenBalance with timeout handling
  let balanceResult;
  try {
    // Simple timeout wrapper (assuming a 10-second timeout for network calls)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Balance check timed out after 10 seconds')),
        10000,
      );
    });

    // Get the wallet user ID (main user or parent user ID)
    // This ensures we're using the correct user ID for balance checks
    const walletUserId = user.isMainUser ? userId : user.parentUser?.userId || userId;

    balanceResult = await Promise.race([
      getTokenBalance(
        normalizedSymbol,
        userAddress,
        chainType,
        blockchainNetwork, // Pass the original blockchainNetwork directly
        networkType,
        walletUserId, // Pass the correct user ID for locks
        userRepository, // Pass repository for user lookup
        fundsLockRepository // Pass funds lock repository for lock checks
      ),
      timeoutPromise,
    ]);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to check balance for user ${userId}: ${errorMessage}`);
    throw new BadRequestException(
      `Failed to check balance for user ${userId}: ${errorMessage}`,
    );
  }

  // Step 6: Process balance result (check if the balance meets or exceeds the requested USD amount)
  // Note: We still need to normalize the network name here for the result lookup
  const normalizedNetworkForResultLookup = blockchainNetwork
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  const balanceStr =
    balanceResult[normalizedSymbol]?.[normalizedNetworkForResultLookup] || '0';

  // Handle potential non-numeric or error messages
  if (balanceStr.includes('Unsupported') || balanceStr.includes('Error')) {
    logger.warn(
      `Unsupported combination or error for ${normalizedSymbol} on ${normalizedNetworkForResultLookup} for user ${userId}`,
    );
    throw new BadRequestException(
      `Token ${normalizedSymbol} on network ${normalizedNetworkForResultLookup} is not supported or encountered an error`,
    );
  }

  try {
    const balanceDecimal = toMoney(balanceStr);
    // Sanity check for extremely large balance
    if (balanceDecimal.gt(MAX_REASONABLE_AMOUNT)) {
      logger.warn(
        `Extremely large balance detected: ${balanceDecimal.toString()} for user ${userId} with token ${normalizedSymbol} on ${normalizedNetworkForResultLookup}`,
      );
    }
    logger.log(
      `Balance for user ${userId}: ${balanceDecimal.toString()}, Required: ${usdAmountDecimal.toString()}`,
    );
    return balanceDecimal.gte(usdAmountDecimal);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logger.error(
      `Failed to convert balance string ${balanceStr} to Decimal for user ${userId}: ${errorMessage}`,
    );
    throw new BadRequestException(
      `Failed to process balance data for user ${userId}`,
    );
  }
}
