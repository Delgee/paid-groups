import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { User, UserRole } from '../../modules/auth/entities/user.entity';
import {
  Tenant,
  SubscriptionTier,
  SubscriptionStatus,
} from '../../modules/tenant/entities/tenant.entity';
import { AppDataSource } from '../data-source';

interface SuperAdminInput {
  email: string;
  password: string;
  name: string;
  companyName?: string;
}

export async function createSuperAdmin(input: SuperAdminInput): Promise<User> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepository = AppDataSource.getRepository(User);
  const tenantRepository = AppDataSource.getRepository(Tenant);

  // Check if superadmin already exists
  const existingSuperAdmin = await userRepository.findOne({
    where: { role: UserRole.SUPER_ADMIN },
  });

  if (existingSuperAdmin) {
    throw new Error('Super admin already exists');
  }

  // Check if user with email exists
  const existingUser = await userRepository.findOne({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create system tenant for superadmin
  const tenant = tenantRepository.create({
    name: input.companyName || 'System',
    company_name: input.companyName || 'System Administration',
    subscription_tier: SubscriptionTier.ENTERPRISE,
    subscription_status: SubscriptionStatus.ACTIVE,
    max_bots: 999999,
    max_groups_per_bot: 999999,
    max_members: 999999,
  });

  const savedTenant = await tenantRepository.save(tenant);

  // Hash password
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(input.password, saltRounds);

  // Create superadmin user
  const superAdmin = userRepository.create({
    tenant_id: savedTenant.id,
    email: input.email.toLowerCase(),
    password_hash,
    name: input.name,
    role: UserRole.SUPER_ADMIN,
    is_active: true,
  });

  const savedSuperAdmin = await userRepository.save(superAdmin);

  console.log('✅ Super admin created successfully');
  console.log(`Email: ${savedSuperAdmin.email}`);
  console.log(`Name: ${savedSuperAdmin.name}`);
  console.log(`Role: ${savedSuperAdmin.role}`);
  console.log(`Tenant ID: ${savedSuperAdmin.tenant_id}`);

  return savedSuperAdmin;
}

// CLI execution
if (require.main === module) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  async function main() {
    try {
      console.log('🔧 Creating Super Admin User');
      console.log('============================\n');

      const email = await question('Enter email: ');
      const password = await question('Enter password: ');
      const name = await question('Enter full name: ');
      const companyName = await question('Enter company name (optional): ');

      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      console.log('\n🔄 Creating super admin...');

      await createSuperAdmin({
        email,
        password,
        name,
        companyName: companyName || undefined,
      });
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      rl.close();
      await AppDataSource.destroy();
    }
  }

  main();
}
