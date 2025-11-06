# Quick Start - Production Deployment

## Prerequisites

- Ubuntu 20.04+ server
- Docker & Docker Compose installed
- Domain name with DNS configured
- QPay merchant account
- Telegram bot tokens

## 1. Clone & Configure

```bash
# Clone repository
git clone <your-repo-url> telegram-saas
cd telegram-saas

# Copy environment template
cp .env.production.template .env.production

# Edit configuration (use strong passwords!)
nano .env.production
```

## 2. Generate Secrets

```bash
# Generate all required secrets
echo "DB_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "QPAY_WEBHOOK_SECRET=$(openssl rand -base64 32)"
```

Copy these values to `.env.production`

## 3. SSL Certificates

### Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot

# Get certificate
sudo certbot certonly --standalone \
  -d yourdomain.com \
  --agree-tos \
  --email your-email@example.com

# Copy to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*.pem
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### Self-Signed (Testing)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=yourdomain.com"
```

## 4. Deploy

### Option A: Automated Script

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Option B: Using Make

```bash
# Deploy everything
make deploy

# Or quick deploy (skip backup/build)
make deploy-quick
```

### Option C: Manual Docker Compose

```bash
# Load environment
export $(cat .env.production | grep -v '^#' | xargs)

# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run
```

## 5. Verify

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com
```

## 6. Post-Deployment

1. **Configure QPay Webhook**
   - Login to https://merchant.qpay.mn
   - Add webhook: `https://yourdomain.com/api/v1/payments/webhook`

2. **Create Admin User**
   - Visit: `https://yourdomain.com/register`
   - Register with your email

3. **Verify Telegram Bots**
   - Check logs for webhook setup confirmation
   - Test bots in Telegram

## Common Commands

```bash
# View logs
make logs
make logs-backend
make logs-frontend

# Restart services
make restart

# Create backup
make backup

# Stop services
make stop

# Start services
make start

# Database console
make db-console

# Check health
make health
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check ports
sudo netstat -tulpn | grep -E ':(80|443|3000|3001|5432|6379)'
```

### Database connection error

```bash
# Check database is ready
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# View database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### SSL certificate error

```bash
# Verify certificates exist
ls -lh nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong secrets (32+ characters)
- [ ] Configured SSL certificates
- [ ] Enabled firewall (ports 80, 443 only)
- [ ] Updated domain names in .env.production
- [ ] Configured QPay webhook
- [ ] Set up automated backups
- [ ] Tested disaster recovery

## Need Help?

Read full documentation:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [README.md](README.md) - Project overview
- [CLAUDE.md](CLAUDE.md) - Architecture details

---

**Estimated Deployment Time**: 15-30 minutes
