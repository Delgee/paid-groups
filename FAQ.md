# Frequently Asked Questions (FAQ)

Common questions about deploying and managing the Telegram Groups SaaS platform.

---

## Deployment Questions

### Q: Do I need to install Nginx on the EC2 server?

**A: No!** You do **NOT** need to install nginx on the EC2 server.

The nginx web server is already included in your Docker setup and runs as a container. When you run `docker-compose up`, nginx starts automatically inside a Docker container.

#### How It Works

```
EC2 Server (Ubuntu)
    ↓
[Docker Engine]
    ↓
[Docker Compose manages these containers:]
    ├── Nginx Container (ports 80/443) ← Web server runs here!
    ├── Backend Container (NestJS API)
    ├── Frontend Container (Next.js)
    ├── PostgreSQL Container (database)
    └── Redis Container (cache)
```

#### What You Actually Need to Install

**✅ DO Install on EC2 Host:**
```bash
# Essential tools
sudo apt-get install curl git wget vim

# Docker + Docker Compose
curl -fsSL https://get.docker.com | sh

# Certbot (for SSL certificates)
sudo apt-get install certbot
```

**❌ DON'T Install on EC2 Host:**
- ~~nginx~~ (runs in Docker container)
- ~~PostgreSQL~~ (runs in Docker container)
- ~~Redis~~ (runs in Docker container)
- ~~Node.js~~ (runs in Docker container)

#### How SSL Certificates Work

1. **Certbot runs on host** to get certificates:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

2. **Certificates are copied** to project directory:
```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem ~/telegram-saas/nginx/ssl/
```

3. **Nginx container mounts** the certificates:
```yaml
# In docker-compose.prod.secure.yml
nginx:
  volumes:
    - ./nginx/ssl:/etc/nginx/ssl:ro  # Host files → Container
```

#### Port Mapping

```yaml
nginx:
  image: nginx:alpine  # Nginx runs in this container
  ports:
    - "80:80"          # Host port 80 → Container port 80
    - "443:443"        # Host port 443 → Container port 443
```

Traffic flow:
```
Internet → EC2 Port 80/443 → Nginx Container → Backend/Frontend Containers
```

#### Deploying Everything

One command starts all services including nginx:
```bash
docker-compose -f docker-compose.prod.secure.yml up -d
```

This starts 5 containers:
1. ✅ Nginx (web server/reverse proxy)
2. ✅ Backend (NestJS API)
3. ✅ Frontend (Next.js dashboard)
4. ✅ PostgreSQL (database)
5. ✅ Redis (cache/queue)

**Your EC2 server stays clean** with just Docker installed!

---

## Configuration Questions

### Q: Should I use `docker-compose.prod.yml` or `docker-compose.prod.secure.yml`?

**A: Use `docker-compose.prod.secure.yml` for production.**

**Security Differences:**

| Feature | prod.yml | prod.secure.yml |
|---------|----------|-----------------|
| Database port exposed | ⚠️ Yes (5432) | ✅ No |
| Redis port exposed | ⚠️ Yes (6379) | ✅ No |
| Backend port exposed | ⚠️ Yes (3001) | ✅ No |
| Frontend port exposed | ⚠️ Yes (3000) | ✅ No |
| Resource limits | ❌ No | ✅ Yes |
| Bind mounts | ❌ No | ✅ Yes |
| Redis health check | ⚠️ Broken | ✅ Fixed |

**Summary:**
- `docker-compose.prod.yml` - Original version with security issues
- `docker-compose.prod.secure.yml` - Fixed version (recommended)

See [DEPLOYMENT_REVIEW.md](DEPLOYMENT_REVIEW.md) for detailed analysis.

---

### Q: What's the difference between named volumes and bind mounts?

**A: Bind mounts are safer for production data.**

**Named Volumes** (in `docker-compose.prod.yml`):
```yaml
volumes:
  postgres_data:  # Docker manages this
```
- ⚠️ Can be deleted with `docker-compose down -v`
- Hard to find location on disk
- Requires `docker cp` to backup

**Bind Mounts** (in `docker-compose.prod.secure.yml`):
```yaml
volumes:
  - /var/lib/telegram-saas/postgres:/var/lib/postgresql/data
```
- ✅ Explicit location on disk
- ✅ Protected from `docker-compose down -v`
- ✅ Easy to backup with standard tools

**Recommendation:** Use bind mounts (secure version) for production.

