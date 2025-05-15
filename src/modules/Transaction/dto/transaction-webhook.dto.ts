import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Response } from '../../../common/interceptors/response.interceptor';

/**
 * DTO for the 'data' field of a successfully processed webhook.
 * This structure is what the controller will return, to be wrapped by the ResponseInterceptor.
 */
export class WebhookProcessedDataDto {
    @ApiProperty({
        example: '00',
        description: 'Internal response code indicating the result of the webhook processing.',
    })
    responseCode: string;

    @ApiProperty({
        example: 'Webhook processed successfully.',
        description: 'A human-readable message describing the outcome.',
    })
    message: string;

    @ApiProperty({
        description: 'Contains the detailed result from the service after processing the webhook. The structure of this field can vary based on the webhook type and service logic.',
        example: { cardId: 'card_123', status: 'active' },
    })
    details?: any;
}

/**
 * Defines the Swagger documentation for a successful webhook response (200 OK).
 */
export class TransactionWebhookSuccessResponse {
    static readonly R200 = {
        status: 200,
        description: 'Webhook processed successfully. The data field contains specific details of the processing.',
        schema: {
            allOf: [
                { $ref: getSchemaPath(Response) },
                {
                    properties: {
                        data: { $ref: getSchemaPath(WebhookProcessedDataDto) },
                    },
                },
            ],
        },
        examples: {
            successProcessing: {
                summary: 'Successful Webhook Processing',
                value: {
                    statusCode: 200,
                    success: true,
                    data: {
                        responseCode: '00',
                        message: 'Authorization request processed successfully.',
                        details: {
                            transactionId: 'txn_abc123',
                            decision: 'approved',
                        },
                    },
                },
            },
            successUpdate: {
                summary: 'Successful Webhook Update Processing',
                value: {
                    statusCode: 200,
                    success: true,
                    data: {
                        responseCode: '00',
                        message: 'Transaction status updated to completed.',
                        details: {
                            orderId: 'order_xyz789',
                            newStatus: 'COMPLETED',
                        },
                    },
                },
            },
        },
    };
}

/**
 * Defines the Swagger documentation for common error responses for the webhook.
 */
export class TransactionWebhookErrorResponses {
    static readonly R400 = {
        status: 400,
        description: 'Bad Request - Unsupported webhook type or invalid payload structure.',
        schema: {
            allOf: [
                { $ref: getSchemaPath(Response) },
                {
                    properties: {
                        message: { type: 'string' },
                    },
                },
            ],
        },
        examples: {
            unsupportedType: {
                summary: 'Unsupported Webhook Type',
                value: {
                    statusCode: 400,
                    success: false,
                    message: 'Unsupported webhook type: transaction.unknown',
                },
            },
        },
    };

    static readonly R403 = {
        status: 403,
        description: 'Forbidden - Invalid or missing API key in authorization header.',
        schema: {
            allOf: [
                { $ref: getSchemaPath(Response) },
                {
                    properties: {
                        message: { type: 'string' },
                    },
                },
            ],
        },
        examples: {
            missingAuth: {
                summary: 'Missing Authorization Header',
                value: {
                    statusCode: 403,
                    success: false,
                    message: 'Missing authorization header',
                },
            },
            invalidApiKey: {
                summary: 'Invalid API Key',
                value: {
                    statusCode: 403,
                    success: false,
                    message: 'Invalid API key',
                },
            },
        },
    };

    static readonly R500 = {
        status: 500,
        description: 'Internal Server Error - An unexpected error occurred while processing the webhook.',
        schema: {
            allOf: [
                { $ref: getSchemaPath(Response) },
                {
                    properties: {
                        message: { type: 'string' },
                    },
                },
            ],
        },
        examples: {
            internalError: {
                summary: 'Internal Processing Error',
                value: {
                    statusCode: 500,
                    success: false,
                    message: 'Failed to process webhook due to an internal error.',
                },
            },
        },
    };
}

