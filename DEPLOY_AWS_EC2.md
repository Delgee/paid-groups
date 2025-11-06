# Deploy to AWS EC2 - Step-by-Step Guide

Complete guide for deploying the Telegram Groups SaaS platform on AWS EC2.

---

## Prerequisites

- AWS Account
- SSH key pair for EC2 access
- Domain name (for SSL certificates)
- QPay merchant account
- Telegram bot tokens

---

## Part 1: Launch EC2 Instance

### 1.1 Log into AWS Console

1. Go to https://console.aws.amazon.com/
2. Navigate to **EC2 Dashboard**
3. Click **Launch Instance**

### 1.2 Configure Instance

**Basic Details:**
- **Name**: `telegram-saas-production`
- **Application and OS Images**: Ubuntu Server 22.04 LTS
- **Architecture**: 64-bit (x86)

**Instance Type:**
- **Minimum**: `t3.medium` (2 vCPU, 4GB RAM) - $30/month
- **Recommended**: `t3.large` (2 vCPU, 8GB RAM) - $60/month
- **Production**: `t3.xlarge` (4 vCPU, 16GB RAM) - $120/month

**Key Pair:**
- Select existing key pair OR
- Create new key pair: `telegram-saas-key.pem`
- **Important**: Download and save the `.pem` file securely

**Network Settings:**
- **VPC**: Default (or create new)
- **Auto-assign public IP**: Enable
- **Firewall (Security Group)**: Create new

**Security Group Rules:**
```
Type          Protocol  Port Range  Source          Description
SSH           TCP       22          Your IP         SSH access
HTTP          TCP       80          0.0.0.0/0       HTTP traffic
HTTPS         TCP       443         0.0.0.0/0       HTTPS traffic
```

**Configure Storage:**
- **Root Volume**: 40 GB gp3 (minimum)
- **Recommended**: 80 GB gp3
- Enable "Delete on Termination": No (to prevent accidental data loss)

**Advanced Details (Optional):**
- **IAM Instance Profile**: (if using S3 for backups)
- **Enable CloudWatch detailed monitoring**: Yes

### 1.3 Launch Instance

Click **Launch Instance** and wait for instance to start (2-3 minutes).

---

## Part 2: Connect to EC2 Instance

### 2.1 Get Instance IP

```bash
# From EC2 Dashboard, note down:
# - Public IPv4 address (e.g., 18.123.45.67)
# - Public IPv4 DNS (e.g., ec2-18-123-45-67.compute-1.amazonaws.com)
```

### 2.2 Set Key Permissions

```bash
# On your local machine
chmod 400 ~/Downloads/telegram-saas-key.pem
```

### 2.3 Connect via SSH

```bash
# Replace with your instance IP
ssh -i ~/Downloads/telegram-saas-key.pem ubuntu@18.123.45.67
```

---

## Part 3: Configure Domain & DNS

### 3.1 Point Domain to EC2

In your domain registrar (GoDaddy, Namecheap, Route53, etc.):

**Add A Records:**
```
Type   Name    Value              TTL
A      @       18.123.45.67       300
A      www     18.123.45.67       300
```

**Using AWS Route53 (Recommended):**
1. Go to Route53 Console
2. Create Hosted Zone for your domain
3. Create Record Set:
   - Name: `yourdomain.com`
   - Type: A
   - Value: EC2 Public IP
   - TTL: 300

### 3.2 Verify DNS Propagation

```bash
# Wait 5-10 minutes, then test
dig yourdomain.com
nslookup yourdomain.com

# Should return your EC2 IP
```

---

## Part 4: Server Setup

### 4.1 Update System

```bash
# Update package list
sudo apt-get update
sudo apt-get upgrade -y

# Install basic tools
sudo apt-get install -y \
    curl \
    git \
    wget \
    unzip \
    vim \
    htop \
    ufw
```

### 4.2 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Apply group changes (re-login)
exit
# SSH back in
ssh -i ~/Downloads/telegram-saas-key.pem ubuntu@18.123.45.67

# Verify Docker works without sudo
docker --version
docker ps
```

### 4.3 Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4.4 Configure Firewall

```bash
# Reset UFW to default
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

---

