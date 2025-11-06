#!/bin/bash

# Fix Database Synchronization Issue
# This script drops and recreates the problematic table to allow TypeORM sync to work

set -e

echo "🔧 Fixing database synchronization issue..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-telegram_saas}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD}"

echo "📊 Connecting to database: $DB_NAME@$DB_HOST:$DB_PORT"

# Execute SQL to fix the membership_plan_groups table
docker exec -i telegram-saas-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" <<'SQL'
-- Drop the problematic table and let TypeORM recreate it
DROP TABLE IF EXISTS membership_plan_groups CASCADE;

-- Verify it's gone
\dt membership_plan_groups

-- Show related tables that might have foreign keys
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name LIKE '%membership%'
ORDER BY tc.table_name;

SQL

echo "✅ Database cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Restart your backend container: docker-compose -f docker-compose.prod.secure.yml restart backend"
echo "2. Check logs: docker logs -f telegram-saas-backend"
echo ""
echo "⚠️  NOTE: This will recreate the membership_plan_groups table."
echo "   If you have data in this table, it will be lost!"
