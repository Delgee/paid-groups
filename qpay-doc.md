# QPay Quick Pay API Documentation

## Overview

QPay is a Mongolian payment gateway that provides merchant management and payment processing services. This document covers the QPay v2 API endpoints.

**Base URL (Development):** `https://dev-vendor.qpay.mn`

---

## Authentication

### 1. Get Access Token

**Endpoint:** `POST /v2/auth/token`

**Authentication:** Basic Auth (username + password)

**Request Body:**
```json
{
  "terminal_id": "95000059"  // Required: Your terminal ID
}
```

**Example Credentials (Sandbox):**
- Username: `sand_ganzo2`
- Password: `Ss123456`

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

**Usage:** After obtaining the token, include it in all subsequent requests as a Bearer token in the Authorization header.

---

### 2. Refresh Token

**Endpoint:** `POST /v2/auth/refresh`

**Authentication:** Bearer Token (existing access token)

**Response:** Returns a new access token with extended expiration.

---

## Merchant Management

### 1. Create Company Merchant

**Endpoint:** `POST /v2/merchant/company`

**Authentication:** Bearer Token

**Description:** Register a merchant as a company/organization.

**Request Body:**
```json
{
  "owner_first_name": "a",           // Optional
  "owner_last_name": "b",            // Optional
  "register_number": "9323472",      // Required: Company registration number
  "company_name": "TEST LLC",        // Required: Legal company name
  "name": "MERCHANT12",              // Required: Display name
  "name_eng": "MERCHANT12",          // Optional: English name
  "mcc_code": "5311",                // Required: Merchant Category Code
  "city": "11000",                   // Required: City code (see get_aimag endpoint)
  "district": "12000",               // Required: District code (see get_district endpoint)
  "address": "6 хороо 14-10",        // Required: Full address
  "phone": "99112210",               // Required: Contact phone
  "email": "admin@gmail.com"         // Required: Contact email
}
```

**Response:**
```json
{
  "merchant_id": "uuid-v4-here",
  "status": "PENDING_APPROVAL",
  "created_at": "2025-01-04T12:00:00Z"
}
```

---

### 2. Update Company Merchant

**Endpoint:** `PUT /v2/merchant/company/{merchant_id}`

**Authentication:** Bearer Token

**Description:** Update an existing company merchant's information.

**Request Body:** Same fields as Create Company Merchant

**URL Parameter:**
- `merchant_id` (UUID): The merchant's unique identifier

---

### 3. Create Person Merchant

**Endpoint:** `POST /v2/merchant/person`

**Authentication:** Bearer Token

**Description:** Register a merchant as an individual person.

**Request Body:**
```json
{
  "register_number": "АМ05321712",   // Required: Personal registration number
  "first_name": "Test",              // Required: First name
  "last_name": "user",               // Required: Last name
  "name": "Н.Ганзориг",              // Required: Full name (Mongolian)
  "name_eng": "N.Ganzorig",          // Optional: Full name (English)
  "business_name": "Test",           // Required: Business display name
  "business_name_eng": "baraa zarna", // Optional: Business name (English)
  "mcc_code": "5812",                // Required: Merchant Category Code
  "city": "11000",                   // Required: City code
  "district": "17000",               // Required: District code
  "address": "Монгол улс, УБ хот...", // Required: Full address
  "phone": "99022052",               // Required: Contact phone
  "email": "ganzo.galaxy@gmail.com"  // Required: Contact email
}
```

---

### 4. Update Person Merchant

**Endpoint:** `PUT /v2/merchant/person/{merchant_id}`

**Authentication:** Bearer Token

**Description:** Update an existing person merchant's information.

**Request Body:** Same fields as Create Person Merchant

**URL Parameter:**
- `merchant_id` (UUID): The merchant's unique identifier

---

### 5. Get Merchant Details

**Endpoint:** `GET /v2/merchant/{merchant_id}`

**Authentication:** Bearer Token

**Description:** Retrieve detailed information about a specific merchant.

**URL Parameter:**
- `merchant_id` (UUID): The merchant's unique identifier

**Response:**
```json
{
  "merchant_id": "uuid-v4-here",
  "type": "COMPANY" | "PERSON",
  "name": "MERCHANT12",
  "register_number": "9323472",
  "status": "ACTIVE" | "PENDING" | "SUSPENDED",
  "email": "admin@gmail.com",
  "phone": "99112210",
  "created_at": "2025-01-04T12:00:00Z"
}
```

---

### 6. List Merchants

**Endpoint:** `POST /v2/merchant/list`

**Authentication:** Bearer Token

**Description:** Get paginated list of all registered merchants.

**Request Body:**
```json
{
  "offset": {
    "page_number": 1,    // Required: Page number (starts from 1)
    "page_limit": 20     // Required: Items per page (max 100)
  }
}
```

