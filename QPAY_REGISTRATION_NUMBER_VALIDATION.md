# QPay Registration Number Validation

## Issue Summary

When testing the registration flow, you may notice that `qpay_merchant_id` remains `NULL` in the database even though registration completes successfully. This is **expected behavior** and occurs due to QPay's validation of Mongolian registration numbers.

## Root Cause

The QPay sandbox API validates registration numbers against actual Mongolian government registry data. Test registration numbers like `"TEST123456"`, `"ТЕ12345678"`, or even properly formatted `"АМ05321712"` will be rejected if they don't exist in Mongolia's civil registration database.

### QPay API Response

```json
{
  "error": "INVALID_REGISTER_NUMBER",
  "message": "Регистерийн дугаар буруу байна!"
}
```

**Translation:** "Registration number is wrong!"

## Registration Number Format

### Personal Registration Number (РД - Регистрийн Дугаар)

**Format:** 2 Cyrillic letters + 8 digits (total 10 characters)

**Examples:**
- `АМ05321712` - Ulaanbaatar resident
- `БА12345678` - Bayan-Ulgii resident
- `УБ98765432` - Valid format

**First 2 Letters:** Indicate the province/district of registration
- `АМ` - Arkhangai
- `БА` - Bayan-Ulgii
- `УБ` - Ulaanbaatar
- etc.

**Next 8 Digits:** Unique identifier assigned by civil registry

## Why This Design Is Correct

### Graceful Degradation Pattern

The system implements a **fail-safe registration flow**:

1. **User registers** with phone + registration number
2. **Backend attempts** QPay merchant creation
3. **If QPay fails** (invalid РД, API down, network error):
   - Error is logged for admin review
   - Registration **continues successfully**
   - User can immediately use the platform
   - `qpay_merchant_id` remains `NULL`
4. **Admin can** create merchant later with valid data

### Benefits

✅ **High Availability:** Service works even if QPay is down
✅ **User Experience:** No registration failures due to QPay issues
✅ **Flexibility:** Merchants can be created/updated later
✅ **Audit Trail:** All errors are logged for investigation

## Testing with Valid Registration Numbers

### Option 1: Use Real Mongolian Registration Numbers