## Part 5: Clone & Configure Application

### 5.1 Clone Repository

```bash
cd ~
git clone <your-repository-url> telegram-saas
cd telegram-saas
```

**If repository is private:**
```bash
# Option 1: Use Personal Access Token
git clone https://<token>@github.com/username/repo.git telegram-saas

# Option 2: Use SSH (setup SSH key in GitHub first)
git clone git@github.com:username/repo.git telegram-saas
```

### 5.2 Create Environment File

```bash
# Copy template
cp .env.production.template .env.production

# Edit with your values
nano .env.production
```

### 5.3 Generate Secrets

```bash
# Generate all required secrets
echo "DB_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "QPAY_WEBHOOK_SECRET=$(openssl rand -base64 32)"
```

### 5.4 Configure Environment Variables

Edit `.env.production` with these AWS-specific values:

```bash
# Database
DB_PASSWORD=<generated-password>
REDIS_PASSWORD=<generated-password>

# JWT
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
ENCRYPTION_KEY=<generated-secret>

# QPay (from your merchant account)
QPAY_USERNAME=your_qpay_username
QPAY_PASSWORD=your_qpay_password
QPAY_TERMINAL_ID=your_terminal_id
QPAY_BASE_URL=https://quickqr.qpay.mn
QPAY_WEBHOOK_SECRET=<generated-secret>
QPAY_CALLBACK_BASE_URL=https://yourdomain.com
QPAY_ENV=production

# URLs (use your domain)
FRONTEND_URL=https://yourdomain.com
BASE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# Telegram Bot Tokens
TELEGRAM_ONBOARDING_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID_BOT_TOKEN=your_bot_token

# Data Directory (on EC2)
DATA_DIR=/var/lib/telegram-saas
```

### 5.5 Validate Configuration

```bash
# Run validation
./validate-config.sh .env.production

# Fix any errors before proceeding
```

---

## Part 6: SSL Certificate Setup

### 6.1 Install Certbot

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop any services on port 80
sudo systemctl stop nginx 2>/dev/null || true
```

### 6.2 Obtain SSL Certificate

```bash
# Replace yourdomain.com with your actual domain
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --agree-tos \
  --email your-email@example.com \
  --non-interactive

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/
```

### 6.3 Copy Certificates

```bash
# Create SSL directory
mkdir -p ~/telegram-saas/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/telegram-saas/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/telegram-saas/nginx/ssl/

