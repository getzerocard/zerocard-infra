import { formatMoney, toMoney } from '../../../common/util/money';

/**
 * Calculates the weighted average rate from an array of settlements.
 * @param settlements - Array of settlement objects with Rate and OrderPercent properties.
 * @returns string - The formatted weighted average rate, or an empty string if calculation is not possible.
 */
export function calculateWeightedRate(
  settlements: Array<{
    Rate?: string;
    OrderPercent?: number;
    [key: string]: any;
  }>,
): string {
  if (!settlements || !Array.isArray(settlements) || settlements.length === 0) {
    return '';
  }

  if (settlements.length === 1 && settlements[0].Rate) {
    return settlements[0].Rate;
  }

  if (settlements.length > 1) {
    let totalWeightedRate = toMoney(0);
    let totalPercent = toMoney(0);
    settlements.forEach((settlement) => {
      if (settlement.Rate && settlement.OrderPercent) {
        const rate = toMoney(settlement.Rate);
        const percent = toMoney(settlement.OrderPercent);
        totalWeightedRate = totalWeightedRate.plus(rate.mul(percent));
        totalPercent = totalPercent.plus(percent);
      }
    });
    if (!totalPercent.isZero()) {
      const averageRate = totalWeightedRate.div(totalPercent);
      return formatMoney(averageRate); // Format to 2 decimal places
    }
  }

  return '';
}
