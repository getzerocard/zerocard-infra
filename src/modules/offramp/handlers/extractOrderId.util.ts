import { createPublicClient, decodeEventLog, http } from 'viem';

/**
 * Retrieves the transaction receipt after waiting for the transaction to be mined,
 * and extracts the order ID from the `OrderCreated` event log using viem.
 *
 * @param transactionHash - The hash of the transaction that created the order.
 * @param providerRpcUrl - The RPC URL for the blockchain provider.
 * @param gatewayAbi - The ABI of the gateway contract (must include the `OrderCreated` event).
 * @param timeoutMs - Maximum time in milliseconds to wait for the transaction to be mined (default: 120000 ms = 2 minutes).
 * @param chain - Optional chain object or chain ID for the network.
 * @param gatewayAddress - Optional address of the gateway contract to filter logs.
 * @returns Promise<string> - The extracted `orderId` as a string.
 *
 * @throws {Error} If the transaction times out, fails, or the receipt/event/argument is not found.
 */
export async function extractOrderIdFromHash(
  transactionHash: `0x${string}`,
  providerRpcUrl: string,
  gatewayAbi: any,
  timeoutMs: number = 120000,
  chain?: any,
  gatewayAddress?: `0x${string}`,
): Promise<string> {
  const publicClient = createPublicClient({
    chain: chain || { id: 1 }, // Default to Ethereum mainnet ID if not provided
    transport: http(providerRpcUrl),
  });

  // Wait for the transaction to be mined
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
    timeout: timeoutMs,
  });

  if (!receipt) {
    throw new Error(
      `Transaction mining timed out after ${timeoutMs}ms for hash: ${transactionHash}`,
    );
  }

  if (receipt.status !== 'success') {
    throw new Error(
      `Transaction failed. Status: ${receipt.status}, Hash: ${transactionHash}`,
    );
  }

  if (!receipt.logs || receipt.logs.length === 0) {
    throw new Error(
      `No logs found in transaction receipt for hash: ${transactionHash}`,
    );
  }

  // Find and decode the `OrderCreated` event log
  let orderId: string | undefined;

  for (const log of receipt.logs) {
    if (
      !gatewayAddress ||
      log.address.toLowerCase() === gatewayAddress.toLowerCase()
    ) {
      try {
        const decodedLog = decodeEventLog({
          abi: gatewayAbi,
          eventName: 'OrderCreated',
          data: log.data,
          topics: log.topics,
        });

        orderId = (decodedLog.args as any).orderId?.toString();
        if (orderId) {
          break; // Exit the loop once the orderId is found
        }
      } catch {
        // Ignore logs that don't match the `OrderCreated` event signature
        continue;
      }
    }
  }

  if (!orderId) {
    throw new Error(
      `OrderCreated event not found or orderId argument missing in transaction logs for hash: ${transactionHash}`,
    );
  }

  return orderId;
}
