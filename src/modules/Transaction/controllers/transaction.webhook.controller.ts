import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  InternalServerErrorException,
  Logger,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ProcessTransactionService } from '../services/processSpendingTransaction.service';
import {
  TransactionWebhookErrorResponses,
  TransactionWebhookSuccessResponse,
  WebhookProcessedDataDto,
} from '../dto/transaction-webhook.dto';
import { Response } from '../../../common/interceptors/response.interceptor'; // For ApiExtraModels

@Controller('webhook')
@ApiTags('webhook')
@ApiBearerAuth() // Indicates that the endpoint might require Bearer token, useful for documentation
@ApiExtraModels(Response, WebhookProcessedDataDto)
export class TransactionWebhookController {
  private readonly logger = new Logger(TransactionWebhookController.name);
  private readonly apiKey: string;
  private readonly network: string;

  constructor(
    private configService: ConfigService,
    private processTransactionService: ProcessTransactionService,
  ) {
    this.apiKey = this.configService.get<string>('ZERO_CARD_API_KEY');
    this.network = this.configService.get<string>('NETWORK');
  }

  @Post('transaction')
  @ApiOperation({
    summary: 'Handle Transaction Webhook',
    description:
      'Endpoint to receive webhook notifications for transactions and authorizations from external systems. Requires a valid API key in the Authorization header.',
  })
  @ApiBody({
    description:
      'Webhook payload. The structure of this payload varies depending on the event type from the external system (e.g., Mono).',
    type: Object, // Kept as Object as per user request to not define a strict input DTO
    examples: {
      authorizationRequest: {
        summary: 'Example: authorization.request',
        value: {
          event: 'authorization.request',
          data: {
            /* ... specific fields for auth request ... */
          },
        },
      },
      transactionCreated: {
        summary: 'Example: transaction.created (Testnet)',
        value: {
          type: 'transaction.created',
          data: {
            /* ... specific fields for transaction created ... */
          },
        },
      },
    },
  })
  @ApiResponse(TransactionWebhookSuccessResponse.R200)
  @ApiResponse(TransactionWebhookErrorResponses.R400)
  @ApiResponse(TransactionWebhookErrorResponses.R403)
  @ApiResponse(TransactionWebhookErrorResponses.R500)
  async handleTransactionWebhook(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ): Promise<WebhookProcessedDataDto> {
    if (!authHeader) {
      this.logger.warn('Missing authorization header for webhook.');
      throw new ForbiddenException('Missing authorization header');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (token !== this.apiKey) {
      this.logger.warn('Invalid API key for webhook.');
      throw new ForbiddenException('Invalid API key');
    }

    this.logger.log(
      `Webhook received. Type: ${body.type || 'unknown'}, Event: ${body.event || 'unknown'}`,
    );

    try {
      let result: any;
      let message: string;
      let responseCode = '00'; // Default success code

      // Determine event type (Mono uses 'event', other example used 'type')
      const eventType = body.type || body.event;

      if (this.network === 'TESTNET') {
        if (eventType === 'transaction.created') {
          result =
            await this.processTransactionService.handleTransactionCreated(
              body.data,
            );
          message = 'Transaction processed successfully in TESTNET mode';
        } else {
          this.logger.warn(
            `Unsupported webhook type in TESTNET mode: ${eventType || 'unknown'}`,
          );
          throw new BadRequestException(
            `Unsupported webhook type in TESTNET mode: ${eventType || 'unknown'}`,
          );
        }
      } else {
        // Mainnet/Production logic
        if (eventType === 'authorization.request') {
          result =
            await this.processTransactionService.handleAuthorizationRequest(
              body.data,
            );
          message = 'Authorization request processed successfully';
        } else if (eventType === 'authorization.updated') {
          result =
            await this.processTransactionService.handleAuthorizationUpdated(
              body.data,
            );
          message = 'Transaction status updated to completed';
        } else if (eventType === 'transaction.refund') {
          result = await this.processTransactionService.handleTransactionRefund(
            body.data,
          );
          message = 'Transaction status updated to refunded';
        } else {
          this.logger.warn(`Unsupported webhook type: ${eventType || 'unknown'}`);
          throw new BadRequestException(
            `Unsupported webhook type: ${eventType || 'unknown'}`,
          );
        }
      }

      this.logger.log(`Webhook processed successfully: ${message}`);
      return {
        responseCode,
        message,
        details: result,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error; // Re-throw known exceptions
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown internal error';
      this.logger.error(
        `Failed to process webhook (Type: ${body.type || 'unknown'}, Event: ${body.event || 'unknown'}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to process webhook due to an internal error.',
      );
    }
  }
}
