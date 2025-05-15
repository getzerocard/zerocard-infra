import {
  BadRequestException,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { PrivyUser } from '../auth/decorators/privy-user.decorator';
import { PrivyUserData } from '../auth/interfaces/privy-user.interface';
import { ValidationPipe } from '../../common/pipes';
import { Trim } from '../../common/decorators/trim.decorator';
import { resolveAndAuthorizeUserId } from '../../common/util/auth.util';
import { MinimumValuePipe } from '../../common/pipes/minimum-value.pipe';
import { ApiController } from '../../common/decorators/api-controller.decorator';
import { ApiStandardResponse } from '../../common/decorators/api-response.decorator';
import { GetUserErrorResponses, UserResponseDto } from './dto/get-user.dto';
import { UpdateUserDto, UpdateUserErrorResponses } from './dto/update-user.dto';
import {
  AddSubUserDto,
  AddSubUserErrorResponses,
} from './dto/add-sub-user.dto';
import {
  GetSubUsersErrorResponses,
  SubUserDetailDto,
} from './dto/get-sub-users.dto';
import {
  ConstraintResponseDto,
  SetConstraintDto,
  SetConstraintErrorResponses,
} from './dto/set-constraint.dto';
import {
  UpgradeSubUserErrorResponses,
  UpgradeSubUserResponse,
} from './dto/upgrade-sub-user.dto';
import {
  ApproveUpgradeErrorResponses,
  ApprovedUserDataDto,
} from './dto/approve-upgrade.dto';
import {
  CheckUsernameDataDto,
  CheckUsernameErrorResponses,
} from './dto/check-username.dto';
import {
  CreateNewUserResponseDto,
  CreateUserErrorResponses,
} from './dto/create-user.dto';

/**
 * Controller for user management
 */
@ApiController('users', 'users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) { }

  /**
   * Get a user by their userId, optionally syncing wallet data from Privy
   *
   * This endpoint serves as the main entry point for retrieving or creating users:
   * - Creates a new user if they don't exist yet
   * - Updates wallet addresses for existing users
   * - Returns the complete user profile
   *
   * @param userId The userId to look up or 'me' for current user
   * @param sync Whether to sync wallet data from Privy (default: true)
   * @param userData The authenticated user's data (injected by PrivyUser decorator)
   * @returns User profile
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Get user profile',
    description:
      "Get a user by their userId or 'me'. Optionally syncs wallet data from auth provider.",
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
    example: 'did:privy:abc123xyz',
  })
  @ApiQuery({
    name: 'sync',
    required: false,
    description:
      'Whether to sync wallet data from auth provider (default: true)',
    type: 'boolean',
    example: true,
  })
  @ApiStandardResponse(UserResponseDto)
  @ApiResponse(GetUserErrorResponses.responses[0])
  @ApiResponse(GetUserErrorResponses.responses[1])
  @ApiResponse(GetUserErrorResponses.responses[2])
  async getUser(
    @Param('userId') @Trim() userId: string,
    @Query('sync') sync: string = 'true',
    @PrivyUser() userData: PrivyUserData,
  ): Promise<UserResponseDto> {
    // If userId is 'me', use the authenticated user's ID
    const targetUserId = userId === 'me' ? userData.userId : userId;

    // Determine if sync is needed
    const usedMe = userId === 'me';
    const shouldSync = sync.toLowerCase() === 'true';

    // Use getUser for retrieval with proper authorization
    return this.userService.getUser(
      targetUserId,
      userData.userId,
      shouldSync || usedMe ? 'true' : 'false',
    );
  }

  /**
   * Update user profile with partial data
   *
   * This endpoint allows updating specific fields of the user profile.
   * You only need to include the fields you want to change.
   *
   * @param userId The userId to update or 'me' for current user
   * @param updateData The partial data to update
   * @param userData The authenticated user's data
   * @returns Updated user profile
   */
  @Patch(':userId')
  @ApiOperation({ summary: 'Update user information', description: 'Update user details such as username, timezone, and shipping address, with optional blockchain type for wallet linking.' })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiStandardResponse(UserResponseDto)
  @ApiResponse(UpdateUserErrorResponses.responses[0])
  @ApiResponse(UpdateUserErrorResponses.responses[1])
  @ApiResponse(UpdateUserErrorResponses.responses[2])
  @ApiResponse(UpdateUserErrorResponses.responses[3])
  async updateUser(
    @Param('userId') @Trim() userId: string,
    @Body(new ValidationPipe()) updateData: UpdateUserDto,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<UserResponseDto> {
    this.logger.log(`Updating user with ID ${userId}`);
    return this.userService.update(userData.userId, userId, updateData);
  }

  /**
   * Add a sub-user under the authenticated main user
   * @param userId The ID of the main user or 'me' for the authenticated user
   * @param subUserDto The data for the new sub-user
   * @param userData The authenticated user's data
   * @returns The created sub-user
   */
  @Post('add-sub-user/:userId')
  @ApiOperation({ summary: 'Add a sub-user under a main user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
  })
  @ApiBody({
    type: AddSubUserDto,
    examples: {
      addSubUser: {
        summary: 'Add Sub-User',
        value: {
          email: 'jane.doe@example.com',
        },
      },
    },
  })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Token symbol to check balance for',
    type: String,
    example: 'USDC',
  })
  @ApiQuery({
    name: 'chainType',
    required: false,
    description: 'Blockchain type',
    type: String,
    example: 'ethereum',
    enum: ['ethereum', 'solana'],
  })
  @ApiQuery({
    name: 'blockchainNetwork',
    required: false,
    description: 'Specific blockchain network',
    type: String,
    example: 'Base',
  })
  @ApiStandardResponse(UserResponseDto)
  @ApiResponse(AddSubUserErrorResponses[0])
  @ApiResponse(AddSubUserErrorResponses[1])
  @ApiResponse(AddSubUserErrorResponses[2])
  async addSubUser(
    @Param('userId') @Trim() userId: string,
    @Body(new ValidationPipe()) subUserDto: AddSubUserDto,
    @PrivyUser() userData: PrivyUserData,
    @Query('symbol') symbol: string = 'USDC',
    @Query('chainType') chainType: 'ethereum' | 'solana' = 'ethereum',
    @Query('blockchainNetwork') blockchainNetwork: string = 'Base',
  ): Promise<UserResponseDto> {
    // Resolve target user ID and check authorization
    const targetUserId = resolveAndAuthorizeUserId(
      userId,
      userData.userId,
      'Cannot add sub-user for another user',
    );

    this.logger.log(`Adding sub-user for main user ${targetUserId}`);
    const subUser = await this.userService.addSubUser(
      targetUserId,
      subUserDto,
      symbol,
      chainType,
      blockchainNetwork,
    );
    return subUser;
  }

  /**
   * Get all sub-users for a main user
   * @param userId The ID of the main user or 'me' for the authenticated user
   * @param filter The filter to apply to the sub-users (default: 'all')
   * @param userData The authenticated user's data
   * @returns List of sub-users linked to the main user
   */
  @Get('sub-users/:userId')
  @ApiOperation({ summary: 'Get all sub-users for a main user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    description: 'Filter sub-users by verification status',
    type: String,
    enum: ['verified', 'not verified', 'all'],
    example: 'all',
  })
  @ApiStandardResponse(SubUserDetailDto)
  @ApiResponse(GetSubUsersErrorResponses.responses[0])
  @ApiResponse(GetSubUsersErrorResponses.responses[1])
  @ApiResponse(GetSubUsersErrorResponses.responses[2])
  async getAllSubUsers(
    @Param('userId') @Trim() userId: string,
    @Query('filter') filter: 'verified' | 'not verified' | 'all' = 'all',
    @PrivyUser() userData: PrivyUserData,
  ): Promise<SubUserDetailDto[]> {
    // Resolve target user ID and check authorization
    const targetUserId = resolveAndAuthorizeUserId(
      userId,
      userData.userId,
      'Cannot fetch sub-users for another user',
    );

    this.logger.log(`Fetching all sub-users for main user ${targetUserId}`);
    return this.userService.getAllSubUsers(targetUserId, filter);
  }

  /**
   * Set or update a spending limit constraint for a sub-user
   * @param userId The ID of the main user or 'me' for the authenticated user
   * @param body The request body containing the sub-user ID, constraint value, and optional time period
   * @param userData The authenticated user's data
   * @returns The created or updated constraint
   */
  @Patch(':userId/constraints')
  @ApiOperation({
    summary: 'Set or update spending limit constraint for a sub-user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
  })
  @ApiBody({ type: SetConstraintDto })
  @ApiStandardResponse(ConstraintResponseDto)
  @ApiResponse(SetConstraintErrorResponses.responses[0])
  @ApiResponse(SetConstraintErrorResponses.responses[1])
  @ApiResponse(SetConstraintErrorResponses.responses[2])
  @ApiResponse(SetConstraintErrorResponses.responses[3])
  async setOrUpdateConstraint(
    @Param('userId') @Trim() userId: string,
    @Body(new ValidationPipe(), new MinimumValuePipe(1, 'constraintValue'))
    body: SetConstraintDto,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<ConstraintResponseDto> {
    const mainUserId = userId === 'me' ? userData.userId : userId;
    // Ensure the authenticated user can only add constraints as themselves
    if (mainUserId !== userData.userId) {
      throw new UnauthorizedException(
        'Not authorized to set or update constraints as another user',
      );
    }
    // Removed redundant checks for mainUser and subUser ownership.
    // The userService.addConstraintToSubUser handles these validations.
    return this.userService.addConstraintToSubUser(
      mainUserId,
      body.subUserId,
      body.constraintValue,
      body.timePeriod,
    );
  }

  /**
   * Request to upgrade from sub-user to main user
   * @param userId The ID of the sub-user or 'me' for the authenticated user
   * @param userData The authenticated user's data
   * @returns The updated user profile
   */
  @Post(':userId/upgrade-to-main')
  @ApiOperation({ summary: 'Request upgrade from sub-user to main user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID or "me" for current authenticated user',
  })
  @ApiStandardResponse(UpgradeSubUserResponse)
  @ApiResponse(UpgradeSubUserErrorResponses.responses[0])
  @ApiResponse(UpgradeSubUserErrorResponses.responses[1])
  async upgradeToMainUser(
    @Param('userId') @Trim() userId: string,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<UpgradeSubUserResponse> {
    const targetUserId = userId === 'me' ? userData.userId : userId;
    // Ensure the authenticated user can only request upgrade for themselves
    if (targetUserId !== userData.userId) {
      throw new UnauthorizedException('Not authorized to upgrade another user');
    }
    return this.userService.upgradeSubUserToMain(targetUserId, userData.userId);
  }

  /**
   * Approve a sub-user's request to upgrade to main user
   * @param mainUserId The ID of the main user or 'me' for the authenticated user
   * @param subUserId The ID of the sub-user whose upgrade request is being approved
   * @param userData The authenticated user's data
   * @returns The updated user profile
   */
  @Post(':mainUserId/approve-upgrade/:subUserId')
  @ApiOperation({
    summary: "Approve a sub-user's upgrade request to main user",
  })
  @ApiParam({
    name: 'mainUserId',
    description: 'Main User ID or "me" for current authenticated user',
  })
  @ApiParam({
    name: 'subUserId',
    description: 'Sub-user ID whose upgrade request is being approved',
  })
  @ApiStandardResponse(ApprovedUserDataDto)
  @ApiResponse(ApproveUpgradeErrorResponses.responses[0])
  @ApiResponse(ApproveUpgradeErrorResponses.responses[1])
  async approveUpgrade(
    @Param('mainUserId') @Trim() mainUserId: string,
    @Param('subUserId') @Trim() subUserId: string,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<ApprovedUserDataDto> {
    const targetMainUserId = mainUserId === 'me' ? userData.userId : mainUserId;
    return this.userService.approveUpgradeRequest(subUserId, targetMainUserId);
  }

  /**
   * Check if a username is available
   * @param username The username to check
   * @returns Object indicating if the username is available
   */
  @Get('check-username/:username')
  @ApiOperation({ summary: 'Check if a username is available' })
  @ApiParam({
    name: 'username',
    description: 'Username to check for availability',
  })
  @ApiStandardResponse(CheckUsernameDataDto)
  @ApiResponse(CheckUsernameErrorResponses.responses[0])
  async checkUsernameAvailability(
    @Param('username') @Trim() username: string,
  ): Promise<CheckUsernameDataDto> {
    this.logger.log(`Checking availability of username: ${username}`);
    const available = await this.userService.isUsernameAvailable(username);
    return { available };
  }

  /**
   * Create a new user
   * @param userId The user identifier, must be 'me' for the authenticated user
   * @param userData The authenticated user's data
   * @returns The created user profile
   */
  @Post(':userId')
  @ApiOperation({
    summary: 'Create a new user or sync existing',
    description:
      "This endpoint only accepts 'me' as the user identifier. It creates a new user based on the authenticated user's data or syncs if the user already exists. Authentication is required.",
  })
  @ApiParam({
    name: 'userId',
    description: "Must be 'me' for the authenticated user",
    example: 'me',
    enum: ['me'],
  })
  @ApiStandardResponse(CreateNewUserResponseDto)
  @ApiResponse(CreateUserErrorResponses.responses[0])
  @ApiResponse(CreateUserErrorResponses.responses[1])
  @ApiResponse(CreateUserErrorResponses.responses[2])
  @HttpCode(HttpStatus.OK)
  async createUser(
    @Param('userId') userId: string,
    @PrivyUser() userData: PrivyUserData,
  ): Promise<CreateNewUserResponseDto> {
    if (userId !== 'me') {
      throw new BadRequestException(
        "Invalid user identifier. Use 'me' to create a user.",
      );
    }
    const result = await this.userService.createUser(userData);
    return result;
  }
}
