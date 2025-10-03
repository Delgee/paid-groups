# Data Model: Telegram Groups SaaS Platform

## Overview
Multi-tenant PostgreSQL database with Row Level Security (RLS) for tenant isolation. All tables include tenant_id for data segregation except system-level tables.

## Core Entities

### System Level (No Tenant Isolation)

#### tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status ENUM('active', 'suspended', 'cancelled') DEFAULT 'active',
  subscription_tier ENUM('starter', 'growth', 'enterprise') DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### super_admins
```sql
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tenant-Scoped Entities

#### users (SaaS Users)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'moderator') DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);
```

#### telegram_bots
```sql
CREATE TABLE telegram_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bot_token VARCHAR(255) NOT NULL ENCRYPTED,
  bot_username VARCHAR(100) UNIQUE NOT NULL,
  bot_name VARCHAR(255) NOT NULL,
  profile_picture_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  webhook_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### telegram_groups
```sql
CREATE TABLE telegram_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT UNIQUE NOT NULL,
  group_name VARCHAR(255) NOT NULL,
  group_type ENUM('channel', 'group', 'supergroup') NOT NULL,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### membership_plans
```sql
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES telegram_groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_mnt DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  trial_days INTEGER DEFAULT 0,
  is_bundle BOOLEAN DEFAULT false,
  bundle_groups UUID[] DEFAULT '{}',
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### members (End Users)
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  telegram_username VARCHAR(100),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, telegram_user_id)
);
```

#### memberships
```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  group_id UUID NOT NULL REFERENCES telegram_groups(id),
  status ENUM('trial', 'active', 'expired', 'cancelled') NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id),
  qpay_invoice_id VARCHAR(100) UNIQUE NOT NULL,
  qpay_payment_id VARCHAR(100),
  amount_mnt DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') NOT NULL,
  payment_method VARCHAR(50),
  webhook_received_at TIMESTAMP,
  webhook_payload JSONB,
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_transactions INTEGER NOT NULL,
  total_revenue_mnt DECIMAL(12,2) NOT NULL,
  service_fee_mnt DECIMAL(10,2) NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'overdue') DEFAULT 'draft',
  due_date DATE NOT NULL,
  paid_at TIMESTAMP,
  payment_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### bot_messages
```sql
CREATE TABLE bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES telegram_bots(id),
  message_type ENUM('welcome', 'expiry_reminder', 'expired', 'payment_confirm', 'custom') NOT NULL,
  template_key VARCHAR(100),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID,
  user_type ENUM('super_admin', 'tenant_user', 'member', 'system') NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### analytics_events
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  member_id UUID REFERENCES members(id),
  group_id UUID REFERENCES telegram_groups(id),
  created_at TIMESTAMP DEFAULT NOW()
);
-- Partitioned by created_at for performance
```

### Materialized Views for Analytics

#### tenant_analytics_daily
```sql
CREATE MATERIALIZED VIEW tenant_analytics_daily AS
SELECT 
  tenant_id,
  DATE(created_at) as date,
  COUNT(DISTINCT member_id) as active_members,
  COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END) as payments_count,
  SUM((event_data->>'amount')::DECIMAL) as revenue_mnt,
  COUNT(CASE WHEN event_type = 'trial_started' THEN 1 END) as trials_started,
  COUNT(CASE WHEN event_type = 'trial_converted' THEN 1 END) as trials_converted
FROM analytics_events
GROUP BY tenant_id, DATE(created_at);
```

#### platform_metrics
```sql
CREATE MATERIALIZED VIEW platform_metrics AS
SELECT 
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as active_tenants,
  COUNT(DISTINCT m.id) as total_members,
  COUNT(DISTINCT ms.id) FILTER (WHERE ms.status = 'active') as active_memberships,
  SUM(p.amount_mnt) FILTER (WHERE p.status = 'completed' AND p.created_at >= NOW() - INTERVAL '30 days') as revenue_30d
FROM tenants t
LEFT JOIN members m ON m.tenant_id = t.id
LEFT JOIN memberships ms ON ms.tenant_id = t.id
LEFT JOIN payments p ON p.tenant_id = t.id;
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_members_telegram ON members(tenant_id, telegram_user_id);
CREATE INDEX idx_memberships_status ON memberships(tenant_id, status, expires_at);
CREATE INDEX idx_payments_status ON payments(tenant_id, status, created_at);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_analytics_events_date ON analytics_events(tenant_id, created_at);

-- Full text search
CREATE INDEX idx_members_search ON members USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || telegram_username));
```

## Row Level Security Policies

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_groups ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tenant-scoped tables)

-- Policy example for users table
CREATE POLICY tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Policy for super admins (bypass RLS)
CREATE POLICY super_admin_bypass ON users
  FOR ALL
  USING (current_setting('app.is_super_admin')::boolean = true);
```

## Triggers

```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... (apply to all relevant tables)

-- Membership expiration check
CREATE OR REPLACE FUNCTION check_membership_expiration()
RETURNS void AS $$
BEGIN
  UPDATE memberships 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

## Redis Data Structures

```yaml
# Session storage
session:{user_id}: {
  tenant_id: uuid,
  role: string,
  permissions: array,
  expires_at: timestamp
}

# Bot rate limiting
rate_limit:bot:{bot_id}:{action}: counter with TTL

# Payment processing queue
queue:payments: [
  {
    payment_id: uuid,
    webhook_data: object,
    retry_count: number
  }
]

# Telegram API cache
cache:telegram:user:{telegram_id}: {
  username: string,
  first_name: string,
  last_name: string,
  ttl: 3600
}

# Analytics aggregation
analytics:realtime:{tenant_id}: {
  active_users: set,
  revenue_today: decimal,
  new_members: counter
}
```

## Data Migration Strategy

1. **Initial Schema Creation**: Sequential migration files
2. **Seed Data**: Development and demo data
3. **RLS Policies**: Applied after schema creation
4. **Indexes**: Created after initial data load
5. **Materialized Views**: Refreshed on schedule

## Backup Strategy

- **Full Backup**: Daily at 2 AM UTC
- **Incremental**: Every 6 hours
- **Point-in-time Recovery**: 7-day retention
- **Cross-region Replication**: For disaster recovery