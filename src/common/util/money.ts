import Decimal from 'decimal.js';

/**
 * Converts an amount to a Decimal object for safe monetary calculations.
 * @param amount - The amount as a string or number.
 * @returns A Decimal object representing the monetary value.
 */
export const toMoney = (amount: string | number): Decimal =>
  new Decimal(amount);

/**
 * Formats a Decimal value to a string with 2 decimal places for monetary display or storage.
 * @param value - The Decimal value to format.
 * @returns A string formatted to 2 decimal places.
 */
export const formatMoney = (value: Decimal): string => value.toFixed(2);

/**
 * Adds two monetary amounts safely.
 * @param a - First amount as string, number, or Decimal.
 * @param b - Second amount as string, number, or Decimal.
 * @returns A Decimal object representing the sum.
 */
export const addMoney = (
  a: string | number | Decimal,
  b: string | number | Decimal,
): Decimal => {
  const decimalA = a instanceof Decimal ? a : toMoney(a);
  const decimalB = b instanceof Decimal ? b : toMoney(b);
  return decimalA.plus(decimalB);
};

/**
 * Subtracts one monetary amount from another safely.
 * @param a - First amount (minuend) as string, number, or Decimal.
 * @param b - Second amount (subtrahend) as string, number, or Decimal.
 * @returns A Decimal object representing the difference.
 */
export const subtractMoney = (
  a: string | number | Decimal,
  b: string | number | Decimal,
): Decimal => {
  const decimalA = a instanceof Decimal ? a : toMoney(a);
  const decimalB = b instanceof Decimal ? b : toMoney(b);
  return decimalA.minus(decimalB);
};

/**
 * Multiplies two monetary amounts safely.
 * @param a - First amount as string, number, or Decimal.
 * @param b - Second amount as string, number, or Decimal.
 * @returns A Decimal object representing the product.
 */
export const multiplyMoney = (
  a: string | number | Decimal,
  b: string | number | Decimal,
): Decimal => {
  const decimalA = a instanceof Decimal ? a : toMoney(a);
  const decimalB = b instanceof Decimal ? b : toMoney(b);
  return decimalA.mul(decimalB);
};

/**
 * Divides one monetary amount by another safely.
 * @param a - Dividend as string, number, or Decimal.
 * @param b - Divisor as string, number, or Decimal.
 * @returns A Decimal object representing the quotient.
 * @throws Error if divisor is zero.
 */
export const divideMoney = (
  a: string | number | Decimal,
  b: string | number | Decimal,
): Decimal => {
  const decimalA = a instanceof Decimal ? a : toMoney(a);
  const decimalB = b instanceof Decimal ? b : toMoney(b);
  if (decimalB.isZero()) {
    throw new Error(
      'Division by zero is not allowed for monetary calculations.',
    );
  }
  return decimalA.div(decimalB);
};

/**
 * Returns the minimum of two monetary amounts.
 * @param a - First amount as string, number, or Decimal.
 * @param b - Second amount as string, number, or Decimal.
 * @returns A Decimal object representing the smaller amount.
 */
export const minMoney = (
  a: string | number | Decimal,
  b: string | number | Decimal,
): Decimal => {
  const decimalA = a instanceof Decimal ? a : toMoney(a);
  const decimalB = b instanceof Decimal ? b : toMoney(b);
  return Decimal.min(decimalA, decimalB);
};

/**
 * Returns the maximum of two monetary amounts.
 * @param a - First amount as string, number, or Decimal.
 * @param b - Second amount as string, number, or Decimal.
 * @returns A Decimal object representing the larger amount.
 */
export const maxMoney = (
  a: string | number | Decimal,
  b: string | number | Decimal,
): Decimal => {
  const decimalA = a instanceof Decimal ? a : toMoney(a);
  const decimalB = b instanceof Decimal ? b : toMoney(b);
  return Decimal.max(decimalA, decimalB);
};
