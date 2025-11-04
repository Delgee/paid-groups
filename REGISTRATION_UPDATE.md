# Registration API Update Summary

## Changes Made

The registration API has been updated to make QPay merchant creation mandatory by requiring phone number and registration number fields, while making company name optional.

## Updated Registration Flow

### Required Fields (Changed)

| Field | Type | Validation | Example | Notes |
|-------|------|------------|---------|-------|
| `email` | string | Valid email | `user@example.com` | Unchanged |
| `password` | string | Min 8 chars | `SecurePass123` | Unchanged |
| `name` | string | Any | `Батжаргал Олдох` | Unchanged |
| **`phone`** | **string** | **Exactly 8 digits** | **`99112210`** | **NOW REQUIRED** |
| **`register_number`** | **string** | **Exactly 10 chars** | **`АМ05321712`** | **NOW REQUIRED** |

### Optional Fields (Changed)

| Field | Type | Default Behavior | Example |
|-------|------|------------------|---------|
| **`company_name`** | **string** | **Auto-generated** | **`Premium Groups`** |

**Auto-generation logic:**
```typescript
company_name = registerDto.company_name || `${registerDto.name}'s Business`;
```

**Examples:**
- Input: `name: "Батжаргал Олдох"`, no `company_name` → Generated: `"Батжаргал Олдох's Business"`
- Input: `name: "John Doe"`, `company_name: "My Company"` → Used: `"My Company"`

## API Endpoint

### POST /v1/auth/register

**Updated Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "Батжаргал Олдох",
  "phone": "99112210",
  "register_number": "АМ05321712",
  "company_name": "Premium Groups LLC"  // OPTIONAL
}
```

**Minimal Request (company_name omitted):**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "Батжаргал Олдох",
  "phone": "99112210",
  "register_number": "АМ05321712"
}
```

Result: `company_name` will be `"Батжаргал Олдох's Business"`

## Validation Rules

### Phone Number

- **Pattern:** `^\d{8}$` (exactly 8 digits)
- **Examples:**
  - ✅ Valid: `99112210`, `88991122`
  - ❌ Invalid: `123`, `9911221`, `991122100`, `phone123`

**Error Response:**
```json
{
  "statusCode": 400,
  "message": ["Phone must be exactly 8 digits"],
  "error": "Bad Request"
}
```

### Registration Number

- **Pattern:** Exactly 10 characters
- **Examples:**
  - ✅ Valid: `АМ05321712`, `БА12345678`
  - ❌ Invalid: `AM053217`, `ABC123456789`

**Error Response:**
```json
{
  "statusCode": 400,
  "message": ["Registration number must be exactly 10 characters"],
  "error": "Bad Request"
}
```

## QPay Merchant Creation

### Automatic Creation

Since `phone` and `register_number` are now **required**, QPay merchant creation happens **automatically** for every new registration.

**Process:**
1. User submits registration with phone + register_number
2. Tenant is created in database
3. QPay merchant is created via API
4. Merchant ID is saved to `tenant.qpay_merchant_id`
5. User account is created
6. Tokens are returned

### Error Handling

QPay merchant creation errors **do not block registration**:

```typescript
try {
  // Create QPay merchant
  const merchantResponse = await qpayMerchantService.createMerchantFromTenant({...});
  savedTenant.qpay_merchant_id = merchantResponse.merchant_id;
} catch (error) {
  // Log error but continue
  logger.error('Failed to create QPay merchant', error);
  logger.warn('Tenant registration will continue without QPay merchant');
  // Registration continues, qpay_merchant_id remains NULL
}
```

**Reasons for this approach:**
- ✅ Service remains available even if QPay API is down
- ✅ User can register and start using the platform immediately
- ✅ Admin can manually create merchant later if needed
- ✅ Better user experience (no registration failures due to external API)

## Breaking Changes

### ⚠️ Breaking Changes for API Clients

1. **`phone` is now required**
   - Old: Optional field
   - New: Required field with 8-digit validation
   - Migration: All registration forms must include phone input

2. **`register_number` is now required**
   - Old: Optional field
   - New: Required field with 10-character validation
   - Migration: All registration forms must include registration number (РД) input

3. **`company_name` is now optional**
   - Old: Required field
   - New: Optional field with auto-generation
   - Migration: Forms can make this field optional

### Frontend Updates Required

**Old Registration Form:**
```tsx
<form>
  <input name="email" required />
  <input name="password" required />
  <input name="name" required />
  <input name="company_name" required />
</form>
```

**New Registration Form:**
```tsx
<form>
  <input name="email" required />
  <input name="password" required />
  <input name="name" required />
  <input name="phone" required pattern="\d{8}" maxLength={8} />
  <input name="register_number" required maxLength={10} />
  <input name="company_name" /> {/* Optional */}
