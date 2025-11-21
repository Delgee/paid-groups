# Telegram Groups SaaS - Production Deployment Guide

This guide provides step-by-step instructions for deploying the Telegram Groups SaaS platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [Initial Configuration](#initial-configuration)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Deployment](#deployment)
- [Post-Deployment](#post-deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### Hardware Requirements

**Minimum Specifications:**
- 2 CPU cores
- 4GB RAM
- 40GB SSD storage
- 100 Mbps network connection

**Recommended Specifications:**
- 4+ CPU cores
- 8GB+ RAM
- 80GB+ SSD storage
- 1 Gbps network connection

### Software Requirements

- Ubuntu 20.04 LTS or newer (or similar Linux distribution)
- Docker 24.0+ and Docker Compose 2.20+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

### External Services

1. **QPay Merchant Account**
   - Sign up at https://merchant.qpay.mn
   - Complete merchant verification
   - Note your: Username, Password, Terminal ID

2. **Telegram Bot Tokens**
   - Create bots via @BotFather on Telegram
   - Need 2 bots: Onboarding Bot and Channel ID Bot
   - Note your bot tokens

---

## Server Setup

### 1. Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Configure Firewall

```bash
# Reset UFW to default
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change 22 if using custom port)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

### 4. Create Deployment User (Optional but Recommended)

```bash
# Create deployment user
sudo adduser telegram-saas
sudo usermod -aG docker telegram-saas
sudo usermod -aG sudo telegram-saas

# Switch to deployment user
su - telegram-saas
```

---

## Initial Configuration

### 1. Clone Repository

```bash
# Clone the repository
cd ~
git clone <your-repository-url> telegram-saas
cd telegram-saas

# Checkout to main/production branch
git checkout main
```

### 2. Configure Environment Variables

```bash
# Copy production environment template
cp .env.production.template .env.production

# Edit production environment file
nano .env.production
```

**Critical Configuration Items:**

```bash
# Database - Use strong passwords!
DB_PASSWORD=<generate-strong-password>
REDIS_PASSWORD=<generate-strong-password>

# JWT Secrets - Generate using: openssl rand -base64 32
JWT_SECRET=<generate-secret-key>
JWT_REFRESH_SECRET=<generate-secret-key>

# Encryption - Generate using: openssl rand -base64 32
ENCRYPTION_KEY=<generate-secret-key>

# QPay Configuration (from QPay merchant dashboard)
QPAY_USERNAME=<your-qpay-username>
QPAY_PASSWORD=<your-qpay-password>
QPAY_TERMINAL_ID=<your-terminal-id>
QPAY_BASE_URL=https://quickqr.qpay.mn
QPAY_WEBHOOK_SECRET=<generate-secret-key>
QPAY_CALLBACK_BASE_URL=https://yourdomain.com
QPAY_ENV=production

# URLs (replace with your actual domain)
FRONTEND_URL=https://yourdomain.com
BASE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Telegram Bot Tokens (from @BotFather)
TELEGRAM_ONBOARDING_BOT_TOKEN=<your-onboarding-bot-token>
TELEGRAM_CHANNEL_ID_BOT_TOKEN=<your-channel-id-bot-token>
```

### 3. Generate Secure Secrets

```bash
# Generate database password
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32

# Generate JWT refresh secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32

# Generate QPay webhook secret
openssl rand -base64 32
```

**Important**: Copy these values to `.env.production` file.

---

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop any services on port 80
sudo systemctl stop nginx 2>/dev/null || true

# Obtain certificate (replace yourdomain.com)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --agree-tos \
  --email your-email@example.com \
  --non-interactive

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/privkey.pem

# Set permissions
sudo chown $USER:$USER nginx/ssl/*.pem
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### Option 2: Self-Signed (Testing Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"

# Set permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

**Warning**: Browsers will show security warnings with self-signed certificates.

### Set Up Auto-Renewal

```bash
# Add renewal cron job
sudo crontab -e

# Add this line (adjust path to your project directory)
0 0,12 * * * certbot renew --quiet --post-hook "cd /home/telegram-saas/telegram-saas && docker-compose -f docker-compose.prod.yml restart nginx"
```

---

## Deployment

### 1. Build Docker Images

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build images (this may take 5-10 minutes)
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 2. Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Run Database Migrations

```bash
# Wait for database to be ready (check logs)
docker-compose -f docker-compose.prod.yml logs -f postgres

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

# Verify migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:show
```

### 4. Verify Deployment

```bash
# Check all services are healthy
docker-compose -f docker-compose.prod.yml ps

# Test backend health endpoint
curl https://yourdomain.com/health

# Test frontend
curl https://yourdomain.com

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=50 backend
docker-compose -f docker-compose.prod.yml logs --tail=50 frontend
docker-compose -f docker-compose.prod.yml logs --tail=50 nginx
```

---

## Post-Deployment

### 1. Configure Telegram Webhooks

The application automatically configures webhooks on startup, but verify:

```bash
# Check backend logs for webhook setup
docker-compose -f docker-compose.prod.yml logs backend | grep -i webhook

# You should see messages like:
# "Webhook health check passed for onboarding-bot"
# "Webhook health check passed for channel-id-bot"
```

### 2. Configure QPay Webhook

1. Log in to QPay merchant dashboard: https://merchant.qpay.mn
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL: `https://yourdomain.com/api/v1/payments/webhook`
4. Set webhook secret to match `QPAY_WEBHOOK_SECRET` in `.env.production`
5. Test webhook delivery

### 3. Create Initial Admin User

```bash
# Register first user via frontend
# Navigate to: https://yourdomain.com/register

# Or via API:
curl -X POST https://yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "name": "Admin User",
    "company_name": "Your Company"
  }'
```

### 4. Test Critical Workflows

- [ ] User registration
- [ ] User login
- [ ] Telegram group creation
- [ ] Bot connection to Telegram channel
- [ ] Payment creation (test mode)
- [ ] Webhook receipt (QPay test payment)

---

## Maintenance

### Update Application

```bash
# Pull latest changes
cd ~/telegram-saas
git pull origin main

# Rebuild and restart services
export $(cat .env.production | grep -v '^#' | xargs)
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run new migrations if any
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# Follow logs with timestamp
docker-compose -f docker-compose.prod.yml logs -f -t backend
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all services
docker-compose -f docker-compose.prod.yml stop

# Start all services
docker-compose -f docker-compose.prod.yml start
```

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d telegram_saas

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres telegram_saas > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
cat backup_20240101_120000.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres telegram_saas

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

# Revert last migration
docker-compose -f docker-compose.prod.yml exec backend npm run migration:revert
```

### Redis Operations

```bash
# Connect to Redis CLI
docker-compose -f docker-compose.prod.yml exec redis redis-cli

# If password is set
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a YOUR_REDIS_PASSWORD

# Check Redis memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO memory

# Flush cache (use with caution!)
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs backend

# Check if ports are already in use
sudo netstat -tulpn | grep -E ':(80|443|3000|3001|5432|6379)'

# Verify environment variables
docker-compose -f docker-compose.prod.yml config

# Check disk space
df -h

# Check memory usage
free -h
```

### Database Connection Issues

```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec backend sh -c 'echo "SELECT 1" | psql $DATABASE_URL'

# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify database exists
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -l

# Check database connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity"
```

### Redis Connection Issues

```bash
# Test Redis connectivity
docker-compose -f docker-compose.prod.yml exec redis redis-cli PING

# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis

# Verify Redis is running
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO server
```

### SSL Certificate Issues

```bash
# Verify certificate files exist
ls -lh nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout | grep -E 'Issuer|Subject|Not'

# Test SSL connection
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Webhook Not Receiving

```bash
# Check if webhook URL is accessible
curl -X POST https://yourdomain.com/api/v1/onboarding-bot/webhook/YOUR_BOT_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"message": {"text": "test"}}'

# Check Telegram webhook status
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Check backend logs for webhook processing
docker-compose -f docker-compose.prod.yml logs -f backend | grep -i webhook

# Verify firewall allows incoming webhooks
sudo ufw status verbose
```

### High Memory Usage

```bash
# Check container memory usage
docker stats

# Restart services to free memory
docker-compose -f docker-compose.prod.yml restart

# Check for memory leaks in logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i 'memory\|heap'

# Increase container memory limits (in docker-compose.prod.yml)
# Add under service definition:
#   deploy:
#     resources:
#       limits:
#         memory: 2G
```

---

## Monitoring

### Health Checks

```bash
# Backend health
curl https://yourdomain.com/health

# Frontend health
curl https://yourdomain.com

# Database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli PING
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Network usage
docker-compose -f docker-compose.prod.yml exec backend netstat -i

# Log file sizes
du -sh logs/
```

### Application Metrics

The application exposes Prometheus metrics at `/metrics`:

```bash
# Check metrics endpoint
curl https://yourdomain.com/api/metrics

# Key metrics to monitor:
# - http_request_duration_seconds (API latency)
# - payments_total (payment success/failure rate)
# - telegram_bot_commands_total (bot usage)
# - database_connections_active (database load)
```

### Set Up Monitoring Stack (Optional)

Consider integrating:
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Loki**: Log aggregation
- **Alertmanager**: Alert routing

---

## Backup & Recovery

### Automated Backup Script

Create `/home/telegram-saas/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/telegram-saas/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/home/telegram-saas/telegram-saas"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f $PROJECT_DIR/docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres telegram_saas | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Redis (RDB snapshot)
docker-compose -f $PROJECT_DIR/docker-compose.prod.yml exec redis redis-cli BGSAVE
sleep 5
docker cp $(docker-compose -f $PROJECT_DIR/docker-compose.prod.yml ps -q redis):/data/dump.rdb \
  $BACKUP_DIR/redis_$DATE.rdb

# Backup environment file
cp $PROJECT_DIR/.env.production $BACKUP_DIR/env_$DATE.backup

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:

```bash
chmod +x /home/telegram-saas/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/telegram-saas/backup.sh >> /home/telegram-saas/backup.log 2>&1
```

### Restore from Backup

```bash
# Stop services
docker-compose -f docker-compose.prod.yml stop backend frontend

# Restore database
zcat /home/telegram-saas/backups/db_20240101_020000.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres telegram_saas

# Restore Redis
docker cp /home/telegram-saas/backups/redis_20240101_020000.rdb \
  $(docker-compose -f docker-compose.prod.yml ps -q redis):/data/dump.rdb

# Restart services
docker-compose -f docker-compose.prod.yml start backend frontend
```

### Disaster Recovery

In case of complete server failure:

1. **Provision new server** following [Server Setup](#server-setup)
2. **Restore backups** to new server
3. **Configure DNS** to point to new server IP
4. **Update SSL certificates** if using Let's Encrypt
5. **Update `.env.production`** with new server details
6. **Deploy application** following [Deployment](#deployment)
7. **Restore database and Redis** from backups
8. **Verify all services** are operational

---

## Security Best Practices

- [ ] Use strong passwords for all services (minimum 32 characters)
- [ ] Enable firewall and allow only necessary ports
- [ ] Keep Docker and system packages updated
- [ ] Use SSL/TLS for all connections
- [ ] Regularly rotate secrets and credentials
- [ ] Enable audit logging
- [ ] Implement rate limiting (already configured)
- [ ] Monitor logs for suspicious activity
- [ ] Set up automated backups
- [ ] Test disaster recovery procedures
- [ ] Use separate credentials for each environment
- [ ] Never commit secrets to version control
- [ ] Implement IP whitelisting for admin endpoints (optional)
- [ ] Enable 2FA for critical accounts (QPay, server access)

---

## Performance Optimization

### Database Optimization

```sql
-- Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres telegram_saas

-- Check slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '1 second';

-- Analyze table statistics
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

### Redis Optimization

```bash
# Check memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO memory

# Check hit rate
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO stats | grep keyspace

# Set max memory policy (in docker-compose.prod.yml)
# Add to redis service:
#   command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### Application Optimization

1. **Enable HTTP/2** (already configured in nginx)
2. **Enable Gzip compression** (already configured in nginx)
3. **Implement CDN** for static assets
4. **Optimize Docker images** (already using multi-stage builds)
5. **Enable connection pooling** (already configured in TypeORM)
6. **Configure caching headers** (already configured in nginx)

---

## Support & Resources

- **Documentation**: [README.md](README.md)
- **Project Instructions**: [CLAUDE.md](CLAUDE.md)
- **Architecture**: Multi-tenant SaaS with NestJS + Next.js
- **Issue Tracking**: GitHub Issues (configure your repository)

---

## License

Refer to LICENSE file in repository root.

---

**Last Updated**: 2025-01-21
**Version**: 1.0.1
