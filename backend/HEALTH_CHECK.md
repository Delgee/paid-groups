# Health Check Endpoints

This document describes the available health check endpoints for monitoring the application's dependencies.

## Available Endpoints

### 1. QPay Health Check

**Endpoint:** `GET /v1/health/qpay`

**Description:** Verifies QPay payment gateway connectivity by performing actual authentication.

**Response:**
```json
{
  "name": "qpay",
  "status": "healthy",
  "message": "QPay authentication successful",
  "duration_ms": 308,
  "details": {
    "base_url": "https://sandbox-quickqr.qpay.mn",
    "environment": "development",
    "terminal_id": "95000059"
  }
}
```

**Status Codes:**
- `healthy`: QPay authentication successful
- `unhealthy`: QPay authentication failed or API unreachable

**When This Runs:**
- On-demand when you hit the endpoint
- Tests actual authentication with QPay using configured credentials
- Verifies: `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_TERMINAL_ID`

---

### 2. Database Health Check

**Endpoint:** `GET /v1/health/database`

**Description:** Verifies PostgreSQL database connectivity.

**Response:**
```json
{
  "name": "database",
  "status": "healthy",
  "message": "Database connection is working",
  "duration_ms": 7,
  "details": {
    "is_connected": true,
    "has_driver": true
  }
}
```

---

### 3. Redis Health Check

**Endpoint:** `GET /v1/health/redis`

**Description:** Verifies Redis connectivity for caching.

**Response:**
```json
{
  "name": "redis",
  "status": "healthy",
  "message": "Redis connection is working",
  "duration_ms": 0
}
```

---

### 4. Telegram Health Check

**Endpoint:** `GET /v1/health/telegram`

**Description:** Verifies Telegram Bot API connectivity using an active project's bot.

**Response:**
```json
{
  "name": "telegram",
  "status": "healthy",
  "message": "Telegram API is reachable",
  "duration_ms": 125,
  "details": {
    "bot_id": 123456789,
    "bot_username": "your_bot"
  }
}
```

---

## Testing Health Checks

### Quick Test Script

Run the included test script:

```bash
cd backend
./test-qpay-health.sh
```

### Manual Testing

Test individual endpoints:

```bash
# QPay
curl http://localhost:3001/v1/health/qpay

# Database
curl http://localhost:3001/v1/health/database

# Redis
curl http://localhost:3001/v1/health/redis

# Telegram
curl http://localhost:3001/v1/health/telegram
```

---

## Integration with Monitoring

### Kubernetes Liveness/Readiness Probes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: telegram-saas-backend
spec:
  containers:
  - name: backend
    image: telegram-saas-backend:latest
    livenessProbe:
      httpGet:
        path: /v1/health/database
        port: 3001
      initialDelaySeconds: 10
      periodSeconds: 30
    readinessProbe:
      httpGet:
        path: /v1/health/qpay
        port: 3001
      initialDelaySeconds: 15
      periodSeconds: 10
```

### Uptime Monitoring (Better Stack, Pingdom, etc.)

Configure monitors for:
- **Critical**: `/v1/health/database` - Database must be up
- **Critical**: `/v1/health/redis` - Redis required for caching
- **Important**: `/v1/health/qpay` - Payment processing dependency
- **Important**: `/v1/health/telegram` - Bot functionality

**Recommended Alert Thresholds:**
- Status: Alert on `unhealthy`
- Response time: Alert if > 5 seconds
- Uptime: Alert if < 99.5%

---

## QPay Authentication Flow

When you hit `/v1/health/qpay`, here's what happens:

1. **Check Cache**: Looks for existing token in Redis
   - If found: Returns immediately (cached token is valid)
   - If not found: Proceeds to step 2

2. **Authenticate**: Makes API call to QPay
   ```
   POST https://sandbox-quickqr.qpay.mn/v2/auth/token
   Authorization: Basic <base64(username:password)>
   Body: { "terminal_id": "95000059" }
   ```

3. **Cache Token**: Stores token in Redis with expiration
   - TTL: 55 minutes (5-minute buffer before QPay expiration)
   - Key: `qpay:access_token`

4. **Return Result**:
   - Success → `status: "healthy"`
   - Failure → `status: "unhealthy"`

**Performance:**
- First call: ~200-300ms (actual API call)
- Subsequent calls: ~0-5ms (cached token)
- Token refreshes automatically every ~55 minutes

---

## Troubleshooting

### QPay Health Check Fails

**Symptom:** `/v1/health/qpay` returns `unhealthy`

**Possible Causes:**

1. **Invalid Credentials**
   ```bash
   # Check your .env file
   cat backend/.env | grep QPAY

   # Should have:
   QPAY_USERNAME=TEST_VENDOR_MERCHANT
   QPAY_PASSWORD=123456
   QPAY_TERMINAL_ID=95000059
   QPAY_BASE_URL=https://sandbox-quickqr.qpay.mn
   ```

2. **Network Issue**
   ```bash
   # Test connectivity to QPay API
   curl https://sandbox-quickqr.qpay.mn/v2/auth/token
   # Should return 401 (unauthorized) not timeout
   ```

3. **Redis Down**
   ```bash
   # QPay auth needs Redis for caching
   curl http://localhost:3001/v1/health/redis
   ```

**Fix:**
1. Verify credentials in `.env`
2. Restart backend: `npm run start:dev`
3. Check logs: `tail -f logs/app.log`

---

## Environment Variables

Required for QPay health check:

```bash
QPAY_USERNAME=TEST_VENDOR_MERCHANT
QPAY_PASSWORD=123456
QPAY_TERMINAL_ID=95000059
QPAY_BASE_URL=https://sandbox-quickqr.qpay.mn
QPAY_ENV=development
```

---

## Logs

QPay authentication logs can be found in the console output:

```
[QPayAuthService] QPay access token cached successfully
[QPayAuthService] QPay access token retrieved from cache
[HealthService] QPay health check failed
```

Enable debug logging:
```bash
LOG_LEVEL=debug npm run start:dev
```

---

## Related Files

- Health Module: [src/modules/health/](src/modules/health/)
- QPay Integration: [src/integrations/qpay/](src/integrations/qpay/)
- Test Script: [test-qpay-health.sh](test-qpay-health.sh)
- QPay Docs: [../../qpay-doc.md](../../qpay-doc.md)
