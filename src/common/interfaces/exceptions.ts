import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception for when a user is not found.
 */
export class UserNotFoundException extends HttpException {
  constructor(message: string = 'User not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Custom exception for when a transaction is not found.
 */
export class TransactionNotFoundException extends HttpException {
  constructor(message: string = 'Transaction not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Custom exception for invalid webhook data.
 */
export class InvalidWebhookDataException extends HttpException {
  constructor(message: string = 'Invalid webhook data') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
