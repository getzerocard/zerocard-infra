import Decimal from 'decimal.js';
import {
    toMoney,
    addMoney,
    divideMoney,
    formatMoney,
} from '../../../common/util/money';
import { EntityManager } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { SpendingLimit } from '../../spendingLimit/spendingLimit.entity';
import { NotFoundException } from '@nestjs/common';

// BalanceInputItem is now an internal concept, no longer exported.
interface InternalBalanceItem {
    nairaRemaining: number | string;
    fxRate: number | string;
    id?: string; // For logging, can use spending limit ID
}

/**
 * Interface for the output of the aggregated balance calculation.
 */
export interface AggregatedBalancesOutput {
    totalNairaRemaining: string;
    totalUsdEquivalent: string;
}

/**
 * Calculates the total remaining Naira and its equivalent USD value for a specific user,
 * aggregated from their spending limits, considering individual FX rates.
 * Only processes items where nairaRemaining > 0.
 *
 * @param userId The ID of the user for whom to calculate balances.
 * @param entityManager The TypeORM entity manager.
 * @returns An AggregatedBalancesOutput object.
 * @throws NotFoundException if the user is not found.
 */
export async function calculateAggregatedBalancesForUser(
    userId: string,
    entityManager: EntityManager,
): Promise<AggregatedBalancesOutput> {
    const user = await entityManager.findOne(User, {
        where: { userId },
        relations: ['spendingLimits'], // Ensure spendingLimits are loaded
    });

    if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    let totalNaira = toMoney(0);
    let totalUsd = toMoney(0);

    const spendingLimits = user.spendingLimits || [];

    if (spendingLimits.length === 0) {
        return {
            totalNairaRemaining: formatMoney(totalNaira),
            totalUsdEquivalent: formatMoney(totalUsd),
        };
    }

    for (const limit of spendingLimits) {
        // Use limit.nairaRemaining and limit.fxRate directly
        const nairaRemainingDecimal = toMoney(limit.nairaRemaining);

        if (nairaRemainingDecimal.greaterThan(0)) {
            totalNaira = addMoney(totalNaira, nairaRemainingDecimal);

            const fxRateDecimal = toMoney(limit.fxRate);

            if (fxRateDecimal.lessThanOrEqualTo(0)) {
                console.warn(
                    `Invalid or zero FX rate (${fxRateDecimal.toString()}) for spending limit ${limit.id}. Skipping USD equivalent calculation for this limit.`,
                );
                continue;
            }

            const usdEquivalentForItem = divideMoney(
                nairaRemainingDecimal,
                fxRateDecimal,
            );
            totalUsd = addMoney(totalUsd, usdEquivalentForItem);
        }
    }

    return {
        totalNairaRemaining: formatMoney(totalNaira),
        totalUsdEquivalent: formatMoney(totalUsd),
    };
}
