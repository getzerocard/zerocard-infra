/**
 * Extract wallet addresses from data and format them properly
 *
 * @param data - Data potentially containing wallet addresses
 * @returns Formatted data with proper wallet address fields
 */
export function extractWalletAddresses(
  data: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = { ...data };

  // Map of chain names to their corresponding entity fields
  const chainMapping = {
    ethereum: 'EVMWalletAddress',
    solana: 'SolanaWalletAddress',
    bitcoin: 'BitcoinWalletAddress',
    tron: 'TronWalletAddress',
    // Map additional chains as they're added to the system
  };

  // Process each potential chain key
  for (const [chainName, entityField] of Object.entries(chainMapping)) {
    if (chainName in data && data[chainName]) {
      result[entityField] = data[chainName];
      // Remove the original chain property to avoid duplicate storage
      delete result[chainName];
    }
  }

  return result;
}
