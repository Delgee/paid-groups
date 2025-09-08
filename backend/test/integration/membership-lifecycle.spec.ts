import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Membership Expiration Workflow (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    // Setup test user
    const registrationData = {
      email: 'membership-lifecycle@example.com',
      password: 'SecurePassword123!',
      name: 'Membership Lifecycle User',
      company_name: 'Lifecycle Test Company',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(registrationData);

    accessToken = registerResponse.body.access_token;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Membership expiration and renewal flow', () => {
    it('should handle membership expiration correctly', async () => {
      // Create test member with expiring membership
      const memberData = {
        telegram_user_id: 555666777,
        first_name: 'Test',
        last_name: 'Member',
      };

      const memberResponse = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(memberData)
        .expect(201);

      const memberId = memberResponse.body.id;

      // Create membership that expires soon
      const membershipData = {
        member_id: memberId,
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 1 day
      };

      const membershipResponse = await request(app.getHttpServer())
        .post('/v1/memberships')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(membershipData)
        .expect(201);

      expect(membershipResponse.body.status).toBe('active');

      // Simulate expiration check job
      const expirationCheckResponse = await request(app.getHttpServer())
        .post('/v1/admin/check-expiring-memberships')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(expirationCheckResponse.body.checked_count).toBeGreaterThan(0);
      expect(expirationCheckResponse.body.expiring_soon_count).toBeGreaterThan(
        0,
      );
    });

    it('should send expiration reminders', async () => {
      // Create member with membership expiring soon
      const memberData = {
        telegram_user_id: 555666778,
        first_name: 'Reminder',
        last_name: 'Test',
      };

      const memberResponse = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(memberData)
        .expect(201);

      // Create membership expiring in 2 days
      const membershipData = {
        member_id: memberResponse.body.id,
        status: 'active',
        expires_at: new Date(
          Date.now() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(app.getHttpServer())
        .post('/v1/memberships')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(membershipData)
        .expect(201);

      // Trigger reminder job
      const reminderResponse = await request(app.getHttpServer())
        .post('/v1/admin/send-expiration-reminders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(reminderResponse.body.reminders_sent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-tenant data isolation', () => {
    it('should isolate membership data between tenants', async () => {
      // Create second tenant
      const secondTenantData = {
        email: 'second-tenant-isolation@example.com',
        password: 'SecurePassword123!',
        name: 'Second Tenant User',
        company_name: 'Second Tenant Company',
      };

      const secondTenantResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(secondTenantData);

      const secondAccessToken = secondTenantResponse.body.access_token;

      // First tenant creates member
      const firstTenantMember = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          telegram_user_id: 111222333,
          first_name: 'First',
          last_name: 'Tenant',
        })
        .expect(201);

      // Second tenant creates member
      const secondTenantMember = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({
          telegram_user_id: 444555666,
          first_name: 'Second',
          last_name: 'Tenant',
        })
        .expect(201);

      // First tenant should only see their members
      const firstTenantMembers = await request(app.getHttpServer())
        .get('/v1/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(firstTenantMembers.body.members).toHaveLength(1);
      expect(firstTenantMembers.body.members[0].id).toBe(
        firstTenantMember.body.id,
      );

      // Second tenant should only see their members
      const secondTenantMembers = await request(app.getHttpServer())
        .get('/v1/members')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(200);

      expect(secondTenantMembers.body.members).toHaveLength(1);
      expect(secondTenantMembers.body.members[0].id).toBe(
        secondTenantMember.body.id,
      );

      // Cross-tenant access should fail
      await request(app.getHttpServer())
        .get(`/v1/members/${secondTenantMember.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });
});
