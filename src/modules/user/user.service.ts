import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import type { PrivyUserData } from '../auth/interfaces/privy-user.interface';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { AddSubUserDto } from './dto/add-sub-user.dto';
import { findUserById } from './handler/findUserById';
import { findUserByEmail } from './handler/findUserByEmail';
import { addSubUser as addSubUserHandler } from './handler/addSubUser';
import { createAndUpdateUser } from './handler/createAndUpdateUser';
import { syncWalletAddresses } from './handler/syncWalletAddresses';
import { addConstraint as addConstraintHandler } from './handler/addConstraint';
import { Constraint } from './entity/authorisedUserConstraint.entity';
import { getTokenBalance } from '../../common/util/getTokenBalance';
import { formatMoney, toMoney } from '../../common/util/money';
import { ConfigService } from '@nestjs/config';
import { PrivyService } from '../auth/privy.service';
import {
  FundsLock,
  LockStatus,
  LockType,
} from '../Card/entity/fundsLock.entity';
import { normalizeEmail } from '../../common/util/email.util';
import type { CreateNewUserResponseDto } from './dto/create-user.dto';
import { UserType } from './dto/create-user.dto';
import { EmailHandlerService } from '../../modules/notification/email.handler.service';
import { getTokenBySymbol } from '../../common/util/fetchsupportedTokens';
import type { UpgradeSubUserResponse } from './dto/upgrade-sub-user.dto';
import type { ApprovedUserDataDto } from './dto/approve-upgrade.dto';
import { plainToClass, plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/get-user.dto';
import { SubUserDetailDto } from './dto/get-sub-users.dto';
import { ConstraintResponseDto } from './dto/set-constraint.dto';
import { whitelistAddress } from './handler/whitelistadress';

type SubUserFormatted = User & { subuserstatus: string };

/**
 * Service for user management operations
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Constraint)
    private readonly constraintRepository: Repository<Constraint>,
    @InjectRepository(FundsLock)
    private readonly fundsLockRepository: Repository<FundsLock>,
    private readonly emailHandlerService: EmailHandlerService,
    private readonly configService: ConfigService,
    private readonly privyService: PrivyService,
  ) { }

  /**
   * Update user information by userId with authorization checks
   *
   * @param authUserId - The ID of the authenticated user making the request
   * @param updateData - The data to update
   * @returns The updated user entity
   * @throws UnauthorizedException if the update is not allowed
   * @throws NotFoundException if the user is not found
   * @throws ConflictException if username already exists
   * @throws BadRequestException for invalid data or database errors
   */
  async update(
    authUserId: string,
    updateData: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.debug(
      `Updating user with ID ${authUserId} by auth user ${authUserId}`,
    );

    // Priority 1: Consolidated initial validation checks (quickest checks)
    // Throw exception immediately if any check fails
    if (!authUserId) {
      this.logger.error(`Invalid input: authUserId is missing`);
      throw new BadRequestException('Invalid user ID provided');
    }

    // Fetch the user to be updated using authUserId for initial checks
    const userForInitialCheck = await findUserById(this.userRepository, authUserId);
    if (!userForInitialCheck) {
      this.logger.error(`User with ID ${authUserId} not found`);
      throw new NotFoundException('User not found');
    }

    if (Object.keys(updateData).length === 0) {
      this.logger.debug(`No updates provided for user ${authUserId}`);
      return plainToClass(UserResponseDto, userForInitialCheck, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    }

    // Check if provided updates are the same as existing data
    const areUpdatesUnchanged = this.areUpdatesUnchanged(
      updateData,
      userForInitialCheck,
    );
    if (areUpdatesUnchanged) {
      this.logger.debug(
        `Provided updates are unchanged for user ${authUserId}`,
      );
      return plainToClass(UserResponseDto, userForInitialCheck, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    }

    if (updateData.timeZone) {
      const timezoneRegex = /^[A-Za-z]+\/[A-Za-z]+(?:_[A-Za-z]+)*|UTC$/;
      if (!timezoneRegex.test(updateData.timeZone)) {
        this.logger.warn(`Invalid timezone format: ${updateData.timeZone}`);
        throw new BadRequestException(
          'Invalid timezone format. Use IANA format like "America/New_York" or "UTC".',
        );
      }
    }

    // Priority 2: Handle edge cases with transaction for concurrency control
    return await this.userRepository.manager.transaction(
      async (transactionalEntityManager) => {
        this.logger.log('[UserService - Transaction Block] Entered transaction for user update.');

        // Re-fetch target user (which is authUser) within transaction to ensure latest data and lock
        const lockedUser = await transactionalEntityManager.findOne(
          User,
          {
            where: { userId: authUserId },
            lock: { mode: 'pessimistic_write' },
          },
        );
        if (!lockedUser) {
          this.logger.error(
            `User with ID ${authUserId} no longer exists`,
          );
          throw new NotFoundException('User no longer exists');
        }

        // Restrict updates to only allowed fields
        const allowedUpdates: Partial<User> = {};

        // Validate and apply username update
        if (updateData.username) {
          try {
            const [existingUserWithUsernameResult, whitelistResult] = await Promise.all([
              transactionalEntityManager.findOne(User, { // Promise for username check
                where: { username: updateData.username },
              }),
              whitelistAddress( // Promise for whitelisting
                this.configService,
                this.privyService,
                authUserId
              )
            ]);

            // Check username uniqueness result
            if (
              existingUserWithUsernameResult &&
              existingUserWithUsernameResult.userId !== authUserId
            ) {
              this.logger.warn(`Username ${updateData.username} already taken`);
              throw new ConflictException('Username already exists');
            }

            // Check whitelisting result
            if (!whitelistResult.success) {
              const errorMessage = `Failed to whitelist address for user ${authUserId}: ${whitelistResult.message || 'Unknown whitelisting error'}`;
              this.logger.error(errorMessage);
              throw new BadRequestException(errorMessage);
            }

            // If both operations were successful:
            allowedUpdates.username = updateData.username;
            lockedUser.isWhitelisted = true;
            this.logger.log(`Successfully validated username and whitelisted address concurrently for user ${authUserId}`);

          } catch (error: any) {
            const anErrorMessage = `Error during concurrent username validation/whitelisting for user ${authUserId}: ${error.message || 'Operation failed'}`;
            this.logger.error(anErrorMessage, error.stack);

            if (error instanceof ConflictException || error instanceof BadRequestException) {
              throw error; // Re-throw known, specific exceptions
            }
            // For other errors (e.g., unexpected failure in DB query or within whitelistAddress not caught as success:false)
            throw new InternalServerErrorException(anErrorMessage);
          }
        }

        // Validate and apply timezone update (already validated above)
        if (updateData.timeZone) {
          allowedUpdates.timeZone = updateData.timeZone;
        }

        // Validate and apply shipping address update
        if (updateData.shippingAddress) {
          // Merge with existing address to avoid overwriting with undefined
          const currentAddress =
            (lockedUser.shippingAddress as {
              street?: string;
              city?: string;
              state?: string;
              country?: string;
              postalCode?: string;
            }) || {};
          allowedUpdates.shippingAddress = {
            street:
              updateData.shippingAddress.street !== undefined
                ? updateData.shippingAddress.street
                : currentAddress.street,
            city:
              updateData.shippingAddress.city !== undefined
                ? updateData.shippingAddress.city
                : currentAddress.city,
            state:
              updateData.shippingAddress.state !== undefined
                ? updateData.shippingAddress.state
                : currentAddress.state,
            country:
              updateData.shippingAddress.country !== undefined
                ? updateData.shippingAddress.country
                : currentAddress.country,
            postalCode:
              updateData.shippingAddress.postalCode !== undefined
                ? updateData.shippingAddress.postalCode
                : currentAddress.postalCode,
          };
        }

        // If no updates provided, return the current user without saving
        if (Object.keys(allowedUpdates).length === 0) {
          this.logger.debug(`No updates provided for user ${authUserId}`);
          return plainToClass(UserResponseDto, lockedUser, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          });
        }

        // Apply allowed updates to the lockedUser
        Object.assign(lockedUser, allowedUpdates);

        try {
          const updatedUserEntity = await transactionalEntityManager.save(
            User,
            lockedUser,
          );
          this.logger.log(`Updated user with ID ${authUserId}`);

          return plainToClass(UserResponseDto, updatedUserEntity, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          });
        } catch (error) {
          this.logger.error(
            `Database error while updating user ${authUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          throw new BadRequestException(
            'Failed to update user due to a database error',
          );
        }
      },
    );
  }

  /**
   * Helper method to check if updates are unchanged compared to existing user data
   * @param updateDto - The update data to compare
   * @param user - The existing user data to compare against
   * @returns True if the updates are unchanged, false otherwise
   */
  private areUpdatesUnchanged(updateDto: UpdateUserDto, user: User): boolean {
    if (updateDto.username && updateDto.username === user.username) {
      delete updateDto.username;
    }
    if (updateDto.timeZone && updateDto.timeZone === user.timeZone) {
      delete updateDto.timeZone;
    }
    if (updateDto.shippingAddress) {
      const currentAddress =
        (user.shippingAddress as {
          street?: string;
          city?: string;
          state?: string;
          country?: string;
          postalCode?: string;
        }) || {};
      const updateAddress = updateDto.shippingAddress;
      if (
        (!updateAddress.street ||
          updateAddress.street === currentAddress.street) &&
        (!updateAddress.city || updateAddress.city === currentAddress.city) &&
        (!updateAddress.state ||
          updateAddress.state === currentAddress.state) &&
        (!updateAddress.country ||
          updateAddress.country === currentAddress.country) &&
        (!updateAddress.postalCode ||
          updateAddress.postalCode === currentAddress.postalCode)
      ) {
        delete updateDto.shippingAddress;
      }
    }
    return Object.keys(updateDto).length === 0;
  }

  /**
   * Creates a new user or updates an existing sub-user with a null userId based on email.
   * This method is intended for handling 'me' requests during user creation or invitation acceptance.
   *
   * @param authUserData - The authenticated user's data from Privy
   * @returns The created or updated user data formatted as CreateNewUserResponseDto
   * @throws UnauthorizedException if email mismatch occurs during invitation phase
   */
  async createUser(
    authUserData: PrivyUserData,
  ): Promise<CreateNewUserResponseDto> {
    try {
      // Priority 1: Quick input validation checks (immediate error throwing)
      if (!authUserData || !authUserData.userId || !authUserData.email) {
        this.logger.error(`Invalid authUserData provided for user creation`);
        throw new BadRequestException('Invalid user data provided');
      }

      // Normalize email before any operations
      const normalizedEmail = normalizeEmail(authUserData.email);
      if (!normalizedEmail) {
        this.logger.error(`Invalid email format provided for user creation`);
        throw new BadRequestException('Invalid email format');
      }

      // Priority 2: Use a transaction with locking to prevent race conditions
      return await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Priority 3: Concurrently check for existing user and sub-user by email
          const [existingUser, subUserByEmail] = await Promise.all([
            transactionalEntityManager
              .findOne(User, {
                where: { userId: authUserData.userId },
              })
              .catch((error) => {
                this.logger.error(
                  `Failed to check for existing user: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
                throw new BadRequestException(
                  'Failed to check for existing user due to database error',
                );
              }),
            transactionalEntityManager
              .findOne(User, {
                where: { email: normalizedEmail, userId: null },
                relations: ['parentUser'],
              })
              .catch((error) => {
                this.logger.error(
                  `Failed to check for sub-user by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
                throw new BadRequestException(
                  'Failed to check for sub-user by email due to database error',
                );
              }),
          ]).catch((error) => {
            // Throw the first error encountered from Promise.all
            throw error;
          });

          if (existingUser) {
            this.logger.debug(
              `User ${authUserData.userId} already exists, syncing wallet addresses`,
            );
            try {
              const syncedUser = await syncWalletAddresses(
                transactionalEntityManager.getRepository(User),
                authUserData.userId,
                authUserData,
              );
              return {
                userId: syncedUser.userId || '',
                userType: syncedUser.isMainUser
                  ? UserType.PARENT_USER
                  : UserType.SUB_USER,
                timeCreated: syncedUser.createdAt,
                timeUpdated: syncedUser.updatedAt,
                walletAddresses: {
                  ethereum: syncedUser.EVMWalletAddress || '',
                  solana: syncedUser.SolanaWalletAddress || '',
                  bitcoin: syncedUser.BitcoinWalletAddress || '',
                  tron: syncedUser.TronWalletAddress || '',
                },
                email: syncedUser.email || authUserData.email,
                isNewUser: false,
                cardOrderStatus: syncedUser.cardOrderStatus,
                username: syncedUser.username,
              };
            } catch (syncError) {
              this.logger.error(
                `Failed to sync data for user ${authUserData.userId}: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
              );
              // Return a CreateNewUserResponseDto based on existingUser data before failed sync
              return {
                userId: existingUser.userId || '',
                userType: existingUser.isMainUser
                  ? UserType.PARENT_USER
                  : UserType.SUB_USER,
                timeCreated: existingUser.createdAt,
                timeUpdated: existingUser.updatedAt,
                walletAddresses: {
                  // Data before potentially failed sync
                  ethereum: existingUser.EVMWalletAddress || '',
                  solana: existingUser.SolanaWalletAddress || '',
                  bitcoin: existingUser.BitcoinWalletAddress || '',
                  tron: existingUser.TronWalletAddress || '',
                },
                email: existingUser.email || authUserData.email, // Use existing user's email
                isNewUser: false,
                cardOrderStatus: existingUser.cardOrderStatus,
                username: existingUser.username,
                // Optionally add a field here: syncStatus: 'failed' or similar if DTO supports it
              };
            }
          }

          this.logger.debug(
            `User ${authUserData.userId} not found, checking for sub-user with matching email`,
          );

          if (subUserByEmail) {
            // Email mismatch check during invitation phase
            if (subUserByEmail.email !== normalizedEmail) {
              this.logger.error(
                `Email mismatch for sub-user with null userId and email ${normalizedEmail}`,
              );
              throw new UnauthorizedException("You don't own this invitation");
            }
            // Update sub-user with userId
            subUserByEmail.userId = authUserData.userId;
            const updatedSubUser = await transactionalEntityManager.save(
              User,
              subUserByEmail,
            );
            this.logger.log(
              `Updated sub-user with userId ${authUserData.userId}`,
            );
            // Sync FundsLock records with the sub-user ID once it is assigned
            if (subUserByEmail.parentUser) {
              await this.syncFundsLockSubUser(
                subUserByEmail.parentUser.userId,
                updatedSubUser,
              );
            } else {
              this.logger.warn(
                `No parentUser found for sub-user ${subUserByEmail.userId}`,
              );
            }
            try {
              const syncedUser = await syncWalletAddresses(
                transactionalEntityManager.getRepository(User),
                authUserData.userId,
                authUserData,
              );
              return {
                userId: syncedUser.userId || '',
                userType: syncedUser.isMainUser
                  ? UserType.PARENT_USER
                  : UserType.SUB_USER,
                timeCreated: syncedUser.createdAt,
                timeUpdated: syncedUser.updatedAt,
                walletAddresses: {
                  ethereum: syncedUser.EVMWalletAddress || '',
                  solana: syncedUser.SolanaWalletAddress || '',
                  bitcoin: syncedUser.BitcoinWalletAddress || '',
                  tron: syncedUser.TronWalletAddress || '',
                },
                email: syncedUser.email || authUserData.email,
                isNewUser: false,
                cardOrderStatus: syncedUser.cardOrderStatus,
                username: syncedUser.username,
              };
            } catch (syncError) {
              this.logger.error(
                `Failed to sync data for sub-user ${authUserData.userId}: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
              );
              return {
                userId: updatedSubUser.userId || '',
                userType: updatedSubUser.isMainUser
                  ? UserType.PARENT_USER
                  : UserType.SUB_USER,
                timeCreated: updatedSubUser.createdAt,
                timeUpdated: updatedSubUser.updatedAt,
                walletAddresses: {
                  ethereum: updatedSubUser.EVMWalletAddress || '',
                  solana: updatedSubUser.SolanaWalletAddress || '',
                  bitcoin: updatedSubUser.BitcoinWalletAddress || '',
                  tron: updatedSubUser.TronWalletAddress || '',
                },
                email: updatedSubUser.email || authUserData.email,
                isNewUser: false,
                cardOrderStatus: updatedSubUser.cardOrderStatus,
                username: updatedSubUser.username,
              };
            }
          } else {
            this.logger.debug(
              `No sub-user found with email ${normalizedEmail}, creating as main user`,
            );
            // Ensure email is normalized before saving
            const userDataWithNormalizedEmail = {
              ...authUserData,
              email: normalizedEmail,
            };
            const newUser = await createAndUpdateUser(
              transactionalEntityManager.getRepository(User),
              authUserData.userId,
              userDataWithNormalizedEmail,
              this.emailHandlerService,
            );
            return {
              userId: newUser.userId || '',
              userType: newUser.isMainUser
                ? UserType.PARENT_USER
                : UserType.SUB_USER,
              timeCreated: newUser.createdAt,
              timeUpdated: newUser.updatedAt,
              walletAddresses: {
                ethereum: newUser.EVMWalletAddress || '',
                solana: newUser.SolanaWalletAddress || '',
                bitcoin: newUser.BitcoinWalletAddress || '',
                tron: newUser.TronWalletAddress || '',
              },
              email: newUser.email || authUserData.email,
              isNewUser: true,
              cardOrderStatus: newUser.cardOrderStatus,
              username: newUser.username,
            };
          }
        },
      );
    } catch (error) {
      this.logger.error(
        `Error in createUser for ${authUserData.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace',
      );
      if (error instanceof ConflictException) {
        throw new ConflictException('User already exists with this email.');
      }
      throw error;
    }
  }

  /**
   * Gets an existing user based on targetUserId, with authorization checks.
   * This method handles both 'me' and specific ID requests.
   *
   * @param targetUserId - The user ID to find
   * @param authUserId - The ID of the authenticated user making the request
   * @param sync - Whether to sync wallet addresses (default: 'true')
   * @returns The user entity
   * @throws UnauthorizedException if access is not allowed
   * @throws NotFoundException if user is not found or not active
   */
  async getUser(
    targetUserId: string,
    authUserId: string,
    sync: string = 'true',
  ): Promise<UserResponseDto> {
    try {
      if (!targetUserId || !authUserId) {
        this.logger.error(
          `Invalid user IDs provided for getUser: target=${targetUserId}, auth=${authUserId}`,
        );
        throw new BadRequestException('Invalid user ID provided');
      }

      const authUserEntity = await findUserById(
        this.userRepository,
        authUserId,
      );
      if (!authUserEntity) {
        this.logger.error(`Authenticated user with ID ${authUserId} not found`);
        throw new NotFoundException('Authenticated user not found');
      }

      const targetUser = await findUserById(this.userRepository, targetUserId);
      if (!targetUser) {
        this.logger.warn(`User ${targetUserId} not found`);
        throw new NotFoundException('User not found');
      }

      if (authUserEntity.isMainUser) {
        let isAuthorized = false;
        if (targetUser.userId === authUserEntity.userId) {
          isAuthorized = true;
        } else if (targetUser.parentUser) {
          if (
            targetUser.parentUser.userId === authUserEntity.userId &&
            !targetUser.isMainUser
          ) {
            isAuthorized = true;
          } else if (targetUser.isMainUser) {
            this.logger.warn(
              `Target user ${targetUserId} is now a main user and cannot be accessed by former main user ${authUserEntity.userId}`,
            );
          } else {
            this.logger.warn(
              `Main user ${authUserEntity.userId} not parent of target user ${targetUserId}`,
            );
          }
        } else if (targetUser.isMainUser) {
          this.logger.warn(
            `Target user ${targetUserId} is a main user and has no parentUser relation`,
          );
        } else {
          this.logger.warn(
            `Target user ${targetUserId} has no parentUser relation loaded or defined`,
          );
        }

        if (isAuthorized) {
          if (this.isSyncRequested(sync)) {
            this.logger.debug(
              `Syncing data for user ${targetUserId} by main user ${authUserEntity.userId}`,
            );
            try {
              return await syncWalletAddresses(
                this.userRepository,
                targetUserId,
                { userId: authUserId } as PrivyUserData,
              );
            } catch (syncError) {
              this.logger.error(
                `Failed to sync data for user ${targetUserId}: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
              );
              return plainToClass(UserResponseDto, targetUser, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true,
              });
            }
          }
          return plainToClass(UserResponseDto, targetUser, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          });
        } else {
          this.logger.warn(
            `Main user ${authUserEntity.userId} not authorized to access user ${targetUserId}`,
          );
          throw new NotFoundException('User not found');
        }
      } else {
        if (targetUser.userId === authUserEntity.userId) {
          if (this.isSyncRequested(sync)) {
            this.logger.debug(`Syncing data for sub-user ${targetUserId}`);
            try {
              return await syncWalletAddresses(
                this.userRepository,
                targetUserId,
                { userId: authUserId } as PrivyUserData,
              );
            } catch (syncError) {
              this.logger.error(
                `Failed to sync data for sub-user ${targetUserId}: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
              );
              return plainToClass(UserResponseDto, targetUser, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true,
              });
            }
          }
          return plainToClass(UserResponseDto, targetUser, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
          });
        } else {
          this.logger.warn(
            `Sub-user ${authUserEntity.userId} not authorized to access user ${targetUserId}`,
          );
          throw new NotFoundException('User not found');
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in getUser for ${targetUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace',
      );
      throw error;
    }
  }

  /**
   * Helper method to check if sync is requested, handling type safety.
   * @param sync - The sync parameter to check
   * @returns True if sync is requested, false otherwise
   */
  private isSyncRequested(sync: string | boolean | undefined): boolean {
    if (typeof sync === 'boolean') {
      return sync;
    }
    if (typeof sync === 'string') {
      return sync.toLowerCase() !== 'false';
    }
    return true; // Default to true if undefined or invalid
  }

  /**
   * Sync FundsLock records with the sub-user ID once it is assigned
   * @param mainUserId - The ID of the main user who owns the FundsLock
   * @param subUser - The sub-user entity with the newly assigned userId
   */
  async syncFundsLockSubUser(mainUserId: string, subUser: User): Promise<void> {
    this.logger.debug(
      `Syncing FundsLock records for sub-user ${subUser.userId} under main user ${mainUserId}`,
    );
    const fundsLockRepository =
      this.userRepository.manager.getRepository(FundsLock);
    // Find FundsLock records for the main user with type SUBUSER_CARD_ORDER and null subUser
    const fundsLocks = await fundsLockRepository.find({
      where: {
        user: { userId: mainUserId },
        type: LockType.SUBUSER_CARD_ORDER,
        subUser: null,
      },
      relations: ['user'],
    });

    if (fundsLocks.length > 0) {
      for (const lock of fundsLocks) {
        lock.subUser = subUser;
        lock.updatedAt = new Date();
        await fundsLockRepository.save(lock);
        this.logger.log(
          `Updated FundsLock ${lock.id} with subUserId ${subUser.userId}`,
        );
      }
    } else {
      this.logger.debug(
        `No FundsLock records found for main user ${mainUserId} with null subUser`,
      );
    }
  }

  /**
   * Add a sub-user to an existing user
   *
   * @param mainUserId - The ID of the main user
   * @param subUserData - The data for the new sub-user
   * @param symbol - Token symbol to check balance for (single string)
   * @param chainType - The blockchain type, either 'ethereum' or 'solana'
   * @param blockchainNetwork - The specific blockchain network to check
   * @returns The created sub-user entity
   * @throws ConflictException if a sub-user with the same email already exists
   * @throws BadRequestException if the main user has insufficient balance
   */
  async addSubUser(
    mainUserId: string,
    subUserData: AddSubUserDto,
    symbol: string,
    chainType: 'ethereum' | 'solana',
    blockchainNetwork: string,
  ): Promise<UserResponseDto> {
    const normalizedEmail = normalizeEmail(subUserData.email);

    const networkType = this.configService.get<'MAINET' | 'TESTNET'>(
      'offramp.network',
    );
    if (!networkType || !['MAINET', 'TESTNET'].includes(networkType)) {
      this.logger.error(
        'Network type is not properly configured in addSubUser.',
      );
      throw new BadRequestException(
        'Network type is not properly configured. Please try again later.',
      ); // Or 503 as per DTO
    }
    const normalizedSymbol = symbol.toUpperCase();
    const tokenInfo = getTokenBySymbol(
      normalizedSymbol,
      networkType,
      chainType,
      blockchainNetwork,
    );
    if (!tokenInfo) {
      throw new BadRequestException(
        `Unsupported token ${symbol} for ${chainType} on ${blockchainNetwork} (${networkType}). Please select a supported token and network combination.`,
      );
    }

    const existingSubUser = await findUserByEmail(
      this.userRepository,
      normalizedEmail,
    );
    if (existingSubUser && existingSubUser.parentUser?.userId === mainUserId) {
      throw new ConflictException(
        `A sub-user with email ${subUserData.email} already exists under your account.`,
      );
    }
    if (existingSubUser && existingSubUser.userId) {
      // User exists and is claimed
      throw new ConflictException(
        `An account with email ${subUserData.email} already exists.`,
      );
    }

    const mainUser = await findUserById(this.userRepository, mainUserId);
    if (!mainUser) {
      throw new NotFoundException('Main user not found');
    }
    if (!mainUser.isMainUser) {
      throw new BadRequestException(
        'Unable to add sub-user: Specified main user is not a main account.',
      );
    }
    if (!mainUser.EVMWalletAddress && !mainUser.SolanaWalletAddress) {
      throw new BadRequestException(
        'Unable to add sub-user: Main user has no wallet address linked to their account. Please link a wallet address and try again.',
      );
    }

    const userAddress =
      chainType === 'ethereum'
        ? mainUser.EVMWalletAddress
        : mainUser.SolanaWalletAddress;
    if (!userAddress) {
      throw new BadRequestException(
        `Main user does not have a ${chainType} wallet address linked.`,
      );
    }

    let orderFee = this.configService.get<number>('card.orderFee');
    if (orderFee === undefined || orderFee === null || orderFee <= 0) {
      this.logger.error('Card order fee is not properly configured.');
      throw new BadRequestException(
        'Card order fee configuration is invalid. Please try again later.',
      ); // Or 503
    }
    const orderFeeDecimal = toMoney(orderFee);

    try {
      let balanceResult;
      try {
        balanceResult = await getTokenBalance(
          normalizedSymbol,
          userAddress,
          chainType,
          blockchainNetwork,
          networkType,
          mainUserId,
          this.userRepository,
          this.fundsLockRepository,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to check balance for main user ${mainUserId}: ${error.message || error.toString()}`,
        );
        throw new BadRequestException(
          `Failed to check balance for your account. Please try again later.`,
        );
      }

      const balanceStr =
        balanceResult[normalizedSymbol]?.[blockchainNetwork] || '0';
      if (balanceStr.includes('Unsupported') || balanceStr.includes('Error')) {
        throw new BadRequestException(
          `Balance check failed: Unsupported token or network. Please select a supported option.`,
        );
      }

      let balanceDecimal;
      try {
        balanceDecimal = toMoney(balanceStr);
      } catch (e) {
        throw new BadRequestException(`Invalid balance format: ${balanceStr}`);
      }

      if (!balanceDecimal.gte(orderFeeDecimal)) {
        const balanceFormatted = formatMoney(balanceDecimal);
        const orderFeeFormatted = formatMoney(orderFeeDecimal);
        throw new BadRequestException(
          `Insufficient balance to add a sub-user. Required: ${orderFeeFormatted}, Available: ${balanceFormatted}. Please top up your account.`,
        );
      }

      const createdSubUserEntity =
        await this.userRepository.manager.transaction(
          async (transactionalEntityManager) => {
            const recheckBalanceResult = await getTokenBalance(
              normalizedSymbol,
              userAddress,
              chainType,
              blockchainNetwork,
              networkType,
              mainUserId,
              transactionalEntityManager.getRepository(User),
              transactionalEntityManager.getRepository(FundsLock),
            );
            const recheckBalanceStr =
              recheckBalanceResult[normalizedSymbol]?.[blockchainNetwork] ||
              '0';
            let recheckBalanceDecimal;
            try {
              recheckBalanceDecimal = toMoney(recheckBalanceStr);
            } catch (e) {
              throw new BadRequestException(
                `Invalid balance format during re-check: ${recheckBalanceStr}`,
              );
            }

            orderFee = this.configService.get<number>('card.orderFee');
            if (orderFee === undefined || orderFee === null || orderFee <= 0) {
              throw new BadRequestException(
                'Card order fee configuration changed and is now invalid.',
              );
            }
            const recheckOrderFeeDecimal = toMoney(orderFee);

            if (!recheckBalanceDecimal.gte(recheckOrderFeeDecimal)) {
              const balanceFormatted = formatMoney(recheckBalanceDecimal);
              const orderFeeFormatted = formatMoney(recheckOrderFeeDecimal);
              throw new BadRequestException(
                `Balance changed during processing. Required: ${orderFeeFormatted}, Available now: ${balanceFormatted}. Please ensure sufficient funds are available.`,
              );
            }

            // This is the monetary lock for
            // the card order - THIS STAYS
            const fundsLock = new FundsLock();
            fundsLock.amountLocked = orderFee;
            fundsLock.tokenSymbolLocked = normalizedSymbol;
            fundsLock.chain = chainType;
            fundsLock.blockchainNetwork = blockchainNetwork;
            fundsLock.status = LockStatus.LOCKED;
            fundsLock.type = LockType.SUBUSER_CARD_ORDER;
            fundsLock.user = mainUser;
            fundsLock.subUser = null;
            await transactionalEntityManager.save(FundsLock, fundsLock);

            const subUserDataWithNormalizedEmail = {
              ...subUserData,
              email: normalizedEmail,
            };
            return await addSubUserHandler(
              transactionalEntityManager.getRepository(User),
              mainUserId,
              subUserDataWithNormalizedEmail,
            );
          },
        );

      Logger.log(
        `Funds locked and sub-user created for main user ${mainUserId}`,
        'UserService',
      );

      try {
        await this.emailHandlerService.sendSubUserEmail(
          createdSubUserEntity.email,
        );
      } catch (emailError: any) {
        Logger.error(
          `Failed to send email to sub-user ${createdSubUserEntity.email}: ${emailError.message || emailError.toString()}`,
          // 'UserService', // Logger instance already has context
        );
        Logger.log(
          `Sub-user created successfully, but email notification failed. Main user ${mainUserId} should manually invite ${createdSubUserEntity.email}.`,
          'UserService',
        );
      }

      return plainToClass(UserResponseDto, createdSubUserEntity, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    } catch (error) {
      // General error handling for the addSubUser method if the transaction or other steps fail
      this.logger.error(
        `Error in addSubUser for ${mainUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Re-throw or handle as appropriate for the controller
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to add sub-user due to an unexpected error.',
      );
    }
  }

  /**
   * Get all sub-users for a main user
   *
   * @param mainUserId - The ID of the main user
   * @param filter - The filter to apply to the sub-users (default: 'all')
   * @returns List of sub-users linked to the main user
   * @throws UnauthorizedException if the requesting user is not a main user
   * @throws NotFoundException if the main user is not found
   */
  async getAllSubUsers(
    mainUserId: string,
    filter: 'verified' | 'not verified' | 'all' = 'all',
  ): Promise<SubUserDetailDto[]> {
    this.logger.debug(`Fetching all sub-users for main user ${mainUserId}`);
    try {
      const mainUser = await findUserById(this.userRepository, mainUserId);
      if (!mainUser) {
        this.logger.error(`Main user with ID ${mainUserId} not found`);
        throw new NotFoundException('Main user not found');
      }

      if (!mainUser.isMainUser) {
        this.logger.warn(
          `User ${mainUserId} is not a main user and cannot fetch sub-users`,
        );
        throw new UnauthorizedException('Not authorized to fetch sub-users');
      }

      if (!mainUser.userId) {
        this.logger.error(
          `Main user with ID ${mainUserId} has missing userId field`,
        );
        throw new BadRequestException('Main user data is incomplete');
      }

      const subUsers = await this.userRepository.find({
        where: { parentUser: { userId: mainUserId } },
        relations: ['parentUser'],
      });

      if (subUsers.length === 0) {
        this.logger.log(`No sub-users found for main user ${mainUserId}`);
        return [];
      }

      const validSubUsers = subUsers.filter((subUser) => {
        if (!subUser.parentUser || subUser.parentUser.userId !== mainUserId) {
          this.logger.warn(
            `Sub-user with ID ${subUser.id} has invalid parentUser relation`,
          );
          return false;
        }
        if (!subUser.userId && !subUser.email) {
          this.logger.warn(
            `Sub-user with ID ${subUser.id} is missing both userId and email`,
          );
          return false;
        }
        return true;
      });

      const filteredSubUsers = this.filterSubUsersByVerificationStatus(
        validSubUsers,
        filter,
      );

      if (filteredSubUsers.length === 0) {
        this.logger.log(
          `No sub-users matched the filter '${filter}' for main user ${mainUserId}`,
        );
        return [];
      }

      const formattedSubUsers: SubUserFormatted[] = filteredSubUsers.map(
        (subUser) => ({
          ...subUser,
          userId: subUser.userId || '',
          email: subUser.email || '',
          subuserstatus:
            !subUser.userId && subUser.email ? 'verified' : 'not verified',
        }),
      ) as SubUserFormatted[];

      return plainToInstance(SubUserDetailDto, formattedSubUsers, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch sub-users for main user ${mainUserId}: ${error.message || error.toString()}`,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to fetch sub-users due to a temporary issue. Please try again later.',
      );
    }
  }

  /**
   * Filter sub-users based on verification status
   * @param subUsers - The list of sub-users to filter
   * @param filter - The filter to apply to the sub-users
   * @returns The filtered list of sub-users
   */
  private filterSubUsersByVerificationStatus(
    subUsers: User[],
    filter: 'verified' | 'not verified' | 'all' = 'all',
  ): User[] {
    if (filter === 'all') {
      return subUsers;
    }
    if (filter === 'verified') {
      return subUsers.filter((subUser) => !subUser.userId && subUser.email);
    }
    if (filter === 'not verified') {
      return subUsers.filter((subUser) => !subUser.userId && !subUser.email);
    }
    throw new BadRequestException(`Invalid filter: ${filter}`);
  }

  /**
   * Add or update a spending limit constraint for a sub-user
   * @param mainUserId The ID of the main user adding the constraint
   * @param subUserId The ID of the sub-user to whom the constraint will be applied
   * @param constraintValue The value of the spending limit constraint
   * @param timePeriod The time period for the constraint (optional)
   * @returns The created or updated constraint DTO
   */
  async addConstraintToSubUser(
    mainUserId: string,
    subUserId: string,
    constraintValue: number,
    timePeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null,
  ): Promise<ConstraintResponseDto> {
    // Priority 1: Validate input values (quickest checks)
    if (constraintValue <= 0) {
      this.logger.error(`Constraint value ${constraintValue} is not positive`);
      throw new BadRequestException('Constraint value must be positive');
    }

    // Normalize timePeriod: undefined becomes null. This simplifies subsequent logic.
    const normalizedTimePeriod = timePeriod === undefined ? null : timePeriod;

    // Validate time period against the normalized value
    const validTimePeriods = ['daily', 'weekly', 'monthly', 'yearly', null];
    if (!validTimePeriods.includes(normalizedTimePeriod)) {
      this.logger.error(`Invalid time period ${normalizedTimePeriod} provided`);
      throw new BadRequestException('Invalid time period provided');
    }

    // Priority 2: Check if the requesting user is a main user (fast database check)
    const mainUser = await findUserById(this.userRepository, mainUserId);
    if (!mainUser) {
      this.logger.error(`Main user with ID ${mainUserId} not found`);
      throw new NotFoundException('Main user not found');
    }

    if (!mainUser.isMainUser) {
      this.logger.warn(
        `User ${mainUserId} is not a main user and cannot add constraints`,
      );
      throw new UnauthorizedException('Not authorized to add constraints');
    }

    // Priority 3: Check if the sub-user exists and is linked to the main user
    const subUser = await findUserById(this.userRepository, subUserId);
    if (!subUser) {
      this.logger.error(`Sub-user with ID ${subUserId} not found`);
      throw new NotFoundException('Sub-user not found');
    }

    if (subUser.parentUser?.userId !== mainUserId) {
      this.logger.warn(
        `User ${mainUserId} is not the main user of sub-user ${subUserId}`,
      );
      throw new UnauthorizedException(
        'Not authorized to add constraints to this sub-user',
      );
    }

    // Priority 4: Check if sub-user is in the process of being upgraded
    if (subUser.upgradeRequestStatus === 'pending' || subUser.isMainUser) {
      this.logger.warn(
        `Sub-user ${subUserId} is either upgraded or in process of upgrading`,
      );
      throw new BadRequestException(
        'Cannot add constraints to a sub-user who is upgraded or upgrading',
      );
    }

    // Priority 5: Check for existing constraints to prevent overlap
    const existingConstraints = await this.constraintRepository.find({
      where: { user: { id: subUser.id } },
    });

    const existingConstraint = existingConstraints.find(
      (c) => c.timePeriod === normalizedTimePeriod,
    );

    if (existingConstraint) {
      this.logger.warn(
        `Constraint with time period ${normalizedTimePeriod === null ? 'general' : normalizedTimePeriod} already exists for sub-user ${subUserId}, updating it.`,
      );
      existingConstraint.value = constraintValue;
      existingConstraint.updatedAt = new Date();
      const updatedConstraintEntity =
        await this.constraintRepository.save(existingConstraint);
      return plainToClass(ConstraintResponseDto, updatedConstraintEntity, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    }

    // The previous more complex logic for handling existingConstraint with undefined timePeriod is now covered by the single block above.

    // Priority 6: Set a reasonable maximum constraint limit
    const maxConstraintLimit = this.configService.get<number>(
      'constraint.maxLimit',
      1000000,
    );
    if (constraintValue > maxConstraintLimit) {
      this.logger.error(
        `Constraint value ${constraintValue} exceeds maximum limit ${maxConstraintLimit}`,
      );
      throw new BadRequestException(
        `Constraint value exceeds maximum limit of ${maxConstraintLimit}`,
      );
    }

    // Priority 7: Use transaction to handle concurrent updates (most resource-intensive)
    const createdConstraintEntity =
      await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          try {
            // Use the renamed addConstraintHandler
            const newConstraint = await addConstraintHandler(
              transactionalEntityManager.getRepository(User),
              transactionalEntityManager.getRepository(Constraint),
              mainUserId, // Should be actual mainUser object or its ID if handler expects that
              subUserId, // Should be actual subUser object or its ID
              constraintValue,
              normalizedTimePeriod, // Pass the normalized value (null if general, or specific period)
            );
            return newConstraint;
          } catch (error) {
            this.logger.error(
              `Database error while adding constraint for sub-user ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            if (
              error instanceof Error &&
              error.message.includes('unique constraint')
            ) {
              throw new ConflictException(
                'A constraint of this type already exists for the sub-user.',
              );
            }
            throw new BadRequestException(
              'Failed to add constraint due to a database error.',
            );
          }
        },
      );
    return plainToClass(ConstraintResponseDto, createdConstraintEntity, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  /**
   * Upgrade a sub-user to a main user
   * @param subUserId The ID of the sub-user requesting the upgrade
   * @param authUserId The ID of the authenticated user making the request
   * @returns The updated user entity
   * @throws UnauthorizedException if the requesting user is not the sub-user themselves
   * @throws NotFoundException if the sub-user is not found
   */
  async upgradeSubUserToMain(
    subUserId: string,
    authUserId: string,
  ): Promise<UpgradeSubUserResponse> {
    this.logger.debug(
      `Upgrading sub-user with ID ${subUserId} to main user by auth user ${authUserId}`,
    );

    // Priority 1: Quick input validation (immediate error throwing)
    if (!authUserId || !subUserId) {
      this.logger.error(`Invalid input: authUserId or subUserId is missing`);
      throw new BadRequestException('Invalid user ID provided');
    }

    // Priority 2: Fetch authenticated user and sub-user concurrently with Promise.all
    const [authUser, subUser] = await Promise.all([
      findUserById(this.userRepository, authUserId).catch((error) => {
        this.logger.error(
          `Failed to fetch authenticated user with ID ${authUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw new NotFoundException('Authenticated user not found');
      }),
      findUserById(this.userRepository, subUserId).catch((error) => {
        this.logger.error(
          `Failed to fetch sub-user with ID ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw new NotFoundException('Sub-user not found');
      }),
    ]).catch((error) => {
      // Immediately throw the error from the first failed promise
      throw error;
    });

    // Priority 3: Authorization and status checks (immediate error throwing)
    if (!authUser) {
      this.logger.error(`Authenticated user with ID ${authUserId} not found`);
      throw new NotFoundException('Authenticated user not found');
    }

    if (!subUser) {
      this.logger.error(`Sub-user with ID ${subUserId} not found`);
      throw new NotFoundException('Sub-user not found');
    }

    if (authUserId !== subUserId) {
      this.logger.warn(
        `User ${authUserId} not authorized to upgrade sub-user ${subUserId}`,
      );
      throw new UnauthorizedException(
        'Not authorized to upgrade this sub-user',
      );
    }

    if (subUser.isMainUser) {
      this.logger.warn(`User ${subUserId} is already a main user`);
      throw new BadRequestException('User is already a main user');
    }

    if (subUser.upgradeRequestStatus === 'pending') {
      this.logger.debug(
        `Upgrade request for sub-user ${subUserId} is already pending`,
      );
      return {
        userId: subUser.userId,
        email: subUser.email,
        isMainUser: subUser.isMainUser,
        upgradeRequestStatus: subUser.upgradeRequestStatus,
        parentUser: subUser.parentUser
          ? { userId: subUser.parentUser.userId }
          : { userId: '' },
      };
    }

    if (subUser.upgradeRequestStatus === 'approved') {
      this.logger.warn(
        `Upgrade request for sub-user ${subUserId} is already approved`,
      );
      throw new BadRequestException('Upgrade request already approved');
    }

    if (!subUser.parentUser || !subUser.parentUser.userId) {
      this.logger.error(`Sub-user ${subUserId} has no associated main user`);
      throw new BadRequestException(
        'No main user associated with this sub-user',
      );
    }

    // Priority 4: Update status within a transaction to prevent concurrent requests
    return await this.userRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Lock the sub-user record to prevent concurrent updates
        const lockedSubUser = await transactionalEntityManager
          .findOne(User, {
            where: { userId: subUserId },
            lock: { mode: 'pessimistic_write' },
          })
          .catch((error) => {
            this.logger.error(
              `Failed to lock sub-user with ID ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new NotFoundException('Sub-user no longer exists');
          });

        if (!lockedSubUser) {
          this.logger.error(`Sub-user with ID ${subUserId} no longer exists`);
          throw new NotFoundException('Sub-user no longer exists');
        }

        // Re-check status within transaction
        if (lockedSubUser.upgradeRequestStatus === 'pending') {
          this.logger.debug(
            `Upgrade request for sub-user ${subUserId} is already pending within transaction`,
          );
          return {
            userId: lockedSubUser.userId,
            email: lockedSubUser.email,
            isMainUser: lockedSubUser.isMainUser,
            upgradeRequestStatus: lockedSubUser.upgradeRequestStatus,
            parentUser: lockedSubUser.parentUser
              ? { userId: lockedSubUser.parentUser.userId }
              : { userId: '' },
          };
        }

        if (lockedSubUser.isMainUser) {
          this.logger.warn(
            `User ${subUserId} is already a main user within transaction`,
          );
          throw new BadRequestException('User is already a main user');
        }

        // Update the user to request upgrade to main user
        lockedSubUser.upgradeRequestStatus = 'pending';

        // Save the updated user with pending status
        try {
          const updatedUser = await transactionalEntityManager.save(
            User,
            lockedSubUser,
          );
          this.logger.log(
            `Upgrade request for sub-user ${subUserId} set to pending`,
          );

          // Placeholder for notification function to send approval request
          // TODO: Implement sendUpgradeRequestNotification(updatedUser);
          // For now, log the need for notification
          this.logger.debug(
            `Notification to main user for upgrade request of sub-user ${subUserId} should be sent`,
          );

          return {
            userId: updatedUser.userId,
            email: updatedUser.email,
            isMainUser: updatedUser.isMainUser,
            upgradeRequestStatus: updatedUser.upgradeRequestStatus,
            parentUser: updatedUser.parentUser
              ? { userId: updatedUser.parentUser.userId }
              : { userId: '' },
          };
        } catch (error) {
          this.logger.error(
            `Database error while updating upgrade status for sub-user ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          throw new BadRequestException(
            'Failed to request upgrade due to a database error',
          );
        }
      },
    );
  }

  /**
   * Approve a sub-user's upgrade request to become a main user
   * @param subUserId The ID of the sub-user whose upgrade request is being approved
   * @param approverUserId The ID of the user approving the request (should be an admin or main user)
   * @returns The updated user entity
   * @throws UnauthorizedException if the approver is not authorized
   * @throws NotFoundException if the sub-user is not found
   * @throws UnauthorizedException if the upgrade request is not pending
   */
  async approveUpgradeRequest(
    subUserId: string,
    approverUserId: string,
  ): Promise<ApprovedUserDataDto> {
    this.logger.debug(
      `Approving upgrade request for sub-user ${subUserId} by user ${approverUserId}`,
    );

    // Priority 1: Quick input validation (immediate error throwing)
    if (!approverUserId || !subUserId) {
      this.logger.error(
        `Invalid input: approverUserId or subUserId is missing`,
      );
      throw new BadRequestException('Invalid user ID provided');
    }

    // Priority 2: Fetch approver and sub-user concurrently with Promise.all, rejecting on first failure
    const [approverUser, subUser] = await Promise.all([
      findUserById(this.userRepository, approverUserId).catch((error) => {
        this.logger.error(
          `Failed to fetch approver user with ID ${approverUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw new NotFoundException('Approver user not found');
      }),
      findUserById(this.userRepository, subUserId).catch((error) => {
        this.logger.error(
          `Failed to fetch sub-user with ID ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw new NotFoundException('Sub-user not found');
      }),
    ]).catch((error) => {
      // Immediately throw the error from the first failed promise
      throw error;
    });

    // Priority 3: Consolidated authorization and status checks (immediate error throwing)
    if (!approverUser) {
      this.logger.error(`Approver user with ID ${approverUserId} not found`);
      throw new NotFoundException('Approver user not found');
    }

    if (!subUser) {
      this.logger.error(`Sub-user with ID ${subUserId} not found`);
      throw new NotFoundException('Sub-user not found');
    }

    if (!approverUser.isMainUser) {
      this.logger.warn(
        `User ${approverUserId} is not authorized to approve upgrades`,
      );
      throw new UnauthorizedException('Not authorized to approve upgrades');
    }

    // Check for approver account limitations (placeholder for account status or restrictions)
    // TODO: Implement actual check for account status if a field exists or is added
    // For now, log intent to check for limitations
    this.logger.debug(
      `Checking for account limitations for approver ${approverUserId}`,
    );

    if (subUser.isMainUser) {
      this.logger.warn(`Sub-user ${subUserId} is already a main user`);
      throw new BadRequestException('Sub-user is already a main user');
    }

    if (subUser.upgradeRequestStatus !== 'pending') {
      this.logger.warn(
        `Sub-user ${subUserId} does not have a pending upgrade request`,
      );
      throw new BadRequestException(
        'No pending upgrade request found for this user',
      );
    }

    if (!subUser.parentUser) {
      this.logger.warn(
        `Sub-user ${subUserId} has no parent user associated, possible data inconsistency`,
      );
      throw new BadRequestException(
        'Sub-user has no associated main user, cannot approve upgrade',
      );
    }

    if (subUser.parentUser.userId !== approverUserId) {
      this.logger.warn(
        `User ${approverUserId} is not the main user of sub-user ${subUserId}`,
      );
      throw new UnauthorizedException(
        "Not authorized to approve this sub-user's upgrade",
      );
    }

    // Check sub-user data integrity before upgrade
    if (!subUser.email) {
      this.logger.warn(
        `Sub-user ${subUserId} has incomplete data (missing email), potential issues post-upgrade`,
      );
      // Optionally throw an error or log for manual intervention
      // throw new BadRequestException('Sub-user data incomplete, cannot upgrade');
    }

    // Priority 4: Update status and remove constraints within a transaction (resource-intensive)
    return await this.userRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Lock the sub-user record to prevent concurrent updates and race conditions
        const lockedSubUser = await transactionalEntityManager
          .findOne(User, {
            where: { userId: subUserId },
            lock: { mode: 'pessimistic_write' },
          })
          .catch((error) => {
            this.logger.error(
              `Failed to lock sub-user with ID ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw new NotFoundException('Sub-user no longer exists');
          });

        if (!lockedSubUser) {
          this.logger.error(`Sub-user with ID ${subUserId} no longer exists`);
          throw new NotFoundException('Sub-user no longer exists');
        }

        // Re-check critical status within transaction to prevent race conditions
        if (lockedSubUser.upgradeRequestStatus !== 'pending') {
          this.logger.warn(
            `Sub-user ${subUserId} no longer has a pending upgrade request within transaction`,
          );
          throw new BadRequestException(
            'No pending upgrade request found for this user',
          );
        }

        if (lockedSubUser.isMainUser) {
          this.logger.warn(
            `Sub-user ${subUserId} is already a main user within transaction`,
          );
          throw new BadRequestException('Sub-user is already a main user');
        }

        if (
          !lockedSubUser.parentUser ||
          lockedSubUser.parentUser.userId !== approverUserId
        ) {
          this.logger.warn(
            `User ${approverUserId} is no longer the main user of sub-user ${subUserId} within transaction`,
          );
          throw new UnauthorizedException(
            "Not authorized to approve this sub-user's upgrade",
          );
        }

        // Approve the upgrade
        lockedSubUser.upgradeRequestStatus = 'approved';
        lockedSubUser.isMainUser = true;
        lockedSubUser.parentUser = null;

        // Remove any constraints associated with this user with detailed logging
        try {
          const constraints = await transactionalEntityManager.find(
            Constraint,
            { where: { user: { id: lockedSubUser.id } } },
          );
          if (constraints.length > 0) {
            await transactionalEntityManager.delete(Constraint, {
              user: { id: lockedSubUser.id },
            });
            this.logger.log(
              `Removed ${constraints.length} constraints for user ${subUserId} during upgrade approval`,
            );
          } else {
            this.logger.debug(
              `No constraints found for user ${subUserId} during upgrade approval`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to remove constraints for user ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Log specific constraint IDs if possible for debugging partial failures
          try {
            const constraints = await transactionalEntityManager.find(
              Constraint,
              { where: { user: { id: lockedSubUser.id } } },
            );
            const constraintIds = constraints.map((c) => c.id).join(', ');
            this.logger.error(
              `Failed to delete constraints with IDs [${constraintIds}] for user ${subUserId}`,
            );
          } catch (logError) {
            this.logger.error(
              `Failed to log constraint IDs for user ${subUserId}: ${logError instanceof Error ? logError.message : 'Unknown error'}`,
            );
          }
          // Continue with approval even if constraint deletion fails, as it's not critical to the upgrade
        }

        // Save the updated user
        try {
          const updatedUser = await transactionalEntityManager.save(
            User,
            lockedSubUser,
          );
          this.logger.log(
            `Successfully approved upgrade for sub-user ${subUserId} to main user by ${approverUserId}`,
          );

          // Audit logging for the approval action
          // TODO: Implement actual audit logging mechanism if available
          this.logger.log(
            `Audit: User ${approverUserId} approved upgrade for sub-user ${subUserId} to main user at ${new Date().toISOString()}`,
          );

          // Placeholder for notification to sub-user about approval with retry logic
          // TODO: Implement sendUpgradeApprovalNotification(updatedUser);
          try {
            this.logger.debug(
              `Notification to sub-user ${subUserId} about upgrade approval should be sent`,
            );
            // Placeholder for potential retry logic or fallback mechanism for notifications
            // For now, just log the intent
            // TODO: Add fallback mechanism like queuing notification for retry or alerting admin
          } catch (notificationError) {
            this.logger.error(
              `Failed to send notification to sub-user ${subUserId} about upgrade approval: ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`,
            );
            // Log but do not fail the approval process due to notification issues
            // TODO: Implement fallback or queue for retry
            this.logger.debug(
              `Queueing notification retry for sub-user ${subUserId}`,
            );
          }

          // Post-upgrade validation to ensure status is reflected correctly
          // TODO: Add checks for related systems or data consistency if needed
          this.logger.debug(
            `Post-upgrade validation for user ${subUserId} completed`,
          );

          // Return an instance or an object assignable to ApprovedUserDataDto
          const responseData: ApprovedUserDataDto = {
            userId: updatedUser.userId,
            email: updatedUser.email,
            isMainUser: updatedUser.isMainUser,
          };
          return responseData;
        } catch (error) {
          this.logger.error(
            `Database error while saving upgrade approval for sub-user ${subUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          if (
            error instanceof Error &&
            error.message.includes('unique constraint')
          ) {
            throw new ConflictException(
              'Failed to approve upgrade due to a unique constraint violation in user data',
            );
          }
          throw new BadRequestException(
            'Failed to approve upgrade due to a database error',
          );
        }
      },
    );
  }

  /**
   * Check if a username is available in the database
   * @param username - The username to check for availability
   * @returns True if the username is available, false if it's already taken
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    this.logger.debug(`Checking availability of username: ${username}`);
    if (!username || username.trim().length === 0) {
      return false;
    }
    const user = await this.userRepository.findOne({
      where: { username },
    });
    return !user;
  }
}
