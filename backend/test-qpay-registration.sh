#!/bin/bash

echo "=========================================="
echo "QPay Merchant Auto-Creation Test"
echo "=========================================="
echo ""

echo "Testing tenant registration with QPay merchant creation..."
echo ""

# Test 1: Register with all fields (company_name provided)
echo "1. Registration WITH company_name:"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@qpaytest.com",
    "password": "SecurePass123",
    "name": "Батжаргал Олдох",
    "phone": "99112210",
    "register_number": "АМ05321712",
    "company_name": "Premium Groups LLC"
  }' | python3 -m json.tool

echo ""
echo ""
echo "2. Registration WITHOUT company_name (auto-generated):"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@qpaytest.com",
    "password": "SecurePass123",
    "name": "Ганзориг Наран",
    "phone": "88112210",
    "register_number": "БА12345678"
  }' | python3 -m json.tool

echo ""
echo ""
echo "3. Validation Test - Missing phone (should fail):"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser3@qpaytest.com",
    "password": "SecurePass123",
    "name": "Test User",
    "register_number": "АА11111111"
  }' | python3 -m json.tool

echo ""
echo ""
echo "4. Validation Test - Invalid phone format (should fail):"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser4@qpaytest.com",
    "password": "SecurePass123",
    "name": "Test User",
    "phone": "123",
    "register_number": "АА11111111"
  }' | python3 -m json.tool

echo ""
echo ""
echo "=========================================="
echo "Check Database for Created Tenants"
echo "=========================================="
echo ""

docker exec -i paid-groups-postgres-1 psql -U postgres -d telegram_saas -c "
SELECT
  id,
  name,
  company_name,
  qpay_merchant_id,
  created_at
FROM tenants
WHERE company_name LIKE '%Groups%' OR company_name LIKE '%Business'
ORDER BY created_at DESC
LIMIT 5;
" 2>/dev/null

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
