interface TokenRateResponse {
  message: string;
  status: string;
  data: string;
}

/**
 * Fetches token rate for a given amount and fiat currency
 * @param aggregatorUrl - Base URL of the aggregator API (includes /v1)
 * @param symbol - Cryptocurrency token (e.g., 'USDC')
 * @param amount - Amount of the token
 * @param fiat - Fiat currency code (e.g., 'NGN')
 * @returns Object containing the rate and the original amount
 *
 * @example
 * const rateData = await fetchTokenRate('aggregatorurl.com/v1', 'USDC', '100', 'NGN');
 * // Returns: { rate: "1594.17", amount: "100" }
 */
export async function fetchTokenRate(
  aggregatorUrl: string,
  symbol: string,
  amount: string,
  fiat: string,
): Promise<{ rate: string; amount: string }> {
  try {
    // Ensure consistent URL format
    const baseUrl = aggregatorUrl.endsWith('/')
      ? aggregatorUrl.slice(0, -1)
      : aggregatorUrl;
    const url = `${baseUrl}/rates/${symbol.toUpperCase()}/${amount}/${fiat.toLowerCase()}`;

    const response = await fetch(url);
    if (!response.ok) {
      // Try to get error details from response body
      let errorBody = 'Unknown error';
      try {
        errorBody = await response.text();
      } catch {}
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorBody}`,
      );
    }
    const data: TokenRateResponse = await response.json();

    // Check if the rate is a valid positive number
    const rateValue = parseFloat(data.data);
    if (isNaN(rateValue) || rateValue <= 0) {
      throw new Error(
        `Invalid rate received: ${data.data}. Rate must be a positive number.`,
      );
    }

    // Return the rate string directly, along with the original amount
    return {
      rate: data.data,
      amount: amount, // Keep the original amount for consistency if needed
    };
  } catch (error) {
    console.error('Error fetching token rate:', error);
    // Ensure the error message includes context for easier debugging
    if (error instanceof Error) {
      error.message = `fetchTokenRate failed: ${error.message}`;
    }
    throw error;
  }
}
