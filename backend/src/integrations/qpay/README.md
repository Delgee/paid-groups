# QPay Integration Module

This module provides integration with the QPay Mongolia payment gateway for processing payments in the Telegram Groups SaaS platform.

## Features

- ✅ **Authentication**: Automatic token management with caching and refresh
- ✅ **Token Caching**: Redis-based caching with 5-minute buffer before expiration
- ✅ **Auto-Refresh**: Automatic token refresh when expired
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Health Checks**: Built-in health check for monitoring QPay connectivity
- ✅ **Logging**: Structured logging for all QPay operations

## Quick Start

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# QPay Payment Gateway Configuration
QPAY_USERNAME=sand_ganzo2            # Your QPay username
QPAY_PASSWORD=Ss123456               # Your QPay password
QPAY_TERMINAL_ID=95000059            # Your terminal ID
QPAY_BASE_URL=https://dev-vendor.qpay.mn  # API base URL
QPAY_WEBHOOK_SECRET=your-secret-key  # HMAC secret for webhook verification
QPAY_ENV=development                 # Environment (development/production)
```

### 2. Import the Module

The module is already registered in `app.module.ts`:

```typescript
import { QPayIntegrationModule } from './integrations/qpay/qpay-integration.module';

@Module({
  imports: [
    // ... other imports
    QPayIntegrationModule,
  ],
})
export class AppModule {}
```

### 3. Use the Auth Service

```typescript
import { QPayAuthService } from './integrations/qpay/services/qpay-auth.service';

@Injectable()
export class PaymentService {
  constructor(private readonly qpayAuth: QPayAuthService) {}

  async createInvoice() {
    // Get authenticated HTTP client
    const client = await this.qpayAuth.getAuthenticatedClient();

    // Make API calls
    const response = await client.post('/v2/invoice', invoiceData);

    return response.data;
  }
}
```

## Available Services

### QPayAuthService

Handles authentication and token management.

#### Methods

- `getAccessToken()`: Get a valid access token (from cache or new)
- `refreshAccessToken()`: Refresh the current access token
- `getAuthenticatedClient()`: Get an Axios HTTP client with auto-injected bearer token
- `clearTokenCache()`: Clear cached tokens
- `healthCheck()`: Verify QPay credentials are valid

#### Example Usage

```typescript
// Get access token
const token = await qpayAuthService.getAccessToken();

// Get authenticated client
const client = await qpayAuthService.getAuthenticatedClient();
const response = await client.get('/v2/invoice/123');

// Health check
const isHealthy = await qpayAuthService.healthCheck();
```

## DTOs

### Authentication DTOs

- `QPayTokenRequestDto`: Request body for token endpoint
- `QPayTokenResponseDto`: Response from token endpoint

### Invoice DTOs

- `CreateQPayInvoiceDto`: Create invoice request
- `QPayInvoiceResponseDto`: Invoice creation response
- `QPayInvoiceDetailsDto`: Invoice details
- `QPayPaymentCheckDto`: Payment status check request
- `QPayPaymentCheckResponseDto`: Payment status response

### Webhook DTOs

- `QPayWebhookDto`: Webhook payload from QPay

## Architecture

```
qpay/
├── dto/                           # Data Transfer Objects
│   ├── qpay-auth.dto.ts          # Authentication DTOs
│   ├── qpay-invoice.dto.ts       # Invoice DTOs
│   └── qpay-webhook.dto.ts       # Webhook DTOs
├── interfaces/                    # TypeScript interfaces
│   └── qpay.interface.ts         # QPay API interfaces
├── services/                      # Business logic
│   └── qpay-auth.service.ts      # Authentication service
├── __tests__/                     # Unit tests
│   └── qpay-auth.service.spec.ts # Auth service tests
├── qpay-integration.module.ts    # Module definition
└── README.md                      # This file
```

## Token Management

### Caching Strategy

- Tokens are cached in Redis with a 5-minute buffer before expiration
- Cache keys:
  - `qpay:access_token`: Access token
  - `qpay:refresh_token`: Refresh token

### Token Lifecycle

1. **First Request**: No token in cache → Request new token → Cache it
2. **Subsequent Requests**: Return cached token
3. **Token Expiring**: Auto-refresh before expiration (5-minute buffer)
4. **Refresh Fails**: Clear cache → Request new token

## Error Handling

All errors follow the project's error response format:

```typescript
{
  error: {
    code: 'QPAY_AUTH_FAILED',
    message: 'User-friendly error message',
    details: {
      // Additional context
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `QPAY_AUTH_FAILED` | Authentication failed (invalid credentials) |
| `QPAY_AUTH_ERROR` | Unexpected error during authentication |

## Testing

### Run Unit Tests

```bash
npm test -- qpay-auth.service.spec.ts
```

### Test Coverage

- ✅ Token caching and retrieval
- ✅ New token request
- ✅ Token refresh
- ✅ Cache expiration handling
- ✅ Error scenarios
- ✅ Health checks

## Next Steps

To complete the QPay integration, you need to implement:

1. **Invoice Service** ([qpay-invoice.service.ts](services/qpay-invoice.service.ts))
   - Create invoice
   - Get invoice details
   - Cancel invoice

2. **Payment Service** ([qpay-payment.service.ts](services/qpay-payment.service.ts))
   - Check payment status
   - Process payment confirmations

3. **Webhook Handler** ([qpay-webhook.service.ts](services/qpay-webhook.service.ts))
   - Verify HMAC signatures
   - Process payment webhooks
   - Queue webhook processing with BullMQ

4. **Merchant Service** ([qpay-merchant.service.ts](services/qpay-merchant.service.ts))
   - Create/update merchants
   - Get merchant details

## Documentation

- [QPay API Documentation](../../qpay-doc.md)
- [Project CLAUDE.md](../../CLAUDE.md)

## Security Considerations

- ✅ Credentials stored in environment variables
- ✅ Tokens cached with expiration
- ✅ HTTPS for all API calls
- ⚠️ TODO: Implement webhook HMAC verification
- ⚠️ TODO: Implement rate limiting for QPay API calls

## Support

For QPay API issues:
- Email: support@qpay.mn
- Documentation: https://developer.qpay.mn
