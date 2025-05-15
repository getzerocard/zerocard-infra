import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Options for validating a numeric query parameter
 */
interface NumericValidationOptions {
    min?: number;
    max?: number;
    default?: number;
    required?: boolean;
}

/**
 * Options for validating an enum query parameter
 */
interface EnumValidationOptions<T> {
    enum: readonly T[];
    default?: T;
    required?: boolean;
}

/**
 * A collection of validators and parsers for common query parameter types
 */
export class QueryValidators {
    /**
     * Validates and converts a query parameter to a number
     * @param value The string value from query
     * @param paramName The name of the parameter for error messages
     * @param options Validation options
     * @returns The validated and converted number
     */
    static toNumber(
        value: any,
        paramName: string,
        options: NumericValidationOptions = {},
    ): number | undefined {
        // If value is undefined and not required, return default or undefined
        if (value === undefined) {
            if (options.required) {
                throw new BadRequestException(`${paramName} is required`);
            }
            return options.default;
        }

        // Convert to number
        const num = Number(value);

        // Check if it's a valid number
        if (isNaN(num)) {
            throw new BadRequestException(`${paramName} must be a number`);
        }

        // Validate min
        if (options.min !== undefined && num < options.min) {
            throw new BadRequestException(`${paramName} must not be less than ${options.min}`);
        }

        // Validate max
        if (options.max !== undefined && num > options.max) {
            throw new BadRequestException(`${paramName} must not be greater than ${options.max}`);
        }

        return num;
    }

    /**
     * Validates that a query parameter is one of a set of allowed values
     * @param value The string value from query
     * @param paramName The name of the parameter for error messages
     * @param options Validation options including allowed values
     * @returns The validated value
     */
    static toEnum<T extends string>(
        value: any,
        paramName: string,
        options: EnumValidationOptions<T>,
    ): T | undefined {
        // If value is undefined and not required, return default or undefined
        if (value === undefined) {
            if (options.required) {
                throw new BadRequestException(`${paramName} is required`);
            }
            return options.default;
        }

        // Check if value is in allowed values
        if (!options.enum.includes(value as T)) {
            throw new BadRequestException(
                `${paramName} must be one of: ${options.enum.join(', ')}`,
            );
        }

        return value as T;
    }
}

/**
 * Decorator that parses and validates query parameters
 * @returns Decorator function
 */
export const ParsedQuery = createParamDecorator(
    (_, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const query = request.query;

        try {
            // Parse and validate common parameters
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

                // Pass through any other query parameters
                ...query
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Invalid query parameters');
        }
    },
);
