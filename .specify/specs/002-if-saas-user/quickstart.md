# Quickstart: Owner User Management

This guide demonstrates the complete user creation workflow from an owner's perspective.

## Prerequisites

- Backend API server running on http://localhost:3001
- Frontend Next.js app running on http://localhost:3000
- PostgreSQL database with tenant data
- Owner user account with valid JWT token

## Test Scenario 1: Create Admin User (Happy Path)

### Step 1: Owner Login
```bash
# Authenticate as owner user
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@tenant1.com",
    "password": "OwnerPass123"
  }'

# Expected response:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "...",
#   "user": {
#     "id": "owner-uuid",
#     "email": "owner@tenant1.com",
#     "role": "owner",
#     "tenantId": "tenant-1-uuid"
#   }
# }
```

### Step 2: Navigate to User Management (Frontend)
1. Open browser to http://localhost:3000/dashboard
2. Click "User Management" in sidebar navigation
3. Should see current users list with owner account visible
4. Click "Create New User" button

### Step 3: Fill User Creation Form
```javascript
// Frontend form data
{
  email: "admin@tenant1.com",
  password: "AdminPass123",
  name: "John Administrator",
  role: "admin"
}
```

### Step 4: Submit Form (API Call)
```bash
# API call made by frontend
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "email": "admin@tenant1.com",
    "password": "AdminPass123",
    "name": "John Administrator",
    "role": "admin"
  }'

# Expected response (201 Created):
# {
#   "id": "admin-user-uuid",
#   "email": "admin@tenant1.com",
#   "name": "John Administrator",
#   "role": "admin",
#   "isActive": true,
#   "createdAt": "2025-09-14T10:30:00.000Z"
# }
```

### Step 5: Verify User Creation
```bash
# Get users list to verify creation
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer {JWT_TOKEN}"

# Expected response (200 OK):
# {
#   "users": [
#     {
#       "id": "owner-uuid",
#       "email": "owner@tenant1.com",
#       "name": "Owner User",
#       "role": "owner",
#       "isActive": true,
#       "lastLoginAt": "2025-09-14T10:00:00.000Z",
#       "createdAt": "2025-09-01T10:00:00.000Z"
#     },
#     {
#       "id": "admin-user-uuid",
#       "email": "admin@tenant1.com",
#       "name": "John Administrator",
#       "role": "admin",
#       "isActive": true,
#       "lastLoginAt": null,
#       "createdAt": "2025-09-14T10:30:00.000Z"
#     }
#   ],
#   "pagination": {
#     "total": 2,
#     "page": 1,
#     "limit": 20,
#     "hasNext": false,
#     "hasPrev": false
#   }
# }
```

### Step 6: Frontend Updates
1. Form shows success message: "Admin user created successfully"
2. User list automatically refreshes to show new admin user
3. Form resets to allow creating another user
4. Navigation remains on user management page

## Test Scenario 2: Create Moderator User

### Step 1: Create Moderator via Frontend Form
```javascript
// Form data for moderator
{
  email: "moderator@tenant1.com",
  password: "ModeratorPass123",
  name: "Jane Moderator",
  role: "moderator"
}
```

### Step 2: Verify API Call
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "email": "moderator@tenant1.com",
    "password": "ModeratorPass123",
    "name": "Jane Moderator",
    "role": "moderator"
  }'

# Expected response (201 Created):
# {
#   "id": "moderator-user-uuid",
#   "email": "moderator@tenant1.com",
#   "name": "Jane Moderator",
#   "role": "moderator",
#   "isActive": true,
#   "createdAt": "2025-09-14T10:35:00.000Z"
# }
```

## Test Scenario 3: Validation Error Handling

### Step 1: Submit Invalid Email
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "email": "invalid-email",
    "password": "ValidPass123",
    "name": "Test User",
    "role": "admin"
  }'

# Expected response (400 Bad Request):
# {
#   "statusCode": 400,
#   "message": ["email must be a valid email"],
#   "error": "Bad Request",
#   "details": [
#     {
#       "field": "email",
#       "constraint": "isEmail",
#       "value": "invalid-email"
#     }
#   ]
# }
```

### Step 2: Frontend Error Display
1. Form shows validation error: "Please enter a valid email address"
2. Email input field highlighted in red
3. Submit button remains enabled for correction
4. Other form fields retain their values

### Step 3: Submit Weak Password
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "email": "test@tenant1.com",
    "password": "weak",
    "name": "Test User",
    "role": "admin"
  }'

