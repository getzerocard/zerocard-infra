---
description: 
globs: 
alwaysApply: true
---
# Decimal.js Guidelines for Monetary Calculations

This rule outlines the standards for handling monetary values in our codebase to ensure precision and consistency across all financial calculations.

## Overview

To prevent floating-point precision issues in financial calculations, we use the `decimal.js` library throughout the project. The utility module [money.ts](mdc:src/common/util/money.ts) provides functions for safe monetary operations.

## Key Guidelines

1. **Use Decimal.js for All Monetary Calculations**
   - Always use the functions provided in [money.ts](mdc:src/common/util/money.ts) for any arithmetic operations involving monetary values.
   - Convert amounts to `Decimal` objects using `toMoney()` before performing calculations.

2. **Input Flexibility**
   - Functions handling monetary values should accept `number | string` as input types to accommodate various data formats.

3. **Precision and Formatting**
   - Monetary fields in entities should be defined with a precision of 18 and a scale of 2 for currency amounts (e.g., USD, Naira).
   - Exchange rates should use a precision of 18 and a scale of 4 for higher accuracy.
   - Use `formatMoney()` to convert `Decimal` values to formatted strings or numbers for storage or display.

4. **Database Storage**
   - Store monetary values in the database with appropriate precision and scale as defined in entity files like [spendingLimit.entity.ts](mdc:src/modules/spendingLimit/spendingLimit.entity.ts) and [transaction.entity.ts](mdc:src/modules/Transaction/transaction.entity.ts).

5. **Avoid Plain JavaScript Arithmetic**
   - Do not use plain JavaScript operators (`+`, `-`, `*`, `/`) for monetary calculations as they can lead to precision errors.

## Utility Functions

The [money.ts](mdc:src/common/util/money.ts) module provides the following key functions:
- `toMoney`: Converts an amount to a `Decimal` object.
- `formatMoney`: Formats a `Decimal` value to a string with 2 decimal places.
- `addMoney`, `subtractMoney`, `multiplyMoney`, `divideMoney`: Perform safe arithmetic operations.
- `minMoney`, `maxMoney`: Compare and return minimum or maximum monetary values.

## Examples

- For rate conversions, refer to [rateConversion.util.ts](mdc:src/common/util/rateConversion.util.ts) for implementation details.
- For transaction processing, see [processTransaction.service.ts](mdc:src/modules/Transaction/processTransaction.service.ts).
- For setting spending limits, check [setLimit.service.ts](mdc:src/modules/spendingLimit/setLimit.service.ts).

By adhering to these guidelines, we ensure accurate and reliable financial calculations across the application.
