import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../modules/auth/entities/user.entity';
import { Tenant, SubscriptionTier, SubscriptionStatus } from '../../modules/tenant/entities/tenant.entity';

/**
 * Seed script to create a super admin user
 *
 * Usage:
 * npm run seed:super-admin
 *
 * Or with custom credentials:
 * SUPER_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_PASSWORD=YourSecurePassword123 npm run seed:super-admin
 */

export async function createSuperAdmin(dataSource: DataSource) {
  console.log('🌱 Starting super admin seed...');

  const userRepository = dataSource.getRepository(User);
  const tenantRepository = dataSource.getRepository(Tenant);

  // Get credentials from environment or use defaults
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@paid-groups.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  // Check if super admin already exists
  const existingAdmin = await userRepository.findOne({
    where: { email },
  });

  if (existingAdmin) {
    console.log('✅ Super admin already exists:', email);
    console.log('   ID:', existingAdmin.id);
    console.log('   Role:', existingAdmin.role);
    return existingAdmin;
  }

  // Create a special tenant for super admin
  let adminTenant = await tenantRepository.findOne({
    where: { name: 'Platform Administration' },
  });

  if (!adminTenant) {
    console.log('📦 Creating admin tenant...');
    adminTenant = tenantRepository.create({
      name: 'Platform Administration',
      company_name: 'Platform Administration',
      subscription_tier: SubscriptionTier.ENTERPRISE,
      subscription_status: SubscriptionStatus.ACTIVE,
      max_bots: -1, // unlimited
      max_groups_per_bot: -1, // unlimited
      max_members: -1, // unlimited
      settings: {
        is_admin_tenant: true,
      },
    });
    adminTenant = await tenantRepository.save(adminTenant);
    console.log('✅ Admin tenant created:', adminTenant.id);
  } else {
    console.log('✅ Admin tenant already exists:', adminTenant.id);
  }

  // Hash password
  console.log('🔐 Hashing password...');
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create super admin user
  console.log('👤 Creating super admin user...');
  const superAdmin = userRepository.create({
    tenant_id: adminTenant.id,
    email,
    password_hash: passwordHash,
    name,
    role: UserRole.SUPER_ADMIN,
    is_active: true,
  });

  const savedAdmin = await userRepository.save(superAdmin);

  console.log('✅ Super admin created successfully!');
  console.log('');
  console.log('📧 Email:', savedAdmin.email);
  console.log('🔑 Password:', password);
  console.log('👤 Name:', savedAdmin.name);
  console.log('🆔 ID:', savedAdmin.id);
  console.log('🏢 Tenant ID:', savedAdmin.tenant_id);
  console.log('');
  console.log('⚠️  IMPORTANT: Save these credentials securely and change the password after first login!');
  console.log('');

  return savedAdmin;
}

// Standalone execution
if (require.main === module) {
  const { DataSource } = require('typeorm');
  const { config } = require('dotenv');

  config(); // Load environment variables

  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'paid_groups',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  AppDataSource.initialize()
    .then(async (dataSource) => {
      await createSuperAdmin(dataSource);
      await dataSource.destroy();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error creating super admin:', error);
      process.exit(1);
    });
}