# Expected response (400 Bad Request):
# {
#   "statusCode": 400,
#   "message": ["password must be at least 8 characters", "password must contain uppercase, lowercase and number"],
#   "error": "Bad Request",
#   "details": [
#     {
#       "field": "password",
#       "constraint": "minLength",
#       "value": "weak"
#     },
#     {
#       "field": "password",
#       "constraint": "matches",
#       "value": "weak"
#     }
#   ]
# }
```

## Test Scenario 4: Duplicate Email Prevention

### Step 1: Attempt Duplicate Email Creation
```bash
# Try to create user with existing email
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "email": "admin@tenant1.com",
    "password": "AnotherPass123",
    "name": "Another Admin",
    "role": "admin"
  }'

# Expected response (409 Conflict):
# {
#   "statusCode": 409,
#   "message": "User with this email already exists",
#   "error": "Conflict",
#   "code": "DUPLICATE_EMAIL"
# }
```

### Step 2: Frontend Error Handling
1. Form shows error: "A user with this email already exists"
2. Email field highlighted with error state
3. User can modify email and retry submission
4. No user record created in database

## Test Scenario 5: Unauthorized Access Prevention

### Step 1: Attempt Access as Non-Owner
```bash
# Login as admin user
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tenant1.com",
    "password": "AdminPass123"
  }'

# Use admin token to try creating users
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_JWT_TOKEN}" \
  -d '{
    "email": "test@tenant1.com",
    "password": "TestPass123",
    "name": "Test User",
    "role": "moderator"
  }'

# Expected response (403 Forbidden):
# {
#   "statusCode": 403,
#   "message": "Only owner users can create admin/moderator users",
#   "error": "Forbidden",
#   "code": "INSUFFICIENT_PERMISSIONS"
# }
```

### Step 2: Frontend Navigation Protection
1. Admin users should not see "User Management" in navigation
2. Direct URL access to `/dashboard/users` redirects admin users
3. Role-based route guards prevent unauthorized access

## Test Scenario 6: Tenant Isolation Verification

### Step 1: Create User in Different Tenant
```bash
# Login as owner of different tenant
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@tenant2.com",
    "password": "Owner2Pass123"
  }'

# Create user with same email in different tenant (should succeed)
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TENANT2_JWT_TOKEN}" \
  -d '{
    "email": "admin@tenant1.com",
    "password": "AdminPass123",
    "name": "Admin in Tenant 2",
    "role": "admin"
  }'

# Expected response (201 Created):
# User creation succeeds because email uniqueness is per-tenant
```

### Step 2: Verify Tenant Isolation
```bash
# Get users for tenant 2
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer {TENANT2_JWT_TOKEN}"

# Should only see users from tenant 2, not tenant 1
```

## Database Verification

### Check User Records
```sql
-- Verify users were created with correct tenant isolation
SELECT id, tenant_id, email, name, role, is_active, created_at
FROM users
WHERE tenant_id = 'tenant-1-uuid'
ORDER BY created_at;

-- Expected results:
-- owner@tenant1.com (role: owner)
-- admin@tenant1.com (role: admin)
-- moderator@tenant1.com (role: moderator)
```

### Check Audit Logs
```sql
-- Verify audit trail for user creation
SELECT user_id, action, resource_type, resource_id, changes, created_at
FROM audit_logs
WHERE action = 'user_created'
  AND tenant_id = 'tenant-1-uuid'
ORDER BY created_at DESC;

-- Expected audit entries for each user creation
```

## Performance Verification

### Response Time Testing
```bash
# Time the user creation API call
time curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{"email":"perf@tenant1.com","password":"PerfPass123","name":"Performance Test","role":"admin"}'

# Expected: < 500ms response time
```

### Frontend Performance
1. Form submission should show loading state
2. User list should update within 2 seconds
3. No layout shifts during user creation flow
4. Optimistic updates provide immediate feedback

## Success Criteria

✅ **Functional Requirements Met:**
- Owner users can create admin and moderator users
- Role-based access control enforced
- Email validation and uniqueness per tenant
- Password complexity requirements enforced
- Tenant isolation maintained

✅ **User Experience Validated:**
- Intuitive user management interface
- Clear validation error messages
- Responsive form interactions
- Consistent success/error feedback

✅ **Performance Requirements:**
- API responses under 500ms
- Frontend updates under 2s
- No blocking operations during user creation

✅ **Security Requirements:**
- JWT authentication required
- Role-based authorization enforced
- Input validation and sanitization
- Audit logging for user creation events

This quickstart demonstrates all critical user scenarios and validates the complete implementation of owner user management functionality.