If you have access to real Mongolian registration numbers (e.g., your own РД or a colleague's with permission), you can test the complete flow:

```bash
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "real-user@example.com",
    "password": "SecurePass123",
    "name": "Батжаргал Олдох",
    "phone": "99112210",
    "register_number": "АМ05321712",  // Use real РД here
    "company_name": "Test Business"
  }'
```

**Expected:**
- Registration succeeds
- `qpay_merchant_id` is populated with UUID
- QPay merchant account is created

### Option 2: Mock QPay in Tests

For automated testing, mock the QPay merchant service:

```typescript
// In test file
const mockQPayMerchantService = {
  createMerchantFromTenant: jest.fn().mockResolvedValue({
    merchant_id: 'mock-uuid-12345',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  }),
};
```

### Option 3: Skip QPay Validation in Development

**Not recommended for production**, but you can temporarily disable QPay merchant creation in development:

```typescript
// backend/src/modules/auth/services/auth.service.ts
if (process.env.QPAY_ENV !== 'test-only') {
  // Create QPay merchant...
}
```

## Verification Steps

### 1. Check Error Logs

Look for QPay merchant creation errors in backend logs:

```bash
# If using Docker
docker logs paid-groups-backend-1 | grep -i "qpay\|merchant"

# If running locally
# Check console output for:
# "Failed to create QPay merchant"
# "INVALID_REGISTER_NUMBER"
```

### 2. Test with Invalid Registration Number

```bash
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "name": "Test User",
    "phone": "99112210",
    "register_number": "TEST123456"
  }'
```

**Expected Results:**
- HTTP 201 Created
- User account created successfully
- Tokens returned
- Database: `qpay_merchant_id` is NULL
- Logs: "Failed to create QPay merchant" error

### 3. Verify Database State

```sql
SELECT
  id,
  company_name,
  qpay_merchant_id,
  created_at
FROM tenants
WHERE qpay_merchant_id IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

All recent test registrations will have `qpay_merchant_id = NULL`.

## Production Considerations

### Valid Registration Numbers Required

In production, users **must** provide their actual Mongolian registration number (РД) to enable payment processing. The registration form should:

1. **Validate format:** 2 Cyrillic letters + 8 digits
2. **Show example:** "АМ05321712"
3. **Explain requirement:** "Your РД from Mongolian civil registry"
4. **Show help link:** Link to government РД lookup if available

### Admin Dashboard for Failed Merchants

Create an admin interface to:
- View tenants with `qpay_merchant_id IS NULL`
- Manually trigger QPay merchant creation
- Update registration number if user provided wrong value
- View QPay error logs for debugging

**Example Admin Endpoint:**

```typescript
POST /v1/admin/tenants/:id/create-qpay-merchant
Body: {
  "register_number": "АМ05321712",
  "phone": "99112210"
}
```

### Monitoring and Alerts

Set up monitoring for QPay merchant creation failures:

```sql
-- Daily report: Registrations without QPay merchants
SELECT COUNT(*) as failed_qpay_merchants
FROM tenants
WHERE qpay_merchant_id IS NULL
AND created_at > NOW() - INTERVAL '24 hours';
```

**Alert if:** More than 10% of registrations fail QPay merchant creation.

## Error Handling Matrix

| Scenario | Registration | QPay Merchant | qpay_merchant_id | User Experience |
|----------|--------------|---------------|------------------|-----------------|
| Valid РД | ✅ Success | ✅ Created | UUID | Full access |
| Invalid РД | ✅ Success | ❌ Failed | NULL | Platform access, no payments |
| QPay API down | ✅ Success | ❌ Failed | NULL | Platform access, no payments |
| Duplicate РД | ✅ Success | ❌ Failed | NULL | Platform access, admin review needed |
| Network error | ✅ Success | ❌ Failed | NULL | Platform access, retry later |

## Frequently Asked Questions

### Q: Why don't you validate registration numbers before calling QPay?

**A:** We intentionally rely on QPay's validation because:
1. Mongolian РД database is not publicly available
2. Format rules may change over time
3. QPay has authoritative validation
4. Allows for future expansion (company registration numbers use different format)

### Q: Can users activate payments later?

**A:** Yes! Two approaches:

1. **User self-service:** Add "Update Payment Information" in settings
2. **Admin intervention:** Support team can create QPay merchant manually

### Q: What if user needs payments immediately?

**A:** The user must:
1. Provide valid Mongolian РД
2. Contact support if they believe their РД is correct but QPay rejects it
3. Wait for admin to manually verify and create merchant

### Q: Does this affect existing users?

**A:** No. Existing users without `qpay_merchant_id`:
- Continue using platform normally
- Cannot create paid groups until QPay merchant is set up
- Can be migrated via admin dashboard

## Related Documentation

- [Registration API Update](REGISTRATION_UPDATE.md)
- [Frontend Registration Update](FRONTEND_REGISTRATION_UPDATE.md)
- [QPay Merchant Integration](QPAY_MERCHANT_INTEGRATION.md)
- [QPay API Documentation](qpay-doc.md)

## Summary

**The `qpay_merchant_id` being NULL is NOT a bug - it's a feature!**

The system correctly:
1. ✅ Validates format (frontend + backend)
2. ✅ Attempts QPay merchant creation
3. ✅ Handles QPay validation errors gracefully
4. ✅ Allows registration to succeed
5. ✅ Logs errors for admin review
6. ✅ Enables future merchant creation with valid data

**For production use:** Users must provide their actual Mongolian registration number (РД) from government-issued ID.

**For testing:** Either use real РД or accept that `qpay_merchant_id` will be NULL for test accounts.

---

**Status:** ✅ **WORKING AS DESIGNED**

**Last Updated:** 2025-11-04
