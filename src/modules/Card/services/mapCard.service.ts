import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { mapCard } from '../infrastructureHandlers/mapCard.handler';
import { allowedCategories } from '../infrastructureHandlers/allowedCategories.handler';
import { EntityManager } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { getCard } from '../infrastructureHandlers/getCard.handler';
import { getCardToken } from '../infrastructureHandlers/getCardToken.handler';

@Injectable()
export class MapCardService {
  private readonly zerocardBaseUrl: string;
  private readonly zerocardAuthToken: string;
  private readonly logger = new Logger(MapCardService.name);

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    @InjectEntityManager() private manager: EntityManager,
  ) {
    this.zerocardBaseUrl = this.configService.get<string>(
      'card.ZEROCARD_API_URL',
    );
    this.zerocardAuthToken = this.configService.get<string>(
      'card.ZEROCARD_API_KEY',
    );
  }

  /**
   * Maps a card to a specific user with predefined settings and restrictions.
   * This method ensures that only authenticated users can map cards for themselves.
   * It uses static configurations for card type, currency, issuer country, and spending controls.
   * The customer ID is derived from user details, with a fallback to the user ID if necessary.
   *
   * @param userId - The ID of the user requesting to map the card. Used for authentication and authorization.
   * @param status - The initial status of the card (e.g., active, inactive).
   * @param expirationDate - The expiration date of the card in MMM-YYYY format (e.g., AUG-2025).
   * @param number - The card number to be mapped.
   * @returns A Promise resolving to an object containing the status code, a success message, and the mapped card data.
   * @throws HttpException - If user validation fails, customer ID retrieval fails, or the card mapping process encounters an error.
   */
  async mapCard(
    userId: string,
    status: string,
    expirationDate: string,
    number: string,
  ) {
    // Priority 1: Quick input validation
    if (!userId) {
      throw new HttpException(
        'Card Protocol: User ID required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Priority 2: Fetch user entity directly for authorization and account information
    const userEntity = await this.manager.findOne(User, { where: { userId } });
    if (!userEntity) {
      throw new HttpException(
        'Card Protocol: User not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    // Priority 3: Retrieve customer ID from the User entity
    const customerId = userEntity.customerId; // Assuming User entity has customerId
    if (!customerId) {
      throw new HttpException(
        'Card Protocol: Customer ID missing.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Priority 4: Prepare card data for mapping
    const cardData = {
      type: 'physical',
      currency: 'NGN',
      status,
      issuerCountry: 'NGA',
      spendingControls: {
        channels: {
          mobile: true,
          atm: true,
          pos: true,
          web: true,
        },
        allowedCategories: allowedCategories,
        blockedCategories: ['zerocard'],
        spendingLimits: [
          {
            interval: 'daily',
            amount: 100000000,
          },
        ],
      },
      sendPINSMS: false,
      customerId,
      brand: 'Verve',
      expirationDate,
      metadata: { user_id: userId },
      number,
    };

    try {
      // Priority 5: Map the card
      const response = await mapCard(
        this.zerocardBaseUrl,
        this.zerocardAuthToken,
        cardData,
      );
      this.logger.log(`Response from mapCard infrastructure handler: ${JSON.stringify(response)}`);

      // Handle specific "Card not found or already linked" error from the provider
      if (response && response.statusCode === 400 && response.message === "Card not found or already linked.") {
        if (userEntity.cardId) {
          // User already has a card in our system.
          this.logger.warn(`mapCard failed for user ${userId} (user already has cardId ${userEntity.cardId}). Provider error: ${response.message}`);
          throw new HttpException(
            'Card Protocol: Card already linked.',
            HttpStatus.CONFLICT,
          );
        } else {
          // User does not have a card in our system.
          this.logger.warn(`mapCard failed for user ${userId} (user has no existing card). Provider error: ${response.message}`);
          throw new HttpException(
            'Card Protocol: Card not found check card number and try again ',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const cardId = response.data._id;

      // Priority 6: Fetch card details to extract account information (formerly Priority 7)
      const cardDetails = await getCard(
        this.zerocardBaseUrl,
        this.zerocardAuthToken,
        cardId,
      );
      this.logger.log(`Response from getCard infrastructure handler: ${JSON.stringify(cardDetails)}`);

      // Check for errors or unexpected response structure from getCard
      if (
        !cardDetails ||
        (typeof cardDetails.statusCode === 'number' && cardDetails.statusCode >= 300) ||
        !cardDetails.data ||
        !cardDetails.data.account ||
        typeof cardDetails.data.account._id === 'undefined' ||
        typeof cardDetails.data.account.accountName === 'undefined' ||
        typeof cardDetails.data.account.accountNumber === 'undefined'
      ) {
        this.logger.error(`getCard infrastructure handler returned an error or unexpected response: ${JSON.stringify(cardDetails)}`);
        // Note: The card is already mapped and user.cardId is updated in DB.
        // This error means we couldn't fetch/store associated account details.
        // Depending on business logic, this might require a compensating transaction or specific alerting.
        throw new HttpException(
          cardDetails?.message || 'Card Protocol: Failed to get account details post-map.',
          (typeof cardDetails?.statusCode === 'number' ? cardDetails.statusCode : HttpStatus.INTERNAL_SERVER_ERROR)
        );
      }

      const accountId = cardDetails.data.account._id;
      const accountName = cardDetails.data.account.accountName;
      const accountNumber = cardDetails.data.account.accountNumber;

      // Priority 7: Update user entity with all card and account details in a single transaction (combines former 6 & 8)
      userEntity.cardId = cardId;
      userEntity.accountId = accountId;
      userEntity.accountName = accountName;
      userEntity.accountNumber = accountNumber;
      userEntity.cardOrderStatus = 'activated';

      await this.manager.transaction(async (transactionalEntityManager) => {
        // Ensure we are saving the same userEntity instance that was fetched and updated.
        // Re-fetching inside transaction is redundant if we manage the entity instance correctly.
        await transactionalEntityManager.save(User, userEntity);
      });

      return {
        status: 'success',
        message: response.message || 'Card mapped successfully.',
        data: response.data,
      };
    } catch (error) {
      // Preserve existing status if it's an HttpException, otherwise default to 500
      const errorStatus =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      // If it's already one of our "Card Protocol" messages, re-throw as is to preserve specific status and message.
      if (error instanceof HttpException && error.message.startsWith('Card Protocol:')) {
        throw error;
      }

      // For other errors, or non-HttpExceptions, wrap in a generic "Card Protocol" message.
      this.logger.error(`Card Protocol: Unhandled error in mapCard - ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw new HttpException('Card Protocol: Unexpected mapping error.', errorStatus);
    }
  }

  /**
   * Retrieves a secure token for a user's mapped card.
   *
   * @param userId - The ID of the user whose card token is to be fetched.
   * @returns A Promise resolving to an object containing the userId and the card token.
   * @throws HttpException - If the user is not found, has no card mapped, or if fetching the token fails.
   */
  async getCardInfo(
    userId: string,
  ): Promise<{ userId: string; token: string }> {
    this.logger.log(`Fetching card info (token) for user: ${userId}`);

    // Priority 1: Quick input validation
    if (!userId) {
      this.logger.warn('getCardInfo called without userId');
      throw new HttpException(
        'User ID is required to fetch card information',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Priority 2: Fetch user entity directly for authorization and account information
    const userEntity = await this.manager.findOne(User, { where: { userId } });

    if (!userEntity) {
      this.logger.warn(`User not found for card info request: ${userId}`);
      throw new HttpException(
        `User with ID ${userId} not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!userEntity.cardId) {
      this.logger.warn(`User ${userId} has no cardId mapped.`);
      throw new HttpException(
        `No card mapped for user ${userId}. Please map a card first.`,
        HttpStatus.NOT_FOUND, // Or BAD_REQUEST depending on desired UX
      );
    }

    this.logger.log(
      `Found cardId ${userEntity.cardId} for user ${userId}. Proceeding to fetch token.`,
    );

    // Priority 3: Call the getCardToken handler
    try {
      const cardTokenResponse = await getCardToken(
        this.zerocardBaseUrl,
        this.zerocardAuthToken,
        userEntity.cardId,
      );

      if (
        !cardTokenResponse ||
        !cardTokenResponse.data ||
        !cardTokenResponse.data.token
      ) {
        this.logger.error(
          `Invalid or incomplete response from getCardToken handler for cardId ${userEntity.cardId}`,
          cardTokenResponse,
        );
        throw new HttpException(
          'Failed to retrieve a valid card token from the provider.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Successfully fetched card token for user ${userId} (cardId: ${userEntity.cardId})`,
      );

      return {
        userId: userId,
        token: cardTokenResponse.data.token,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching card token for user ${userId} (cardId: ${userEntity.cardId}):`,
        error,
      );
      // Re-throw HttpException as is, wrap others
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `An unexpected error occurred while fetching the card token for user ${userId}.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
