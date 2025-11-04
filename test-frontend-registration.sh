#!/bin/bash

echo "=========================================="
echo "Frontend Registration Form Test"
echo "=========================================="
echo ""

echo "Testing updated registration API with new fields..."
echo ""

# Test 1: Full registration with all fields (company_name provided)
echo "1. Registration WITH company_name:"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontend-test1@example.com",
    "password": "SecurePass123",
    "name": "Батжаргал Олдох",
    "phone": "99112210",
    "register_number": "АМ05321712",
    "company_name": "Premium Groups LLC"
  }' | python3 -m json.tool

echo ""
echo ""

# Test 2: Minimal registration (company_name omitted, should auto-generate)
echo "2. Registration WITHOUT company_name (auto-generated):"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontend-test2@example.com",
    "password": "SecurePass123",
    "name": "Ганзориг Наран",
    "phone": "88112210",
    "register_number": "БА12345678"
  }' | python3 -m json.tool

echo ""
echo ""

# Test 3: Validation - Missing phone (should fail)
echo "3. Validation Test - Missing phone (should fail):"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontend-test3@example.com",
    "password": "SecurePass123",
    "name": "Test User",
    "register_number": "АА11111111"
  }' | python3 -m json.tool

echo ""
echo ""

# Test 4: Validation - Invalid phone format (should fail)
echo "4. Validation Test - Invalid phone format (should fail):"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontend-test4@example.com",
    "password": "SecurePass123",
    "name": "Test User",
    "phone": "123",
    "register_number": "АА11111111"
  }' | python3 -m json.tool

echo ""
echo ""

# Test 5: Validation - Invalid register_number length (should fail)
echo "5. Validation Test - Invalid register_number length (should fail):"
echo "   POST /v1/auth/register"
echo ""
curl -s -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontend-test5@example.com",
    "password": "SecurePass123",
    "name": "Test User",
    "phone": "99112210",
    "register_number": "SHORT"
  }' | python3 -m json.tool

echo ""
echo ""
echo "=========================================="
echo "Database Check - Created Tenants"
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
echo ""
echo "Frontend Form Changes Summary:"
echo "✅ Added phone field (8 digits, required)"
echo "✅ Added register_number field (10 characters, required)"
echo "✅ Made company_name optional (auto-generated if empty)"
echo "✅ Updated validation messages"
echo "✅ Updated RegisterData interface in API client"
echo ""
echo "To test the UI:"
echo "1. Start frontend: cd frontend && npm run dev"
echo "2. Visit: http://localhost:3000/register"
echo "3. Fill in the form with:"
echo "   - Name: Test User"
echo "   - Phone: 99112210"
echo "   - Registration Number: АМ05321712"
echo "   - Email: test@example.com"
echo "   - Password: TestPass123"
echo "   - Company Name: (leave empty or fill in)"
echo ""
