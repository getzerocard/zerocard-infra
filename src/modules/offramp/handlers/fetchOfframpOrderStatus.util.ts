import { Logger } from '@nestjs/common';
import { calculateWeightedRate } from './calculateWeightedRate.util';
// Assuming ConfigService might be needed if AGGREGATOR_URL comes from config

const logger = new Logger('FetchOfframpOrderStatus');

// Define a basic structure for the expected response
// Adjust this based on the actual API response structure
interface OrderStatusData {
  orderId: string;
  chainId: string;
  status: string;
  // Add other relevant fields from the API response
  amount: string;
  token: string;
  settlePercent: string;
  txHash: string;
  settlements?: {
    splitOrderId: string;
    amount: string;
    rate: string;
    orderPercent: string;
  }[];
  txReceipts?: { status: string; txHash: string; timestamp: string }[];
  updatedAt: string;
  [key: string]: any;
}

interface OrderStatusResponse {
  data: OrderStatusData;
  // Add other top-level fields if they exist
}

/**
 * Fetches the status of an offramp order from the aggregator.
 *
 * @param aggregatorUrl - The base URL of the aggregator API.
 * @param chainId - The blockchain chain ID.
 * @param orderId - The order ID to check.
 * @returns Promise<{ OrderID: string; Amount: string; Token: string; Status: string; TxHash: string; Rate?: string; }> - The order status data with an optional weighted average rate.
 *
 * @example
 * const status = await fetchOfframpOrderStatus('https://api.aggregator.com/v1', '137', 'order123');
 * // Returns: { OrderID: 'order123', Amount: '100.00', Token: 'ETH', Status: 'settled', TxHash: '0xabcdef123456...', Rate: '1.05' }
 */
export async function fetchOfframpOrderStatus(
  aggregatorUrl: string, // Pass aggregatorUrl directly
  chainId: string,
  orderId: string,
): Promise<{
  OrderID: string;
  Amount: string;
  Token: string;
  Status: string;
  TxHash: string;
  Rate?: string;
}> {
  // Outer try-catch for any unexpected errors within the function's scope
  try {
    if (!aggregatorUrl) {
      // This check is fine here, it's a precondition.
      throw new Error('Aggregator URL is required');
    }

    const maxRetries = 5; // Maximum number of retry attempts if status is pending
    const retryIntervalMs = 2000; // Retry every 2 seconds

    // Add a 1-second delay before the first attempt to allow for aggregator processing
    logger.log(
      `Waiting 1 second before first attempt to fetch status for order ${orderId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Set a timeout of 3 seconds for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(
          `${aggregatorUrl}/orders/${chainId}/${orderId}`,
          { signal: controller.signal },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text(); // Try to get more error details
          logger.error(
            `HTTP error fetching order status (attempt ${attempt + 1}/${maxRetries + 1}): ${response.status} - ${response.statusText}. Body: ${errorBody}`,
          );
          // For non-retryable HTTP errors (e.g., 400-range errors excluding 404), throw immediately without retrying
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 404
          ) {
            throw new Error(
              `Non-retryable HTTP error! status: ${response.status}`,
            );
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: OrderStatusResponse = await response.json();
        if (!data || !data.data) {
          logger.error(
            'Invalid response structure received from aggregator',
            data,
          );
          throw new Error('Invalid response structure from aggregator');
        }

        // Extract specific fields as requested
        const extractedData = {
          OrderID: data.data.orderId,
          Amount: data.data.amount,
          Token: data.data.token,
          Status: data.data.status,
          TxHash: data.data.txHash,
          Rate: '', // Initialize Rate as empty string, will be updated if calculated
          // Include any other fields if necessary
        };

        // Calculate rate if settlements exist, regardless of status
        if (data.data.settlements && Array.isArray(data.data.settlements)) {
          extractedData.Rate = calculateWeightedRate(data.data.settlements);
        }

        // Handle status cases for retry logic only
        const statusLower = data.data.status.toLowerCase();
        if (statusLower === 'pending' && attempt < maxRetries) {
          // If pending and not at max retries, log and retry after 2 seconds
          logger.log(
            `Order status is ${data.data.status}, retrying after 2 seconds for order ${orderId} (attempt ${attempt + 1}/${maxRetries + 1})`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryIntervalMs)); // Wait for 2 seconds
        } else {
          // Return the data structure if status is not pending or if max retries reached while pending
          if (statusLower === 'pending') {
            logger.log(
              `Max retries reached for order ${orderId}. Status remains ${data.data.status}.`,
            );
          }
          return {
            OrderID: extractedData.OrderID,
            Amount: extractedData.Amount,
            Token: extractedData.Token,
            Status: extractedData.Status,
            TxHash: extractedData.TxHash,
            Rate: extractedData.Rate,
          };
        }
      } catch (error) {
        logger.error(
          `Error fetching offramp order status for order ${orderId} on chain ${chainId} (attempt ${attempt + 1}/${maxRetries + 1}):`,
          error,
        );
        // If this is the last attempt, re-throw the error; otherwise, check if retryable
        if (attempt === maxRetries) {
          throw error;
        }
        // Check if error is non-retryable (e.g., specific HTTP errors already thrown as non-retryable)
        if (error instanceof Error && error.message.includes('Non-retryable')) {
          throw error; // Stop retrying immediately for non-retryable errors
        }
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs)); // Wait before retrying on error
      }
    }

    // This line should theoretically never be reached due to the logic above, but added for safety
    throw new Error(
      'Unexpected error: Max retries logic failed to return a response or throw earlier.',
    );
  } catch (finalError) {
    // This outer catch will grab anything that escaped the inner loop's handling
    // or errors from the setup/final throw.
    logger.error(
      `Critical failure in fetchOfframpOrderStatus for order ${orderId} on chain ${chainId}:`,
      finalError,
    );
    // Re-throw the error to be handled by the caller
    throw finalError;
  }
}
