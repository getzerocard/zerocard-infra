import { Logger } from '@nestjs/common';

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  tokenAddress: string;
  rpcUrl: string;
  chainId: number;
  gatewayAddress: string;
  network: string;
  chainType: string;
  blockchainNetwork?: string; // Optional field to store the specific blockchain network name
}

const logger = new Logger('TokenService');

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
 * Fetches token information by symbol, network, chain type, and specific blockchain network
 * @param symbol - The token symbol to fetch (e.g., 'USDC', 'USDT')
 * @param network - The network to fetch tokens for (e.g., 'MAINET', 'TESTNET')
 * @param chainType - The blockchain type ('ethereum' or 'solana')
 * @param blockchainNetwork - The specific blockchain network name (e.g., 'BNB Smart Chain', 'Base')
 * @returns Token information or undefined if not found
 *
 * @example
 * // Using MAINET network with Ethereum on BNB Smart Chain
 * const token = getTokenBySymbol('USDT', 'MAINET', 'ethereum', 'BNB Smart Chain');
 *
 * // Using TESTNET network with Solana on Solana Devnet
 * const token = getTokenBySymbol('USDC', 'TESTNET', 'solana', 'Solana Devnet');
 *
 * Example return value:
 * {
 *   name: "Tether USD",
 *   symbol: "USDT",
 *   decimals: 18,
 *   tokenAddress: "0x55d398326f99059fF775485246999027B3197955",
 *   rpcUrl: "https://bsc-dataseed.binance.org",
 *   chainId: 56,
 *   gatewayAddress: "0x1FA0EE7F9410F6fa49B7AD5Da72Cf01647090028",
 *   network: "MAINET",
 *   chainType: "ethereum",
 *   blockchainNetwork: "BNB Smart Chain"
 * }
 */
export function getTokenBySymbol(
  symbol: string,
  network: string,
  chainType: string,
  blockchainNetwork?: string,
): Token | undefined {
  // Normalize inputs
  const normalizedSymbol = symbol.toUpperCase();
  const normalizedChainType = chainType.toLowerCase();
  const normalizedNetwork = network.toUpperCase();
  const normalizedBlockchainNetwork = blockchainNetwork ? normalizeNetworkName(blockchainNetwork) : undefined;

  logger.debug(
    `Fetching ${normalizedChainType} token ${normalizedSymbol} for network: ${normalizedNetwork}${normalizedBlockchainNetwork ? ' on ' + normalizedBlockchainNetwork : ''}`,
  );

  const tokens: { [key: string]: Token[] } = {
    Base: [
      {
        chainType: 'ethereum',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        tokenAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        rpcUrl: 'https://mainnet.base.org',
        chainId: 8453,
        gatewayAddress: '0x30f6a8457f8e42371e204a9c103f2bd42341dd0f',
        network: 'MAINET',
        blockchainNetwork: 'Base',
      },
    ],
    'Base Sepolia': [
      {
        chainType: 'ethereum',
        name: 'USD Coin Testnet',
        symbol: 'USDC',
        decimals: 6,
        tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        rpcUrl: 'https://sepolia.base.org',
        chainId: 84532,
        gatewayAddress: '0x847dfdaa218f9137229cf8424378871a1da8f625',
        network: 'TESTNET',
        blockchainNetwork: 'Base Sepolia',
      },
    ],
    'BNB Smart Chain': [
      {
        chainType: 'ethereum',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 18,
        tokenAddress: '0x55d398326f99059fF775485246999027B3197955',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        chainId: 56,
        gatewayAddress: '0x1FA0EE7F9410F6fa49B7AD5Da72Cf01647090028',
        network: 'MAINET',
        blockchainNetwork: 'BNB Smart Chain',
      },
      {
        chainType: 'ethereum',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 18,
        tokenAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        chainId: 56,
        gatewayAddress: '0x1FA0EE7F9410F6fa49B7AD5Da72Cf01647090028',
        network: 'MAINET',
        blockchainNetwork: 'BNB Smart Chain',
      },
    ],
    'BNB Smart Chain Testnet': [
      {
        chainType: 'ethereum',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 18,
        tokenAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        chainId: 97,
        gatewayAddress: '0x0000000000000000000000000000000000000000',
        network: 'TESTNET',
        blockchainNetwork: 'BNB Smart Chain Testnet',
      },
    ],
    Solana: [
      {
        chainType: 'solana',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        chainId: 101,
        gatewayAddress: '0x30f6a8457f8e42371e204a9c103f2bd42341dd0f',
        network: 'MAINET',
        blockchainNetwork: 'Solana',
      },
    ],
    'Solana Devnet': [
      {
        chainType: 'solana',
        name: 'USD Coin Devnet',
        symbol: 'USDC',
        decimals: 6,
        tokenAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        rpcUrl: 'https://api.devnet.solana.com',
        chainId: 103,
        gatewayAddress: '0x847dfdaa218f9137229cf8424378871a1da8f625',
        network: 'TESTNET',
        blockchainNetwork: 'Solana Devnet',
      },
    ],
  };

  // Find tokens matching the network and chain type
  const matchingTokens = Object.values(tokens)
    .flat()
    .filter(
      (token) =>
        token.network === normalizedNetwork &&
        token.chainType.toLowerCase() === normalizedChainType &&
        (!normalizedBlockchainNetwork || token.blockchainNetwork === normalizedBlockchainNetwork),
    );

  if (!matchingTokens.length) {
    logger.warn(
      `No ${normalizedChainType} tokens found for network: ${normalizedNetwork}${normalizedBlockchainNetwork ? ' on ' + normalizedBlockchainNetwork : ''}`,
    );
    return undefined;
  }

  // Find the token by symbol in the matching tokens
  const token = matchingTokens.find((t) => t.symbol === normalizedSymbol);

  if (!token) {
    logger.warn(
      `${normalizedChainType} token ${normalizedSymbol} not found for network: ${normalizedNetwork}${normalizedBlockchainNetwork ? ' on ' + normalizedBlockchainNetwork : ''}`,
    );
    return undefined;
  }

  return token;
}
