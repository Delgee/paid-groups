import { Injectable, ConflictException, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { AuditLog, AuditAction } from '../audit/entities/audit-log.entity';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { GetUsersResponseDto, GetUsersQueryDto, UserSummaryDto, AllUserRoles } from './dto/get-users-response.dto';
import { calculatePagination } from '../../common/dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);
  private readonly saltRounds = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>
  ) {}

  async createUser(
    tenantId: string,
    ownerUserId: string,
    createUserDto: CreateUserRequestDto
  ): Promise<CreateUserResponseDto> {
    this.logger.log(`Creating user with email: ${createUserDto.email} for tenant: ${tenantId}`);

    // Check for duplicate email within tenant
    const existingUser = await this.userRepository.findOne({
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
    const user = this.userRepository.create({
      tenant_id: tenantId,
      email: createUserDto.email,
      password_hash: passwordHash,
      name: createUserDto.name,
      role: createUserDto.role,
      is_active: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Create audit log entry
    const auditLog = this.auditLogRepository.create({
      tenant_id: tenantId,
      user_id: ownerUserId,
      entity_type: 'user',
      entity_id: savedUser.id,
      action: AuditAction.CREATE,
      changes: {
        email: createUserDto.email,
        name: createUserDto.name,
        role: createUserDto.role,
        created_by: ownerUserId,
      },
      metadata: {
        action_description: 'User created by owner'
      }
    });

    await this.auditLogRepository.save(auditLog);

    this.logger.log(`User created successfully: ${savedUser.id}`);

    return {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role as UserRole,
      is_active: savedUser.is_active,
      created_at: savedUser.created_at.toISOString(),
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
    const total = await this.userRepository.count({
      where: whereClause,
    });

    // Get users with pagination
    const users = await this.userRepository.find({
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
      order: {
        created_at: 'DESC',
      },
      skip,
      take: query.limit,
    });

    const userSummaries: UserSummaryDto[] = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AllUserRoles,
      is_active: user.is_active,
      last_login_at: user.last_login_at ? user.last_login_at.toISOString() : null,
      created_at: user.created_at.toISOString(),
    }));

    this.logger.log(`Retrieved ${users.length} users out of ${total} total`);

    return {
      users: userSummaries,
      pagination: calculatePagination(total, query.page, query.limit),
    };
  }

  async updateUser(
    tenantId: string,
    ownerUserId: string,
    userId: string,
    updateUserDto: UpdateUserRequestDto
  ): Promise<CreateUserResponseDto> {
    this.logger.log(`Updating user ${userId} for tenant: ${tenantId}`);

    // Find the user
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        tenant_id: tenantId,
      },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found in tenant ${tenantId}`);
      throw new NotFoundException('User not found');
    }

    // Prevent updating owner users
    if (user.role === UserRole.OWNER) {
      this.logger.warn(`Attempt to update owner user ${userId}`);
      throw new ForbiddenException('Cannot update owner users');
    }

    // Track changes for audit log
    const changes: any = {};

    // Check for duplicate email if email is being changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: {
          tenant_id: tenantId,
          email: updateUserDto.email,
        },
      });

      if (existingUser) {
        this.logger.warn(`Email ${updateUserDto.email} already exists in tenant ${tenantId}`);
        throw new ConflictException('User with this email already exists');
      }

      changes.email = { old: user.email, new: updateUserDto.email };
      user.email = updateUserDto.email;
    }

    // Update password if provided
    if (updateUserDto.password) {
      const passwordHash = await bcrypt.hash(updateUserDto.password, this.saltRounds);
      user.password_hash = passwordHash;
      changes.password = 'updated';
    }

    // Update name if provided
    if (updateUserDto.name) {
      changes.name = { old: user.name, new: updateUserDto.name };
      user.name = updateUserDto.name;
    }

    // Update role if provided
    if (updateUserDto.role) {
      changes.role = { old: user.role, new: updateUserDto.role };
      user.role = updateUserDto.role;
    }

    // Update is_active if provided
    if (updateUserDto.is_active !== undefined) {
      changes.is_active = { old: user.is_active, new: updateUserDto.is_active };
      user.is_active = updateUserDto.is_active;
    }

    const savedUser = await this.userRepository.save(user);

    // Create audit log entry
    const auditLog = this.auditLogRepository.create({
      tenant_id: tenantId,
      user_id: ownerUserId,
      entity_type: 'user',
      entity_id: savedUser.id,
      action: AuditAction.UPDATE,
      changes,
      metadata: {
        action_description: 'User updated by owner'
      }
    });

    await this.auditLogRepository.save(auditLog);

    this.logger.log(`User updated successfully: ${savedUser.id}`);

    return {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role as UserRole,
      is_active: savedUser.is_active,
      created_at: savedUser.created_at.toISOString(),
    };
  }

  async deleteUser(
    tenantId: string,
    ownerUserId: string,
    userId: string
  ): Promise<void> {
    this.logger.log(`Deleting user ${userId} for tenant: ${tenantId}`);

    // Find the user
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        tenant_id: tenantId,
      },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found in tenant ${tenantId}`);
      throw new NotFoundException('User not found');
    }

    // Prevent deleting owner users
    if (user.role === UserRole.OWNER) {
      this.logger.warn(`Attempt to delete owner user ${userId}`);
      throw new ForbiddenException('Cannot delete owner users');
    }

    // Prevent owner from deleting themselves
    if (userId === ownerUserId) {
      this.logger.warn(`Attempt to delete self ${userId}`);
      throw new ForbiddenException('Cannot delete yourself');
    }

    // Soft delete by setting is_active to false
    user.is_active = false;
    await this.userRepository.save(user);

    // Create audit log entry
    const auditLog = this.auditLogRepository.create({
      tenant_id: tenantId,
      user_id: ownerUserId,
      entity_type: 'user',
      entity_id: userId,
      action: AuditAction.DELETE,
      changes: {
        email: user.email,
        name: user.name,
        role: user.role,
        deleted_by: ownerUserId,
      },
      metadata: {
        action_description: 'User deleted by owner'
      }
    });

    await this.auditLogRepository.save(auditLog);

    this.logger.log(`User deleted successfully: ${userId}`);
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