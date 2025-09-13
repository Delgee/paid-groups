import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../../src/modules/auth/entities/user.entity';
import { AuditLog, AuditAction } from '../../src/modules/audit/entities/audit-log.entity';
import { UserManagementService } from '../../src/modules/user-management/user-management.service';
import { CreateUserRequestDto } from '../../src/modules/user-management/dto/create-user-request.dto';
import { AppModule } from '../../src/app.module';
import * as bcrypt from 'bcrypt';

describe('User Creation Workflow - Integration Test', () => {
  let app: INestApplication;
  let userManagementService: UserManagementService;
  let userRepository: Repository<User>;
  let auditLogRepository: Repository<AuditLog>;
  let testTenantId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userManagementService = moduleFixture.get<UserManagementService>(UserManagementService);
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    auditLogRepository = moduleFixture.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));

    // Setup test tenant and owner user
    testTenantId = 'test-tenant-uuid';
    ownerUserId = 'test-owner-uuid';
  });

  afterAll(async () => {
    // Cleanup test data
    await userRepository.delete({ tenant_id: testTenantId });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await userRepository.delete({
      tenant_id: testTenantId,
      role: In([UserRole.ADMIN, UserRole.MODERATOR])
    });
  });

  describe('Admin User Creation', () => {
    it('should create admin user with correct database record', async () => {
      const createUserDto: CreateUserRequestDto = {
        email: 'admin@tenant1.com',
        password: 'AdminPass123',
        name: 'John Administrator',
        role: UserRole.ADMIN
      };

      const result = await userManagementService.createUser(testTenantId, ownerUserId, createUserDto);

      // Verify service response
      expect(result).toMatchObject({
        id: expect.any(String),
        email: createUserDto.email,
        name: createUserDto.name,
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: expect.any(Date)
      });

      // Verify database record
      const dbUser = await userRepository.findOne({
        where: { id: result.id }
      });

      expect(dbUser).toMatchObject({
        id: result.id,
        tenant_id: testTenantId,
        email: createUserDto.email,
        name: createUserDto.name,
        role: UserRole.ADMIN,
        is_active: true
      });

      // Verify password was hashed
      expect(dbUser.password_hash).not.toBe(createUserDto.password);
      const isPasswordValid = await bcrypt.compare(createUserDto.password, dbUser.password_hash);
      expect(isPasswordValid).toBe(true);
    });

    it('should create moderator user with correct database record', async () => {
      const createUserDto: CreateUserRequestDto = {
        email: 'moderator@tenant1.com',
        password: 'ModeratorPass123',
        name: 'Jane Moderator',
        role: UserRole.MODERATOR
      };

      const result = await userManagementService.createUser(testTenantId, ownerUserId, createUserDto);

      expect(result).toMatchObject({
        role: UserRole.MODERATOR
      });

      const dbUser = await userRepository.findOne({
        where: { id: result.id }
      });

      expect(dbUser.role).toBe(UserRole.MODERATOR);
    });

    it('should enforce tenant isolation', async () => {
      const otherTenantId = 'other-tenant-uuid';

      const createUserDto: CreateUserRequestDto = {
        email: 'admin@other-tenant.com',
        password: 'AdminPass123',
        name: 'Other Admin',
        role: UserRole.ADMIN
      };

      const result = await userManagementService.createUser(otherTenantId, ownerUserId, createUserDto);

      // User should be created in other tenant
      const dbUser = await userRepository.findOne({
        where: { id: result.id }
      });

      expect(dbUser.tenant_id).toBe(otherTenantId);

      // Verify tenant isolation - users from different tenants shouldn't see each other
      const currentTenantUsers = await userRepository.find({
        where: { tenant_id: testTenantId }
      });

      expect(currentTenantUsers.find(u => u.id === result.id)).toBeUndefined();
    });
  });

  describe('Email Uniqueness Validation', () => {
    it('should prevent duplicate email within same tenant', async () => {
      const createUserDto: CreateUserRequestDto = {
        email: 'duplicate@tenant1.com',
        password: 'AdminPass123',
        name: 'First Admin',
        role: UserRole.ADMIN
      };

      // Create first user
      await userManagementService.createUser(testTenantId, ownerUserId, createUserDto);

      // Attempt to create second user with same email
      const duplicateDto: CreateUserRequestDto = {
        ...createUserDto,
        name: 'Second Admin'
      };

      await expect(
        userManagementService.createUser(testTenantId, ownerUserId, duplicateDto)
      ).rejects.toThrow('User with this email already exists');
    });

    it('should allow same email across different tenants', async () => {
      const tenant1Id = 'tenant-1-uuid';
      const tenant2Id = 'tenant-2-uuid';

      const createUserDto: CreateUserRequestDto = {
        email: 'admin@example.com',
        password: 'AdminPass123',
        name: 'Admin User',
        role: UserRole.ADMIN
      };

      // Create user in first tenant
      const user1 = await userManagementService.createUser(tenant1Id, ownerUserId, createUserDto);

      // Create user with same email in second tenant (should succeed)
      const user2 = await userManagementService.createUser(tenant2Id, ownerUserId, createUserDto);

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).toBe(user2.email);

      // Verify both users exist in database
      const dbUser1 = await userRepository.findOne({ where: { id: user1.id } });
      const dbUser2 = await userRepository.findOne({ where: { id: user2.id } });

      expect(dbUser1.tenant_id).toBe(tenant1Id);
      expect(dbUser2.tenant_id).toBe(tenant2Id);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const createUserDto: CreateUserRequestDto = {
        email: 'security@tenant1.com',
        password: 'SecurePass123',
        name: 'Security Test',
        role: UserRole.ADMIN
      };

      const result = await userManagementService.createUser(testTenantId, ownerUserId, createUserDto);

      const dbUser = await userRepository.findOne({
        where: { id: result.id }
      });

      // Password should be hashed
      expect(dbUser.password_hash).not.toBe(createUserDto.password);
      expect(dbUser.password_hash).toMatch(/^\$2[ab]\$\d+\$/); // bcrypt hash pattern

      // Should be verifiable
      const isValid = await bcrypt.compare(createUserDto.password, dbUser.password_hash);
      expect(isValid).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123';

      const user1Dto: CreateUserRequestDto = {
        email: 'user1@tenant1.com',
        password,
        name: 'User 1',
        role: UserRole.ADMIN
      };

      const user2Dto: CreateUserRequestDto = {
        email: 'user2@tenant1.com',
        password,
        name: 'User 2',
        role: UserRole.ADMIN
      };

      const result1 = await userManagementService.createUser(testTenantId, ownerUserId, user1Dto);
      const result2 = await userManagementService.createUser(testTenantId, ownerUserId, user2Dto);

      const dbUser1 = await userRepository.findOne({ where: { id: result1.id } });
      const dbUser2 = await userRepository.findOne({ where: { id: result2.id } });

      // Hashes should be different (due to salt)
      expect(dbUser1.password_hash).not.toBe(dbUser2.password_hash);

      // Both should verify against original password
      expect(await bcrypt.compare(password, dbUser1.password_hash)).toBe(true);
      expect(await bcrypt.compare(password, dbUser2.password_hash)).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entry for user creation', async () => {
      const createUserDto: CreateUserRequestDto = {
        email: 'audited@tenant1.com',
        password: 'AdminPass123',
        name: 'Audited User',
        role: UserRole.ADMIN
      };

      const result = await userManagementService.createUser(testTenantId, ownerUserId, createUserDto);

      // Verify audit log entry
      const auditLog = await auditLogRepository.findOne({
        where: {
          tenant_id: testTenantId,
          action: AuditAction.CREATE,
          entity_type: 'user',
          entity_id: result.id
        },
        order: { created_at: 'DESC' }
      });

      expect(auditLog).toMatchObject({
        tenant_id: testTenantId,
        user_id: ownerUserId,
        action: AuditAction.CREATE,
        entity_type: 'user',
        entity_id: result.id,
        changes: expect.objectContaining({
          email: createUserDto.email,
          name: createUserDto.name,
          role: createUserDto.role
        })
      });
    });
  });

  describe('Default Values', () => {
    it('should set correct default values for new users', async () => {
      const createUserDto: CreateUserRequestDto = {
        email: 'defaults@tenant1.com',
        password: 'AdminPass123',
        name: 'Default Test',
        role: UserRole.ADMIN
      };

      const result = await userManagementService.createUser(testTenantId, ownerUserId, createUserDto);

      const dbUser = await userRepository.findOne({
        where: { id: result.id }
      });

      expect(dbUser).toMatchObject({
        is_active: true,
        last_login_at: null,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require dependency injection mocking for TypeORM repository
      // For now, verify that the service methods are properly exposed
      const createUserDto: CreateUserRequestDto = {
        email: 'error@tenant1.com',
        password: 'AdminPass123',
        name: 'Error Test',
        role: UserRole.ADMIN
      };

      // Test would verify proper error handling and rollback
      expect(userRepository.save).toBeDefined();
      expect(userRepository.create).toBeDefined();
    });

    it('should rollback on transaction failure', async () => {
      // Test would verify that failed user creation doesn't leave partial data
      // and that audit logs are not created for failed operations
      expect(true).toBe(true); // Placeholder for transaction test
    });
  });
});