import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserManagementService } from './user-management.service';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { GetUsersResponseDto, GetUsersQueryDto } from './dto/get-users-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OwnerRoleGuard } from '../../common/guards/owner-role.guard';
import { ValidationPipe } from '@nestjs/common';

@ApiTags('User Management')
@Controller('users')
@UseGuards(JwtAuthGuard, OwnerRoleGuard)
@ApiBearerAuth()
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new admin or moderator user',
    description: 'Allows owner users to create new users with admin or moderator roles',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['email must be a valid email', 'password is too weak'],
        },
        error: { type: 'string', example: 'Bad Request' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'email' },
              constraint: { type: 'string', example: 'isEmail' },
              value: { type: 'string', example: 'invalid-email' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Only owner users can create admin/moderator users' },
        error: { type: 'string', example: 'Forbidden' },
        code: { type: 'string', example: 'INSUFFICIENT_PERMISSIONS' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'User with this email already exists' },
        error: { type: 'string', example: 'Conflict' },
        code: { type: 'string', example: 'DUPLICATE_EMAIL' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
        requestId: { type: 'string', example: 'req_123e4567-e89b-12d3-a456-426614174000' },
      },
    },
  })
  async createUser(
    @Request() req: any,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) createUserDto: CreateUserRequestDto,
  ): Promise<CreateUserResponseDto> {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    return this.userManagementService.createUser(tenantId, userId, createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get list of users in the tenant',
    description: 'Retrieves paginated list of users for the current tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: GetUsersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Only owner users can access user management' },
        error: { type: 'string', example: 'Forbidden' },
        code: { type: 'string', example: 'INSUFFICIENT_PERMISSIONS' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUsers(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetUsersQueryDto,
  ): Promise<GetUsersResponseDto> {
    const tenantId = req.user?.tenant_id;
    return this.userManagementService.getUsers(tenantId, query);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update an existing user',
    description: 'Allows owner users to update admin or moderator users',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot update owner users',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Cannot update owner users' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - email already exists',
  })
  async updateUser(
    @Request() req: any,
    @Param('id') userId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) updateUserDto: UpdateUserRequestDto,
  ): Promise<CreateUserResponseDto> {
    const tenantId = req.user?.tenant_id;
    const ownerUserId = req.user?.id;
    return this.userManagementService.updateUser(tenantId, ownerUserId, userId, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Allows owner users to delete admin or moderator users (soft delete)',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - cannot delete owner users or yourself',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Cannot delete owner users' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteUser(
    @Request() req: any,
    @Param('id') userId: string,
  ): Promise<void> {
    const tenantId = req.user?.tenant_id;
    const ownerUserId = req.user?.id;
    return this.userManagementService.deleteUser(tenantId, ownerUserId, userId);
  }
}