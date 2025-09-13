import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserRequestDto, UserRole } from './dto/create-user-request.dto';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { GetUsersResponseDto, GetUsersQueryDto, UserSummaryDto, AllUserRoles } from './dto/get-users-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);
  private readonly saltRounds = 12;

  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    tenantId: string,
    ownerUserId: string,
    createUserDto: CreateUserRequestDto
  ): Promise<CreateUserResponseDto> {
    this.logger.log(`Creating user with email: ${createUserDto.email} for tenant: ${tenantId}`);

    // Check for duplicate email within tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        email: createUserDto.email,
      },
    });

    if (existingUser) {
      this.logger.warn(`User with email ${createUserDto.email} already exists in tenant ${tenantId}`);
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, this.saltRounds);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        tenant_id: tenantId,
        email: createUserDto.email,
        password_hash: passwordHash,
        name: createUserDto.name,
        role: createUserDto.role,
        is_active: true,
        permissions: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: ownerUserId,
        user_type: 'tenant_user',
        action: 'user_created',
        resource_type: 'user',
        resource_id: user.id,
        changes: {
          email: createUserDto.email,
          name: createUserDto.name,
          role: createUserDto.role,
          created_by: ownerUserId,
        },
        created_at: new Date(),
      },
    });

    this.logger.log(`User created successfully: ${user.id}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.is_active,
      createdAt: user.created_at.toISOString(),
    };
  }

  async getUsers(
    tenantId: string,
    query: GetUsersQueryDto
  ): Promise<GetUsersResponseDto> {
    this.logger.log(`Getting users for tenant: ${tenantId}, page: ${query.page}, limit: ${query.limit}`);

    const skip = (query.page - 1) * query.limit;

    const whereClause: any = {
      tenant_id: tenantId,
      is_active: true,
    };

    if (query.role) {
      whereClause.role = query.role;
    }

    // Get total count
    const total = await this.prisma.user.count({
      where: whereClause,
    });

    // Get users with pagination
    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: query.limit,
    });

    const userSummaries: UserSummaryDto[] = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AllUserRoles,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at ? user.last_login_at.toISOString() : null,
      createdAt: user.created_at.toISOString(),
    }));

    const hasNext = skip + query.limit < total;
    const hasPrev = query.page > 1;

    this.logger.log(`Retrieved ${users.length} users out of ${total} total`);

    return {
      users: userSummaries,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        hasNext,
        hasPrev,
      },
    };
  }

  async canUserCreateRole(userRole: string, targetRole: string): Promise<boolean> {
    // Only owners can create admin and moderator users
    if (userRole === 'owner' && (targetRole === 'admin' || targetRole === 'moderator')) {
      return true;
    }

    // Owners cannot create other owners
    if (userRole === 'owner' && targetRole === 'owner') {
      return false;
    }

    // Admin and moderator users cannot create any users
    if (userRole === 'admin' || userRole === 'moderator') {
      return false;
    }

    return false;
  }
}