---

## Deployment Environment Questions

### Q: Why does `docker-compose.prod.secure.yml` have `NODE_ENV: development`?

**A: This is a bug in the file that was modified.**

The secure configuration should have:
```yaml
backend:
  environment:
    NODE_ENV: production  # ← Should be production, not development

frontend:
  environment:
    NODE_ENV: production  # ← Should be production, not development
```

**To fix:**
```bash
# Edit the file
nano docker-compose.prod.secure.yml

# Change lines 118 and 214 from:
NODE_ENV: development

# To:
NODE_ENV: production
```

Or use environment variable override:
```bash
# In .env.production
NODE_ENV=production

# Then deploy
docker-compose -f docker-compose.prod.secure.yml up -d
```

---

## SSL/TLS Questions

### Q: Can I use self-signed certificates for production?

**A: No, not recommended.**

**Self-signed certificates:**
- ⚠️ Browsers show security warnings
- ⚠️ Users must manually accept risk
- ⚠️ Breaks API integrations
- ⚠️ Bad for SEO

**Use Let's Encrypt instead (Free & Easy):**
```bash
# Get free SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Automatically trusted by all browsers
# Auto-renewal with cron job
```

**Only use self-signed for:**
- Local testing
- Internal development
- Non-public environments

---

### Q: How do I renew SSL certificates?

**A: Certbot auto-renews, but you can manually renew.**

**Automatic Renewal (Recommended):**
```bash
# Add to crontab
sudo crontab -e

# Add this line (checks twice daily)
0 0,12 * * * certbot renew --quiet --post-hook "cd /home/ubuntu/telegram-saas && docker-compose -f docker-compose.prod.secure.yml restart nginx"
```

**Manual Renewal:**
```bash
# Renew certificates
sudo certbot renew

# Copy to project
sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem ~/telegram-saas/nginx/ssl/

# Restart nginx
docker-compose -f docker-compose.prod.secure.yml restart nginx
```

**Check certificate expiry:**
```bash
# View certificate details
openssl x509 -in nginx/ssl/fullchain.pem -text -noout | grep -A2 Validity
```

---

## Database Questions

### Q: How do I backup the database?

**A: Use the provided backup script or manual commands.**

**Option 1: Automated Script**
```bash
# Run backup script
~/backup.sh

# Backup saved to:
~/backups/db_YYYYMMDD_HHMMSS.sql.gz
```

**Option 2: Manual Backup**
```bash
# Backup database
docker-compose -f docker-compose.prod.secure.yml exec -T postgres \
  pg_dump -U postgres telegram_saas | gzip > backup.sql.gz

# Backup to S3 (optional)
aws s3 cp backup.sql.gz s3://your-bucket/backups/
```

**Option 3: Using Makefile**
```bash
make backup
```

---

### Q: How do I restore from backup?

**A: Stop services, restore database, restart.**

```bash
# Stop backend/frontend (keep database running)
docker-compose -f docker-compose.prod.secure.yml stop backend frontend

# Restore database
zcat backup_20250106_020000.sql.gz | \
  docker-compose -f docker-compose.prod.secure.yml exec -T postgres \
  psql -U postgres telegram_saas

# Restart services
docker-compose -f docker-compose.prod.secure.yml start backend frontend
```

**Using Makefile:**
```bash
make restore FILE=backup_20250106_020000.sql.gz
```

---

### Q: Can I access the database directly?

**A: Yes, but only from inside the server.**

**From EC2 Server:**
```bash
# Connect to database
docker-compose -f docker-compose.prod.secure.yml exec postgres \
  psql -U postgres telegram_saas
```

**From Outside (NOT RECOMMENDED):**

The secure configuration does NOT expose the database port for security. If you absolutely need external access:

1. Use SSH tunnel:
```bash
# On your local machine
ssh -i key.pem -L 5432:localhost:5432 ubuntu@<EC2-IP>

# Then connect via localhost:5432
psql -h localhost -U postgres telegram_saas
```

2. Or use database GUI with SSH:
   - DBeaver, pgAdmin, TablePlus
   - Configure SSH tunnel in connection settings

**Never expose port 5432 directly to the internet!**

---

## Performance Questions

### Q: What EC2 instance size do I need?

**A: Depends on your user base.**