# Set ownership
sudo chown ubuntu:ubuntu ~/telegram-saas/nginx/ssl/*.pem

# Set permissions
chmod 644 ~/telegram-saas/nginx/ssl/fullchain.pem
chmod 600 ~/telegram-saas/nginx/ssl/privkey.pem
```

### 6.4 Setup Auto-Renewal

```bash
# Edit crontab
sudo crontab -e

# Add this line (renew twice daily)
0 0,12 * * * certbot renew --quiet --post-hook "cd /home/ubuntu/telegram-saas && docker-compose -f docker-compose.prod.secure.yml restart nginx"
```

---

## Part 7: Prepare Data Directory

```bash
# Create data directory
sudo mkdir -p /var/lib/telegram-saas/{postgres,redis,backend_logs,nginx_cache}

# Set ownership (UID 1001 = nodejs user in containers)
sudo chown -R 1001:1001 /var/lib/telegram-saas

# Set permissions
sudo chmod -R 755 /var/lib/telegram-saas
```

---

## Part 8: Deploy Application

### 8.1 Choose Configuration

**Option A: Use Secure Configuration (Recommended)**
```bash
cd ~/telegram-saas

# Use the secure configuration
./deploy.sh
# Then manually update to use secure config file
```

**Option B: Quick Deploy**
```bash
# Load environment
export $(cat .env.production | grep -v '^#' | xargs)

# Deploy with secure configuration
docker-compose -f docker-compose.prod.secure.yml up -d
```

### 8.2 Run Database Migrations

```bash
# Wait for services to be healthy (1-2 minutes)
docker-compose -f docker-compose.prod.secure.yml ps

# Run migrations
docker-compose -f docker-compose.prod.secure.yml exec backend npm run migration:run
```

### 8.3 Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.prod.secure.yml ps

# Check logs
docker-compose -f docker-compose.prod.secure.yml logs -f

# Test endpoints
curl http://localhost/health
curl https://yourdomain.com/health
```

---

## Part 9: Configure External Services

### 9.1 Configure QPay Webhook

1. Login to QPay merchant dashboard: https://merchant.qpay.mn
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL: `https://yourdomain.com/api/v1/payments/webhook`
4. Set webhook secret (same as `QPAY_WEBHOOK_SECRET` in .env)
5. Save and test

### 9.2 Verify Telegram Webhooks

```bash
# Check backend logs for webhook setup
docker-compose -f docker-compose.prod.secure.yml logs backend | grep -i webhook

# Should see:
# "Webhook health check passed for onboarding-bot"
# "Webhook health check passed for channel-id-bot"

# If not, check BASE_URL in .env.production
```

### 9.3 Create Initial Admin User

Visit: `https://yourdomain.com/register`

Or via API:
```bash
curl -X POST https://yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "name": "Admin User",
    "company_name": "Your Company"
  }'
```

---

## Part 10: Setup Automated Backups

### 10.1 Create Backup Script

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/home/ubuntu/telegram-saas"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f $PROJECT_DIR/docker-compose.prod.secure.yml exec -T postgres \
  pg_dump -U postgres telegram_saas | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Redis
docker-compose -f $PROJECT_DIR/docker-compose.prod.secure.yml exec redis redis-cli BGSAVE
sleep 5
docker cp $(docker-compose -f $PROJECT_DIR/docker-compose.prod.secure.yml ps -q redis):/data/dump.rdb \
  $BACKUP_DIR/redis_$DATE.rdb

# Backup .env file
cp $PROJECT_DIR/.env.production $BACKUP_DIR/env_$DATE.backup

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

# Make executable
chmod +x ~/backup.sh
```

### 10.2 Schedule Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/backup.sh >> /home/ubuntu/backup.log 2>&1
```

### 10.3 Backup to S3 (Optional but Recommended)

```bash
# Install AWS CLI
sudo apt-get install -y awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region

# Update backup script to sync to S3
echo "aws s3 sync $BACKUP_DIR s3://your-backup-bucket/telegram-saas/" >> ~/backup.sh
```

---

## Part 11: Monitoring & Maintenance

### 11.1 View Logs

```bash
# All services
docker-compose -f docker-compose.prod.secure.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.secure.yml logs -f backend
docker-compose -f docker-compose.prod.secure.yml logs -f frontend
docker-compose -f docker-compose.prod.secure.yml logs -f nginx
```

### 11.2 Check Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h

# CPU usage
htop
```

### 11.3 Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.secure.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.secure.yml restart backend
```

---

## Part 12: Cost Optimization

### 12.1 Use Reserved Instances

For production, purchase a 1-year Reserved Instance:
- t3.large: ~$40/month (vs $60 on-demand)
- t3.xlarge: ~$80/month (vs $120 on-demand)

### 12.2 Use EBS Snapshots

```bash
# Create snapshot via AWS Console or CLI
aws ec2 create-snapshot \
  --volume-id vol-xxxxxxxx \
  --description "Telegram SaaS Backup $(date +%Y-%m-%d)"
```

### 12.3 Enable CloudWatch Alarms

Create alarms for:
- High CPU utilization (>80%)
- High memory usage (>85%)
- Disk space low (<10%)
- Application errors

---

## Part 13: Security Hardening

### 13.1 Disable Password Authentication

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Set these values:
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

### 13.2 Install Fail2Ban

```bash
# Install fail2ban
sudo apt-get install -y fail2ban

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status sshd
```

### 13.3 Enable Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt-get install -y unattended-upgrades

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades

# Enable automatic updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
# Uncomment: "Unattended-Upgrade::Automatic-Reboot "true";"
```

---

## Part 14: Troubleshooting

### Issue: Can't connect to EC2

**Check:**
```bash
# 1. Security group allows your IP on port 22
# 2. Instance is running
# 3. Using correct key file
# 4. Using correct username (ubuntu, not root)

# Test connection
ssh -v -i telegram-saas-key.pem ubuntu@<EC2-IP>
```

### Issue: Domain not resolving

**Check:**
```bash
# 1. DNS propagation (can take up to 48 hours)
dig yourdomain.com

# 2. Correct A record
nslookup yourdomain.com

# 3. Nginx is running
docker-compose -f docker-compose.prod.secure.yml ps nginx
```

### Issue: SSL certificate error

**Fix:**
```bash
# Re-run certbot
sudo certbot certonly --standalone -d yourdomain.com --force-renew

# Copy certificates again
sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem ~/telegram-saas/nginx/ssl/
sudo chown ubuntu:ubuntu ~/telegram-saas/nginx/ssl/*.pem

# Restart nginx
docker-compose -f docker-compose.prod.secure.yml restart nginx
```

### Issue: Services not starting

**Check:**
```bash
# View logs
docker-compose -f docker-compose.prod.secure.yml logs

# Check disk space
df -h

# Check memory
free -h

# Verify environment file
./validate-config.sh .env.production
```

---

## Part 15: Updates & Maintenance

### Update Application

```bash
# SSH to EC2
ssh -i telegram-saas-key.pem ubuntu@<EC2-IP>

# Navigate to project
cd ~/telegram-saas

# Pull latest code
git pull origin main

# Backup database first
~/backup.sh

# Rebuild and restart
docker-compose -f docker-compose.prod.secure.yml build --no-cache
docker-compose -f docker-compose.prod.secure.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.secure.yml exec backend npm run migration:run
```

### Scale Instance (Vertical Scaling)

If you need more resources:
1. Stop instance: `sudo shutdown -h now`
2. In AWS Console: Actions → Instance Settings → Change Instance Type
3. Select larger instance (e.g., t3.large → t3.xlarge)
4. Start instance
5. Reconnect and verify services

---

## Quick Reference

### Essential Commands

```bash
# SSH to EC2
ssh -i telegram-saas-key.pem ubuntu@<EC2-IP>

# View logs
cd ~/telegram-saas
docker-compose -f docker-compose.prod.secure.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.secure.yml restart

# Check status
docker-compose -f docker-compose.prod.secure.yml ps

# Backup database
~/backup.sh

# Update application
cd ~/telegram-saas && git pull && docker-compose -f docker-compose.prod.secure.yml up -d --build
```

### Important Paths

```
Application: /home/ubuntu/telegram-saas
Data: /var/lib/telegram-saas/
Backups: /home/ubuntu/backups/
SSL Certs: /etc/letsencrypt/live/yourdomain.com/
Logs: docker-compose logs (no persistent file)
```

### URLs

```
Frontend: https://yourdomain.com
Backend API: https://yourdomain.com/api
Health Check: https://yourdomain.com/health
```

---

## Estimated Costs (Monthly)

**Minimum Setup (t3.medium):**
- EC2 Instance: $30
- EBS Storage (40GB): $4
- Data Transfer: $5-10
- **Total: ~$40-45/month**

**Recommended Setup (t3.large):**
- EC2 Instance: $60
- EBS Storage (80GB): $8
- Data Transfer: $10-20
- **Total: ~$80-90/month**

**Production Setup (t3.xlarge):**
- EC2 Instance: $120
- EBS Storage (160GB): $16
- Data Transfer: $20-40
- Load Balancer (optional): $20
- **Total: ~$160-200/month**

---

## Next Steps After Deployment

1. ✅ Test all critical workflows
2. ✅ Set up CloudWatch alarms
3. ✅ Configure backup to S3
4. ✅ Set up monitoring (Grafana/Prometheus)
5. ✅ Create disaster recovery plan
6. ✅ Document custom configurations
7. ✅ Set up CI/CD pipeline (optional)

---

**Deployment Time**: ~1-2 hours (first time)
**Maintenance**: ~30 minutes/week

**Questions?** Refer to:
- [DEPLOYMENT.md](DEPLOYMENT.md) - General deployment guide
- [DEPLOYMENT_REVIEW.md](DEPLOYMENT_REVIEW.md) - Security review
- [QUICK_START.md](QUICK_START.md) - Quick commands

---

**Last Updated**: 2025-01-06
**Tested On**: Ubuntu 22.04 LTS on AWS EC2
