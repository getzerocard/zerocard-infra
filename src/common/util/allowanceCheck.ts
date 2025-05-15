import type { InterfaceAbi } from 'ethers';
import { Contract, JsonRpcProvider } from 'ethers';

// Helper function for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks if the token allowance granted by an owner to a spender is sufficient.
 * Polls up to 4 times (5 attempts total) with a 1-second delay if insufficient.
 * Throws an error if the allowance remains insufficient after all attempts.
 *
 * @param providerRpcUrl - The RPC URL for the blockchain provider.
 * @param tokenAddress - The address of the ERC20 token contract.
 * @param tokenAbi - The ABI for the ERC20 token contract (must include 'allowance').
 * @param ownerAddress - The address of the token owner (who granted the allowance).
 * @param spenderAddress - The address of the spender (who is approved to spend).
 * @param requiredAmount - The minimum required allowance amount as a BigInt.
 * @param maxAttempts - Maximum number of attempts (default: 5 = 1 initial + 4 retries)
 * @param pollIntervalMs - Interval between retries in milliseconds (default: 500)
 */
export async function allowanceCheck(
  providerRpcUrl: string,
  tokenAddress: string,
  tokenAbi: InterfaceAbi,
  ownerAddress: string,
  spenderAddress: string,
  requiredAmount: bigint,
  maxAttempts: number = 5,
  pollIntervalMs: number = 1000,
): Promise<void> {
  const provider = new JsonRpcProvider(providerRpcUrl);
  const tokenContract = new Contract(tokenAddress, tokenAbi, provider);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const currentAllowance = await tokenContract.allowance(
        ownerAddress,
        spenderAddress,
      );

      if (currentAllowance >= requiredAmount) {
        return; // Success!
      }

      lastError = new Error(
        `Insufficient token allowance after ${attempt} attempts. Required: ${requiredAmount}, Found: ${currentAllowance}`,
      );
    } catch (error) {
      lastError = new Error(
        `Failed to verify token allowance due to contract error on attempt ${attempt}.`,
      );
    }

    if (attempt === maxAttempts) {
      throw (
        lastError || new Error('Allowance check failed after maximum attempts.')
      );
    }

    // Increase delay with each attempt to avoid rate limiting
    await delay(pollIntervalMs * attempt);
  }
}