| Users | Instance | vCPU | RAM | Cost/Month |
|-------|----------|------|-----|------------|
| < 100 | t3.small | 2 | 2GB | $15-20 |
| 100-500 | t3.medium | 2 | 4GB | $30-40 |
| 500-2000 | t3.large | 2 | 8GB | $60-80 |
| 2000-10k | t3.xlarge | 4 | 16GB | $120-160 |
| 10k+ | t3.2xlarge+ | 8+ | 32GB+ | $240+ |

**Start small and scale up** as needed.

**Monitor these metrics:**
- CPU usage (target: <70%)
- Memory usage (target: <80%)
- Database connections
- Response times

---

### Q: How do I scale the application?

**Vertical Scaling (Single Server):**
```bash
# Stop instance
sudo shutdown -h now

# In AWS Console:
# 1. Select instance
# 2. Actions → Instance Settings → Change Instance Type
# 3. Select larger size (e.g., t3.large → t3.xlarge)
# 4. Start instance

# Reconnect and verify
ssh -i key.pem ubuntu@<EC2-IP>
docker-compose -f docker-compose.prod.secure.yml ps
```

**Horizontal Scaling (Multiple Servers):**
- Requires load balancer (AWS ALB)
- Requires external database (AWS RDS)
- Requires session storage (Redis cluster)
- More complex, but handles higher load

**Start with vertical scaling** for most use cases.

---

## Monitoring Questions

### Q: How do I view logs?

**A: Use docker-compose logs.**

**All services:**
```bash
docker-compose -f docker-compose.prod.secure.yml logs -f
```

**Specific service:**
```bash
docker-compose -f docker-compose.prod.secure.yml logs -f backend
docker-compose -f docker-compose.prod.secure.yml logs -f frontend
docker-compose -f docker-compose.prod.secure.yml logs -f nginx
```

**Last 100 lines:**
```bash
docker-compose -f docker-compose.prod.secure.yml logs --tail=100 backend
```

**Using Makefile:**
```bash
make logs
make logs-backend
make logs-frontend
```

---

### Q: How do I monitor resource usage?

**A: Use docker stats and system tools.**

**Container resource usage:**
```bash
docker stats
```

**System resources:**
```bash
# CPU and memory
htop

# Disk space
df -h

# Network
netstat -tlnp

# Specific service
docker inspect telegram-saas-backend --format='{{.State.Health.Status}}'
```

**Using Makefile:**
```bash
make status
make health
make perf-report  # If added
```

---

## Security Questions

### Q: How do I secure my EC2 instance?

**A: Follow security best practices.**

**1. Configure Firewall:**
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

**2. Disable Password Authentication:**
```bash
sudo nano /etc/ssh/sshd_config

# Set:
PasswordAuthentication no
PermitRootLogin no

sudo systemctl restart sshd
```

**3. Install Fail2Ban:**
```bash
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
```

**4. Enable Auto-Updates:**
```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

**5. Use Strong Secrets:**
```bash
# Generate 32+ character secrets
openssl rand -base64 32

# Validate configuration
./validate-config.sh .env.production
```

See [DEPLOYMENT_REVIEW.md](DEPLOYMENT_REVIEW.md) for more security recommendations.

---

### Q: What ports should be open?

**A: Only 22, 80, and 443.**

**Required Ports:**
- `22` - SSH (restrict to your IP if possible)
- `80` - HTTP (auto-redirects to HTTPS)
- `443` - HTTPS (main application access)

**Should NOT be open:**
- ❌ `3000` - Frontend (internal only)
- ❌ `3001` - Backend (internal only)
- ❌ `5432` - PostgreSQL (internal only)
- ❌ `6379` - Redis (internal only)

**Verify with:**
```bash
sudo ufw status verbose
netstat -tlnp | grep -E ':(3000|3001|5432|6379)'  # Should show nothing
```

---

## Troubleshooting Questions

### Q: Services won't start, what should I check?

**A: Follow this checklist:**

**1. Check Logs:**
```bash
docker-compose -f docker-compose.prod.secure.yml logs
```

**2. Check Disk Space:**
```bash
df -h
# Need at least 10GB free
```

**3. Check Memory:**
```bash
free -h
# Need at least 2GB free
```

**4. Validate Environment:**
```bash
./validate-config.sh .env.production
```

**5. Check Service Health:**
```bash
docker-compose -f docker-compose.prod.secure.yml ps
docker inspect --format='{{.State.Health.Status}}' telegram-saas-backend
```

**6. Restart Services:**
```bash
docker-compose -f docker-compose.prod.secure.yml restart
```

---

### Q: How do I fix "Cannot connect to database"?

**A: Check database service and credentials.**

**1. Check if PostgreSQL is running:**
```bash
docker-compose -f docker-compose.prod.secure.yml ps postgres
```

**2. Check PostgreSQL logs:**
```bash
docker-compose -f docker-compose.prod.secure.yml logs postgres
```

**3. Test connection:**
```bash
docker-compose -f docker-compose.prod.secure.yml exec postgres \
  psql -U postgres telegram_saas -c "SELECT 1"
