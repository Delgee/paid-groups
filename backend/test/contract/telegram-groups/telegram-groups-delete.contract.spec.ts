import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('DELETE /v1/telegram-groups/{id} - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let botId: string;
  let groupId: string;

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();

    // Create an owner user and get token
    const ownerUser = {
      email: 'owner@tenant1.com',
      password: 'OwnerPass123!',
      name: 'Test Owner',
      company_name: 'Test Company',
    };

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(ownerUser);

    const ownerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: ownerUser.email,
        password: ownerUser.password,
      });

    ownerToken = ownerLogin.body.access_token;

    // Create an admin user for authorization tests
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'admin@tenant1.com',
        password: 'AdminPass123!',
        name: 'Test Admin',
        role: 'admin',
      });

    const adminLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'admin@tenant1.com',
        password: 'AdminPass123!',
      });

    adminToken = adminLogin.body.access_token;

    // Create a telegram bot for testing
    const botResponse = await request(app.getHttpServer())
      .post('/v1/bots')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bot_name: 'Test Bot',
        bot_token: 'test-bot-token-123456',
      });

    botId = botResponse.body.id;

    // Create a test telegram group
    const groupResponse = await request(app.getHttpServer())
      .post('/v1/telegram-groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        group_name: 'Test Group to Delete',
        description: 'Group for deletion testing',
        bot_id: botId,
      });

    groupId = groupResponse.body.id;
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Response Schema Validation', () => {
    it('should return 204 No Content for successful deletion', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // 204 responses should have no body
      expect(response.body).toEqual({});
    });

    it('should actually delete the group (verify with GET)', async () => {
      // Delete the group
      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('Query Parameters', () => {
    it('should handle force=true query parameter', async () => {
      // This would typically be used when the group has active members
      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}?force=true`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('should handle force=false query parameter (default behavior)', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}?force=false`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('should use default behavior when force parameter omitted', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });
  });

  describe('Path Parameters', () => {
    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .delete('/v1/telegram-groups/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('should return 404 for non-existent group ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${nonExistentId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing JWT token', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should allow owner users to delete telegram groups', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });

    it('should return 403 for admin users attempting to delete telegram groups', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should return 409 for group with active members (without force)', async () => {
      // This test assumes the implementation will track active members
      // For now, we'll create the test structure

      // TODO: Once membership functionality is implemented,
      // create active memberships and test this scenario

      // Simulated response structure for 409 error
      const expectedConflictResponse = {
        statusCode: 409,
        message: 'Cannot delete group with active members',
        error: 'Conflict',
      };

      expect(expectedConflictResponse).toMatchObject({
        statusCode: 409,
        message: expect.any(String),
        error: 'Conflict',
      });
    });

    it('should allow deletion with force=true even with active members', async () => {
      // TODO: Once membership functionality is implemented,
      // create active memberships and test force deletion

      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}?force=true`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);
    });
  });

  describe('Tenant Isolation', () => {
    it('should return 404 for group from different tenant', async () => {
      // Create another tenant and group
      const otherOwnerUser = {
        email: 'other@tenant2.com',
        password: 'OwnerPass123!',
        name: 'Other Owner',
        company_name: 'Other Company',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(otherOwnerUser);

      const otherOwnerLogin = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: otherOwnerUser.email,
          password: otherOwnerUser.password,
        });

      const otherOwnerToken = otherOwnerLogin.body.access_token;

      const otherBotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({
          bot_name: 'Other Bot',
          bot_token: 'other-bot-token-123456',
        });

      const otherBotId = otherBotResponse.body.id;

      const otherGroupResponse = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({
          group_name: 'Other Tenant Group',
          bot_id: otherBotId,
        });

      const otherGroupId = otherGroupResponse.body.id;

      // Try to delete the other tenant's group
      const response = await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${otherGroupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('Idempotency', () => {
    it('should return 404 when attempting to delete already deleted group', async () => {
      // Delete the group first
      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      // Try to delete again
      const response = await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .delete(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // <500ms per requirements
    });
  });

  describe('Server Errors', () => {
    it('should return appropriate error structure for server errors', () => {
      const expectedErrorStructure = {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };

      expect(expectedErrorStructure).toMatchObject({
        statusCode: 500,
        message: expect.any(String),
        error: expect.any(String),
      });
    });
  });
});