import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { QueryValidators } from '../../../common/decorators/parse-query.decorator';

/**
 * Interface for transaction query parameters after validation
 */
export interface TransactionQueryParams {
    page: number;
    limit: number;
    type?: 'spending' | 'withdrawal';
    minUsdAmount?: number;
    maxUsdAmount?: number;
    [key: string]: any;
}

/**
 * Decorator for parsing and validating transaction query parameters
 */
export const TransactionQuery = createParamDecorator(
    (_, ctx: ExecutionContext): TransactionQueryParams => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const query = request.query;

        return {
            // Convert page to number with min=1 and default=1
            page: QueryValidators.toNumber(query.page, 'page', { min: 1, default: 1 }),

            // Convert limit to number with min=1 and default=10
            limit: QueryValidators.toNumber(query.limit, 'limit', { min: 1, default: 10 }),

            // Validate type is one of the allowed values
            type: QueryValidators.toEnum(query.type, 'type', {
                enum: ['spending', 'withdrawal'] as const
            }),

            // Convert minUsdAmount to number with min=0
            minUsdAmount: QueryValidators.toNumber(query.minUsdAmount, 'minUsdAmount', { min: 0 }),

            // Convert maxUsdAmount to number with min=0
            maxUsdAmount: QueryValidators.toNumber(query.maxUsdAmount, 'maxUsdAmount', { min: 0 }),
        };
    },
);