```

**4. Verify credentials in .env.production:**
```bash
grep DB_ .env.production
```

**5. Restart database:**
```bash
docker-compose -f docker-compose.prod.secure.yml restart postgres
```

---

### Q: Domain not resolving, what's wrong?

**A: Check DNS configuration and propagation.**

**1. Check DNS records:**
```bash
dig yourdomain.com
nslookup yourdomain.com
```

**2. Verify A record points to EC2 IP:**
```
# Should return your EC2 public IP
dig +short yourdomain.com
```

**3. DNS propagation takes time:**
- Usually: 5-30 minutes
- Can take: up to 48 hours
- Check: https://dnschecker.org

**4. Check nginx is running:**
```bash
docker-compose -f docker-compose.prod.secure.yml ps nginx
curl http://localhost/health
```

---

## Cost Questions

### Q: How much does it cost to run this?

**A: Approximately $40-200/month depending on scale.**

**AWS Costs (Monthly):**
| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| EC2 Instance | $15 (t3.small) | $60 (t3.large) | $120 (t3.xlarge) |
| EBS Storage | $4 (40GB) | $8 (80GB) | $16 (160GB) |
| Data Transfer | $5 | $10 | $20 |
| Snapshots | $2 | $5 | $10 |
| **Total** | **~$26** | **~$83** | **~$166** |

**Additional Costs:**
- Domain name: $10-15/year
- SSL: Free (Let's Encrypt)
- Backups to S3: $1-5/month

**Cost Optimization:**
- Use Reserved Instances (save 30-40%)
- Use EBS snapshots instead of AMIs
- Monitor and right-size instance

---

### Q: Can I run this on a cheaper VPS (DigitalOcean, Linode)?

**A: Yes! The deployment works on any Ubuntu server.**

The instructions are written for AWS EC2, but work on:
- ✅ DigitalOcean Droplets
- ✅ Linode VPS
- ✅ Vultr
- ✅ Hetzner Cloud
- ✅ Any Ubuntu 20.04+ server

**Just skip AWS-specific steps** like:
- Security group configuration (use provider's firewall)
- EBS snapshots (use provider's backup solution)
- CloudWatch (use provider's monitoring)

**Example: DigitalOcean Droplet ($48/month = t3.large equivalent)**

---

## Update Questions

### Q: How do I update the application?

**A: Pull latest code and rebuild.**

```bash
# SSH to server
ssh -i key.pem ubuntu@<EC2-IP>

# Navigate to project
cd ~/telegram-saas

# Backup first!
~/backup.sh

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.secure.yml build --no-cache
docker-compose -f docker-compose.prod.secure.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.secure.yml exec backend npm run migration:run

# Verify
docker-compose -f docker-compose.prod.secure.yml ps
```

**Using deploy script:**
```bash
cd ~/telegram-saas
git pull
./deploy.sh
```

---

### Q: Can I update without downtime?

**A: Not with the current setup (single server).**

For zero-downtime deployments, you need:
- Load balancer
- Multiple instances
- Blue-green deployment
- Or Docker Swarm / Kubernetes

**For now:**
- Downtime: 2-5 minutes during update
- Schedule updates during low-traffic hours
- Notify users in advance

---

## Additional Resources

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[DEPLOY_AWS_EC2.md](DEPLOY_AWS_EC2.md)** - AWS EC2 specific guide
- **[DEPLOYMENT_REVIEW.md](DEPLOYMENT_REVIEW.md)** - Security analysis
- **[DEPLOYMENT_IMPROVEMENTS.md](DEPLOYMENT_IMPROVEMENTS.md)** - Fixes applied
- **[QUICK_START.md](QUICK_START.md)** - Quick commands reference

---

**Have more questions?** Check the documentation or create an issue in the repository.

**Last Updated**: 2025-01-06
