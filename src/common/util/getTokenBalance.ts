import { Logger } from '@nestjs/common';
import type { Token } from './fetchsupportedTokens';
import { getTokenBySymbol } from './fetchsupportedTokens';
import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';

const logger = new Logger('TokenBalanceService');

/**
 * Helper function to normalize blockchain network names by capitalizing each word
 * @param networkName The network name to normalize
 * @returns The normalized network name with each word capitalized
 */
function normalizeNetworkName(networkName: string): string {
  if (!networkName) return '';
  return networkName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Fetches token balances for specified symbols across given blockchain networks, considering locked funds for parent users or sub-users with constraints.
 * @param symbols - The token symbol(s) to check balances for. Can be a single string, comma-separated string, or array of strings.
 * @param userAddress - The wallet address to check balances for.
 * @param chainType - The blockchain type, either 'ethereum' or 'solana'.
 * @param blockchainNetwork - The specific blockchain network(s) to check. Can be a single string or array of strings.
 * @param networkType - The network environment, either 'MAINET' or 'TESTNET'.
 * @param userId - Optional ID of the user to check for parent status and locked funds.
 * @param userRepository - Optional repository for user data, can be passed for dependency injection.
 * @param fundsLockRepository - Optional repository for funds lock data, can be passed for dependency injection.
 * @returns A promise resolving to a nested object with token symbols mapping to network-specific balance results as strings.
 * Example response structure:
 * ```
 * {
 *   'USDC': {
 *     'Base': '109987.688765',
 *     'Arbitrum': 'Unsupported combination',
 *     'Polygon': 'Unsupported combination',
 *     'BNB Smart Chain': '42273.0059004389'
 *   },
 *   'USDT': {
 *     'Base': 'Unsupported combination',
 *     'Arbitrum': 'Unsupported combination',
 *     'Polygon': 'Unsupported combination',
 *     'BNB Smart Chain': '496377.397493132805701098'
 *   }
 * }
 * ```
 * @example
 * // Single token and network
 * const balances = await getTokenBalance('USDC', '0xAddress', 'ethereum', 'Base', 'MAINET');
 * // Multiple tokens as comma-separated string
 * const balances = await getTokenBalance('USDC,USDT', '0xAddress', 'ethereum', ['Base', 'BNB Smart Chain'], 'MAINET', 'user123');
 * // Multiple tokens as array
 * const balances = await getTokenBalance(['USDC', 'USDT'], '0xAddress', 'ethereum', ['Base', 'BNB Smart Chain'], 'MAINET', 'user123');
 */
export async function getTokenBalance(
  symbols: string | string[],
  userAddress: string,
  chainType: 'ethereum' | 'solana',
  blockchainNetwork: string | string[],
  networkType: 'MAINET' | 'TESTNET',
  userId?: string,
  userRepository?: any,
  fundsLockRepository?: any,
): Promise<Record<string, Record<string, string>>> {
  logger.log(`Network type passed: ${networkType}`);
  logger.log(`Blockchain network passed: ${blockchainNetwork}`);
  logger.log(`Symbols passed: ${symbols}`);
  logger.log(`User ID passed: ${userId}`);
  logger.log(`User repository passed: ${!!userRepository}`);
  logger.log(`Funds lock repository passed: ${!!fundsLockRepository}`);
  logger.debug(`User address: ${userAddress}`);
  // Normalize inputs to arrays
  const symbolArray = Array.isArray(symbols)
    ? symbols
    : symbols.split(',').map((s) => s.trim());
  const networkArray = Array.isArray(blockchainNetwork)
    ? blockchainNetwork.map(network => normalizeNetworkName(network))
    : [normalizeNetworkName(blockchainNetwork)];

  logger.debug(`Normalized networks: ${networkArray.join(', ')}`);

  // Get all token-network combinations
  const tokenMap: Record<string, Record<string, Token | undefined>> = {};
  const missingCombinations: string[] = [];

  symbolArray.forEach((symbol) => {
    tokenMap[symbol] = {};
    networkArray.forEach((network) => {
      const token = getTokenBySymbol(symbol, networkType, chainType, network);
      logger.log(`Token config for ${symbol} on ${network} (${chainType}, ${networkType}): ${JSON.stringify(token)}`);
      tokenMap[symbol][network] = token;
      if (!token) {
        missingCombinations.push(`${symbol} on ${network}`);
      }
    });
  });

  // Log unsupported combinations but don't throw error
  if (missingCombinations.length > 0) {
    logger.warn(
      `Unsupported token-network combinations: ${missingCombinations.join(', ')}`,
    );
  }

  // Check user status and locked funds only if userId and repositories are provided
  const lockedBalances: Record<string, number> = {};

  if (userId) {
    if (!userRepository || !fundsLockRepository) {
      const missingRepos: string[] = [];
      if (!userRepository) missingRepos.push('userRepository');
      if (!fundsLockRepository) missingRepos.push('fundsLockRepository');
      const errorMessage = `If userId ('${userId}') is provided, then ${missingRepos.join(
        ' and ',
      )} must also be provided to calculate accurate available balance.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const user = await userRepository.findOne({ where: { userId } });
      if (user) {
        if (user.isMainUser || user.parentUser) {
          const locks = await fundsLockRepository.find({
            where: { user: { id: user.id }, status: 'LOCKED' },
          });
          locks.forEach((lock) => {
            if (
              lock.tokenSymbolLocked &&
              lock.amountLocked &&
              lock.chain &&
              lock.blockchainNetwork
            ) {
              // Create a unique key for the combination of symbol, chain, and network
              const key = `${lock.tokenSymbolLocked}-${lock.chain}-${lock.blockchainNetwork}`;
              lockedBalances[key] =
                (lockedBalances[key] || 0) +
                parseFloat(lock.amountLocked.toString());
            }
          });
          logger.log(
            `Found locked balances for user ${userId}: ${JSON.stringify(lockedBalances)}`,
          );
        } else {
          logger.log(
            `User ${userId} is not a parent or sub-user with constraints, no balance deduction.`,
          );
        }
      } else {
        logger.warn(
          `User ${userId} not found, proceeding without balance deduction.`,
        );
      }
    } catch (error) {
      logger.error(
        `Error checking user status or locked funds for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  try {
    // Prepare balance promises for all valid combinations
    const balancePromises: Promise<{
      symbol: string;
      network: string;
      balance: string;
    }>[] = [];

    symbolArray.forEach((symbol) => {
      networkArray.forEach((network) => {
        const token = tokenMap[symbol][network];
        if (token) {
          const promise = new Promise<{
            symbol: string;
            network: string;
            balance: string;
          }>(async (resolve) => {
            let attempts = 0;
            const maxRetries = 2;
            let _lastError: any;

            while (attempts <= maxRetries) {
              attempts++;
              try {
                const balance = await (chainType.toLowerCase() === 'ethereum'
                  ? getEVMBalance(userAddress, token)
                  : getSolanaBalance(userAddress, token));
                // Deduct locked balance if applicable - this is mandatory if a locked balance exists for this symbol, chain, and network combination
                const numericBalance = parseFloat(balance);
                // Create a unique key for the current token, chain, and network
                const key = `${symbol}-${chainType}-${network}`;
                const lockedAmount = lockedBalances[key] || 0;
                const adjustedBalance =
                  lockedAmount > 0
                    ? Math.max(0, numericBalance - lockedAmount)
                    : numericBalance;
                logger.log(
                  `Balance for ${symbol} on ${network} (${chainType}) for user ${userId || 'unknown'}: Total=${numericBalance}, Locked=${lockedAmount}, Adjusted=${adjustedBalance}`,
                );
                resolve({
                  symbol,
                  network,
                  balance: adjustedBalance.toString(),
                });
                return; // Exit loop on success
              } catch (error) {
                _lastError = error;
                logger.error(
                  `Attempt ${attempts} failed for ${symbol} on ${network}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
                if (attempts > maxRetries) {
                  logger.error(
                    `Failed to fetch balance for ${symbol} on ${network} after ${maxRetries + 1} attempts`,
                  );
                  resolve({
                    symbol,
                    network,
                    balance: 'Error fetching balance',
                  });
                  return;
                }
                // Wait before retrying
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * attempts),
                );
              }
            }
          });
          balancePromises.push(promise);
        }
      });
    });

    const balanceResults = await Promise.all(balancePromises);

    // Build nested result structure
    const result: Record<string, Record<string, string>> = {};
    symbolArray.forEach((symbol) => {
      result[symbol] = {};
      networkArray.forEach((network) => {
        const balanceResult = balanceResults.find(
          (r) => r.symbol === symbol && r.network === network,
        );
        if (balanceResult) {
          result[symbol][network] = balanceResult.balance;
        } else {
          result[symbol][network] = 'Unsupported combination';
        }
      });
    });

    return result;
  } catch (error) {
    logger.error(
      `Balance check failed: ${error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
    // Return partial results if possible, otherwise throw
    const partialResult: Record<string, Record<string, string>> = {};
    symbolArray.forEach((symbol) => {
      partialResult[symbol] = {};
      networkArray.forEach((network) => {
        partialResult[symbol][network] = 'Error fetching balance';
      });
    });
    return partialResult;
  }
}

async function getEVMBalance(
  userAddress: string,
  token: Token,
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(token.rpcUrl);
  const contract = new ethers.Contract(
    token.tokenAddress,
    ['function balanceOf(address) view returns (uint256)'],
    provider,
  );

  const balance = await contract.balanceOf(userAddress);
  return ethers.formatUnits(balance, token.decimals);
}

async function getSolanaBalance(
  userAddress: string,
  token: Token,
): Promise<string> {
  const connection = new Connection(token.rpcUrl);
  const publicKey = new PublicKey(userAddress);
  const tokenAccount = await connection.getTokenAccountsByOwner(publicKey, {
    mint: new PublicKey(token.tokenAddress),
  });

  if (tokenAccount.value.length === 0) return '0';

  const balance = await connection.getTokenAccountBalance(
    tokenAccount.value[0].pubkey,
  );

  return (
    Number(balance.value.amount) / Math.pow(10, token.decimals)
  ).toString();
}
//TODO: Add a solana balance deduction of locked tokens when you integrate solana into the project and balance chcek into the project that support solana