**Response:**
```json
{
  "count": 150,
  "rows": [
    {
      "merchant_id": "uuid-v4-here",
      "name": "MERCHANT12",
      "type": "COMPANY",
      "status": "ACTIVE"
    }
  ],
  "page_number": 1,
  "page_limit": 20,
  "total_pages": 8
}
```

---

### 7. Delete Merchant

**Endpoint:** `DELETE /v2/merchant/{merchant_id}`

**Authentication:** Bearer Token

**Description:** Remove a merchant registration.

**URL Parameter:**
- `merchant_id` (UUID): The merchant's unique identifier

**Response:**
```json
{
  "success": true,
  "message": "Merchant deleted successfully"
}
```

---

### 8. Get City/Province Codes

**Endpoint:** `GET /v2/aimaghot`

**Authentication:** Bearer Token

**Description:** Retrieve list of city and province codes for merchant registration.

**Response:**
```json
[
  {
    "code": "11000",
    "name": "Улаанбаатар хот"
  },
  {
    "code": "01000",
    "name": "Архангай аймаг"
  }
]
```

---

### 9. Get District Codes

**Endpoint:** `GET /v2/sumduureg/{city_code}`

**Authentication:** Bearer Token

**Description:** Get list of district codes for a specific city/province.

**URL Parameter:**
- `city_code` (string): City code from get_aimag endpoint (e.g., "11000")

**Response:**
```json
[
  {
    "code": "12000",
    "name": "Баянзүрх дүүрэг"
  },
  {
    "code": "13000",
    "name": "Баянгол дүүрэг"
  }
]
```

---

## Invoice Management

### 1. Create Invoice

**Endpoint:** `POST /v2/invoice`

**Authentication:** Bearer Token

**Description:** Create a payment invoice for a merchant.

**Request Body:**
```json
{
  "merchant_id": "78fd75dc-7d1f-4cb4-8c08-765a8d4fa499",  // Required: Merchant UUID
  "branch_code": "BRANCH_001",       // Optional: Branch identifier
  "amount": 100,                     // Required: Invoice amount
  "currency": "MNT",                 // Required: Currency code (MNT = Mongolian Tugrik)
  "customer_name": "baraa zarna",    // Optional: Customer display name
  "customer_logo": "",               // Optional: Customer logo URL
  "callback_url": "https://notify@test.mn/pay",  // Optional: Webhook callback URL
  "description": "usnii tolbor",     // Optional: Invoice description
  "mcc_code": "5691",                // Optional: Transaction MCC code
  "bank_accounts": [                 // Required: At least one bank account
    {
      "account_bank_code": "040000", // Required: Bank code
      "account_number": "490000869", // Required: Account number
      "account_name": "test account2", // Required: Account holder name
      "is_default": true             // Required: Default account flag
    }
  ]
}
```

**Response:**
```json
{
  "invoice_id": "84efa8c0-cf3f-43c0-9bc8-71d9c50602a9",
  "qr_text": "qpay qr code text",
  "qr_image": "https://qpay.mn/qr/image.png",
  "urls": [
    {
      "name": "qpay",
      "description": "QPay app",
      "logo": "https://qpay.mn/logo.png",
      "link": "https://qpay.mn/pay/84efa8c0-cf3f-43c0-9bc8-71d9c50602a9"
    }
  ]
}
```

**Important Notes:**
- The invoice expires after 30 minutes by default
- The `callback_url` will receive a POST request when payment is completed
- QR code can be displayed for mobile payment apps

---

### 2. Get Invoice Details

**Endpoint:** `GET /v2/invoice/{invoice_id}`

**Authentication:** Bearer Token

**Description:** Retrieve information about a specific invoice.

**URL Parameter:**
- `invoice_id` (UUID): The invoice's unique identifier

**Response:**
```json
{
  "invoice_id": "84efa8c0-cf3f-43c0-9bc8-71d9c50602a9",
  "merchant_id": "78fd75dc-7d1f-4cb4-8c08-765a8d4fa499",
  "amount": 100,
  "currency": "MNT",
  "status": "PENDING" | "PAID" | "CANCELLED" | "EXPIRED",
  "description": "usnii tolbor",
  "created_at": "2025-01-04T12:00:00Z",
  "paid_at": null,
  "qr_text": "qpay qr code text",
  "qr_image": "https://qpay.mn/qr/image.png"
}
```

---

### 3. Cancel Invoice

**Endpoint:** `DELETE /v2/invoice/{invoice_id}`

**Authentication:** Bearer Token

**Description:** Cancel a pending invoice (only works for unpaid invoices).

**URL Parameter:**
- `invoice_id` (UUID): The invoice's unique identifier

**Response:**
```json
{
  "success": true,
  "invoice_id": "55bfb2ca-3517-4c9c-9427-45a2b5504746",
  "status": "CANCELLED"
}
```

**Important:** You cannot cancel an invoice that has already been paid.

---

## Payment Verification

### Check Payment Status

**Endpoint:** `POST /v2/payment/check`

**Authentication:** Bearer Token

**Description:** Check if payment has been made for a specific invoice.

