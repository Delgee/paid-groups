import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { UserManagementService } from '../../src/modules/user-management/user-management.service';
import { AppModule } from '../../src/app.module';

describe('Role-based Access Control - Integration Test', () => {
  let app: INestApplication;
  let userManagementService: UserManagementService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userManagementService = moduleFixture.get<UserManagementService>(UserManagementService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Owner Role Permissions', () => {
    it('should allow owner to create admin users', async () => {
      const canCreate = await userManagementService.canUserCreateRole('owner', 'admin');
      expect(canCreate).toBe(true);
    });

    it('should allow owner to create moderator users', async () => {
      const canCreate = await userManagementService.canUserCreateRole('owner', 'moderator');
      expect(canCreate).toBe(true);
    });

    it('should not allow owner to create other owners', async () => {
      const canCreate = await userManagementService.canUserCreateRole('owner', 'owner');
      expect(canCreate).toBe(false);
    });
  });

  describe('Admin Role Restrictions', () => {
    it('should not allow admin to create users', async () => {
      const canCreate = await userManagementService.canUserCreateRole('admin', 'admin');
      expect(canCreate).toBe(false);
    });

    it('should not allow admin to create moderators', async () => {
      const canCreate = await userManagementService.canUserCreateRole('admin', 'moderator');
      expect(canCreate).toBe(false);
    });
  });

  describe('Moderator Role Restrictions', () => {
    it('should not allow moderator to create users', async () => {
      const canCreate = await userManagementService.canUserCreateRole('moderator', 'admin');
      expect(canCreate).toBe(false);
    });
  });
});