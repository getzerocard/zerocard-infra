import { Logger } from '@nestjs/common';
import { divideMoney, multiplyMoney, toMoney } from './money';

const logger = new Logger('RateConversionUtil');

/**
 * Converts a Naira amount to its equivalent Dollar amount based on an exchange rate.
 *
 * @param nairaAmount - The amount in Naira.
 * @param exchangeRate - The exchange rate (Naira per 1 Dollar).
 * @returns The equivalent amount in Dollars.
 * @throws {Error} If the exchange rate is zero or negative.
 */
export function convertNairaToDollars(
  nairaAmount: number | string,
  exchangeRate: number | string,
): number {
  const exchangeRateDecimal = toMoney(exchangeRate);
  if (exchangeRateDecimal.lte(0)) {
    logger.error(
      `Invalid exchange rate for NGN to USD conversion: ${exchangeRateDecimal.toString()}`,
    );
    throw new Error('Exchange rate must be positive.');
  }
  const nairaDecimal = toMoney(nairaAmount);
  const dollarDecimal = divideMoney(nairaDecimal, exchangeRateDecimal);
  return parseFloat(dollarDecimal.toFixed(2));
}

/**
 * Converts a Dollar amount to its equivalent Naira amount based on an exchange rate.
 *
 * @param dollarAmount - The amount in Dollars.
 * @param exchangeRate - The exchange rate (Naira per 1 Dollar).
 * @returns The equivalent amount in Naira.
 * @throws {Error} If the exchange rate is zero or negative.
 */
export function convertDollarsToNaira(
  dollarAmount: number | string,
  exchangeRate: number | string,
): number {
  const exchangeRateDecimal = toMoney(exchangeRate);
  if (exchangeRateDecimal.lte(0)) {
    logger.error(
      `Invalid exchange rate for USD to NGN conversion: ${exchangeRateDecimal.toString()}`,
    );
    throw new Error('Exchange rate must be positive.');
  }
  const dollarDecimal = toMoney(dollarAmount);
  const nairaDecimal = multiplyMoney(dollarDecimal, exchangeRateDecimal);
  return parseFloat(nairaDecimal.toFixed(2));
}

/**
 * Calculates the exchange rate between Dollar and Naira amounts.
 *
 * @param dollarAmount - The amount in Dollars.
 * @param nairaAmount - The amount in Naira.
 * @returns The exchange rate.
 */
export function calculateRate(
  dollarAmount: number | string,
  nairaAmount: number | string,
): number {
  const nairaDecimal = toMoney(nairaAmount);
  const dollarDecimal = toMoney(dollarAmount);
  if (nairaDecimal.isZero() || dollarDecimal.isZero()) {
    logger.error('No Naira or Dollar amount provided for rate calculation');
    throw new Error('No Naira or Dollar amount provided for rate calculation');
  }
  const rateDecimal = divideMoney(nairaDecimal, dollarDecimal);
  return parseFloat(rateDecimal.toFixed(4));
}