**Request Body:**
```json
{
  "invoice_id": "55bfb2ca-3517-4c9c-9427-45a2b5504746"  // Required: Invoice UUID
}
```

**Response:**
```json
{
  "invoice_id": "55bfb2ca-3517-4c9c-9427-45a2b5504746",
  "payment_status": "PAID" | "UNPAID",
  "payment_amount": 100,
  "payment_currency": "MNT",
  "payment_date": "2025-01-04T12:30:00Z",
  "transaction_id": "txn_123456789"
}
```

---

## Common MCC Codes (Merchant Category Codes)

| Code | Description |
|------|-------------|
| 5045 | Computer and peripheral equipment |
| 5169 | Chemicals and allied products |
| 5311 | Department stores |
| 5691 | Men's and women's clothing |
| 5812 | Eating places and restaurants |

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "field_name",
      "reason": "Validation failure reason"
    }
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_REQUEST | Malformed request or missing required fields |
| 401 | UNAUTHORIZED | Invalid or expired token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | DUPLICATE_ENTRY | Merchant with this registration number already exists |
| 422 | VALIDATION_ERROR | Business logic validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## Webhook Notifications

When an invoice is paid, QPay sends a POST request to the `callback_url` specified during invoice creation.

### Webhook Payload

```json
{
  "invoice_id": "84efa8c0-cf3f-43c0-9bc8-71d9c50602a9",
  "payment_id": "pay_123456789",
  "amount": 100,
  "currency": "MNT",
  "status": "PAID",
  "paid_at": "2025-01-04T12:30:00Z",
  "transaction_id": "txn_123456789",
  "signature": "hmac_signature_here"
}
```

### Webhook Security

**IMPORTANT:** Always verify the HMAC signature to ensure the webhook is authentic.

**Signature Verification Algorithm:**
1. Concatenate: `invoice_id` + `payment_id` + `amount` + `currency` + `status`
2. Calculate HMAC-SHA256 using your secret key
3. Compare with the `signature` field (constant-time comparison)

**Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, secretKey) {
  const data = `${payload.invoice_id}${payload.payment_id}${payload.amount}${payload.currency}${payload.status}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(payload.signature)
  );
}
```

---

## Integration Checklist

- [ ] Obtain sandbox credentials (username, password, terminal_id)
- [ ] Implement token authentication flow with refresh
- [ ] Register test merchant (company or person)
- [ ] Create test invoice with callback URL
- [ ] Implement webhook endpoint with HMAC verification
- [ ] Test payment check endpoint
- [ ] Handle invoice cancellation
- [ ] Implement error handling for all error codes
- [ ] Switch to production credentials before going live
- [ ] Set up monitoring for webhook failures

---

## Rate Limiting

QPay implements rate limiting on all API endpoints:

- **Authentication endpoints:** 10 requests per minute
- **Merchant operations:** 30 requests per minute
- **Invoice creation:** 60 requests per minute
- **Payment check:** 120 requests per minute

**Response Header:** `X-RateLimit-Remaining: 45`

**Recommendation:** Implement exponential backoff when receiving 429 errors.

---

## Testing Environment

**Base URL:** `https://dev-vendor.qpay.mn`

**Test Credentials:**
- Username: `sand_ganzo2`
- Password: `Ss123456`
- Terminal ID: `95000059`

**Test Bank Account:**
- Bank Code: `040000`
- Account Number: `490000869`

**Test MCC Code:** `5311` (Department stores)

---

## Production Environment

**Base URL:** Contact QPay for production URL

**Important:**
- Use production credentials provided by QPay
- Test all integration flows in sandbox first
- Implement proper logging and monitoring
- Set up alerts for payment failures
- Ensure webhook endpoint has 99.9% uptime

---

## Support

For integration support or API issues:
- Email: support@qpay.mn
- Documentation: https://developer.qpay.mn
- Status Page: https://status.qpay.mn

---

## Changelog

### Version 2.0 (Current)
- Multi-merchant support
- Enhanced webhook notifications
- Improved error handling
- Added refresh token support
- Support for both company and person merchants

---

## Best Practices

### 1. Token Management
- Store tokens securely (never in client-side code)
- Implement automatic token refresh before expiration
- Handle 401 errors by refreshing token and retrying

### 2. Invoice Creation
- Always include callback URL for real-time payment notifications
- Set meaningful descriptions for customer clarity
- Store invoice_id in your database for reconciliation

### 3. Payment Verification
- Don't rely solely on webhooks (they can fail)
- Implement polling with payment check endpoint as fallback
- Use idempotency keys to prevent duplicate processing

### 4. Error Handling
- Log all API errors with correlation IDs
- Implement retry logic with exponential backoff
- Display user-friendly error messages (don't expose internal errors)

### 5. Security
- Always verify webhook HMAC signatures
- Use HTTPS for callback URLs
- Rotate API credentials periodically
- Monitor for unusual payment patterns

---

**End of Documentation**