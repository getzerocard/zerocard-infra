interface Currency {
  code: string;
  name: string;
  shortName: string;
  decimals: number;
  symbol: string;
  marketRate: string;
}

interface CurrencyResponse {
  message: string;
  status: string;
  data: Currency[];
}

/**
 * Fetches and returns all currency shortnames
 * @param aggregatorUrl - Base URL of the aggregator API
 * @returns Array of currency shortnames
 *
 * @example
 * const shortnames = await fetchCurrencyShortnames('https://aggregatorurl.com');
 * // Returns: ["Céfa Benin", "Naira", "KES"]
 */
export async function fetchCurrencyShortnames(
  aggregatorUrl: string,
): Promise<string[]> {
  try {
    const response = await fetch(`${aggregatorUrl}/v1/currencies`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: CurrencyResponse = await response.json();
    return data.data.map((currency) => currency.shortName);
  } catch (error) {
    console.error('Error fetching currency shortnames:', error);
    throw error;
  }
}