</form>
```

## Testing

### Test Script

Run the test script to verify all scenarios:

```bash
cd backend
./test-qpay-registration.sh
```

**Test Cases:**
1. ✅ Registration with `company_name` provided
2. ✅ Registration without `company_name` (auto-generated)
3. ❌ Registration without `phone` (validation error)
4. ❌ Registration with invalid `phone` format (validation error)

### Manual Testing

**Test 1: Full Registration**
```bash
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "name": "Test User",
    "phone": "99112210",
    "register_number": "АМ05321712",
    "company_name": "Test Company"
  }'
```

**Test 2: Minimal Registration (no company_name)**
```bash
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "SecurePass123",
    "name": "John Doe",
    "phone": "88112210",
    "register_number": "БА12345678"
  }'
```

Expected: `company_name` = `"John Doe's Business"`

**Test 3: Missing Phone (Should Fail)**
```bash
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test3@example.com",
    "password": "SecurePass123",
    "name": "Test User",
    "register_number": "АА11111111"
  }'
```

Expected: `400 Bad Request` - "phone should not be empty"

## Database Impact

### Tenant Table

**Before:**
```sql
qpay_merchant_id: NULL  -- For all tenants (optional QPay)
```

**After:**
```sql
qpay_merchant_id: 'uuid-from-qpay'  -- For successful QPay creation
qpay_merchant_id: NULL                -- If QPay creation failed
```

### Query Examples

```sql
-- Check tenants with QPay merchants
SELECT id, company_name, qpay_merchant_id
FROM tenants
WHERE qpay_merchant_id IS NOT NULL;

-- Check auto-generated company names
SELECT id, name, company_name
FROM tenants
WHERE company_name LIKE '%''s Business';

-- Check recent registrations
SELECT
  t.id,
  t.company_name,
  t.qpay_merchant_id,
  u.email,
  u.name
FROM tenants t
JOIN users u ON u.tenant_id = t.id
WHERE u.role = 'owner'
ORDER BY t.created_at DESC
LIMIT 10;
```

## Monitoring

### Key Metrics to Track

1. **QPay Merchant Creation Success Rate**
   ```sql
   SELECT
     COUNT(*) as total_registrations,
     COUNT(qpay_merchant_id) as with_qpay,
     ROUND(COUNT(qpay_merchant_id)::numeric / COUNT(*) * 100, 2) as success_rate_pct
   FROM tenants
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Auto-Generated Company Names**
   ```sql
   SELECT COUNT(*)
   FROM tenants
   WHERE company_name LIKE '%''s Business';
   ```

3. **Registration Validation Failures**
   - Monitor logs for: `"Phone must be exactly 8 digits"`
   - Monitor logs for: `"Registration number must be exactly 10 characters"`

### Log Messages

**Successful Registration:**
```
[AuthService] Creating QPay merchant for tenant: <uuid>
[QPayMerchantService] Creating QPay merchant from tenant registration
[QPayMerchantService] QPay person merchant created
[AuthService] QPay merchant created successfully: <merchant_id>
```

**Failed QPay Creation (but registration continues):**
```
[AuthService] Creating QPay merchant for tenant: <uuid>
[AuthService] ERROR: Failed to create QPay merchant for tenant <uuid>: <error>
[AuthService] WARN: Tenant registration will continue without QPay merchant
```

## Migration Guide

### For Frontend Developers

1. **Update registration form validation:**
   - Add `phone` input with 8-digit validation
   - Add `register_number` input with 10-character validation
   - Make `company_name` optional

2. **Update API request payload:**
   ```diff
   {
     "email": "...",
     "password": "...",
     "name": "...",
   + "phone": "99112210",
   + "register_number": "АМ05321712",
   - "company_name": "..."  // Now optional
   + "company_name": "..."  // Optional
   }
   ```

3. **Update form UI/UX:**
   - Add phone number input (8 digits, numeric only)
   - Add РД (registration number) input (10 characters)
   - Add placeholder/help text for company name: "Optional - will be auto-generated if not provided"

### For Backend Developers

✅ All changes are already implemented. No migration needed.

### For Testing Teams

Update test cases to include:
- Valid phone numbers (8 digits)
- Valid registration numbers (10 characters)
- Test auto-generated company names
- Test validation error messages

## Support

### Common Issues

**Q: User forgot to enter phone number**
A: Validation error will be shown. Phone is required.

**Q: Phone number has wrong format**
A: Must be exactly 8 digits. No spaces, dashes, or country codes.

**Q: Registration number validation fails**
A: Must be exactly 10 characters (e.g., АМ05321712)

**Q: QPay merchant creation fails**
A: Registration still succeeds. User can use platform. Admin can create merchant later.

**Q: Company name not provided**
A: Auto-generated as `"<User Name>'s Business"`

## Related Documentation

- [QPay Integration Guide](QPAY_MERCHANT_INTEGRATION.md)
- [QPay API Documentation](qpay-doc.md)
- [Health Check Integration](backend/HEALTH_CHECK.md)

## Rollback Plan

If issues arise, revert by:

1. Make phone and register_number optional again
2. Make company_name required again
3. Add conditional check back to QPay merchant creation

```bash
git revert <commit-hash>
npm run build
npm run start
```

---

**Status:** ✅ **DEPLOYED AND READY**

**Last Updated:** 2025-11-04
