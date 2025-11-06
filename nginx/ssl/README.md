# SSL Certificate Setup

This directory contains SSL certificates for HTTPS configuration.

## Option 1: Let's Encrypt (Recommended for Production)

Use Certbot to obtain free SSL certificates:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Obtain certificate (replace yourdomain.com with your actual domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to this directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./privkey.pem

# Set proper permissions
sudo chmod 644 fullchain.pem
sudo chmod 600 privkey.pem
```

## Option 2: Self-Signed Certificate (Development/Testing Only)

For testing purposes, generate a self-signed certificate:

```bash
# Generate self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set proper permissions
chmod 644 fullchain.pem
chmod 600 privkey.pem
```

**Warning**: Self-signed certificates will show security warnings in browsers. Only use for development.

## Option 3: Commercial Certificate

If you purchased a commercial SSL certificate:

1. Place the full chain certificate in `fullchain.pem`
2. Place the private key in `privkey.pem`
3. Ensure proper permissions:
   ```bash
   chmod 644 fullchain.pem
   chmod 600 privkey.pem
   ```

## Certificate Renewal

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Set up automatic renewal (cron job)
sudo crontab -e

# Add this line to renew certificates twice daily
0 0,12 * * * certbot renew --quiet --post-hook "docker-compose -f /path/to/docker-compose.prod.yml restart nginx"
```

## Verify Certificate

After setup, verify your SSL configuration:

```bash
# Check certificate details
openssl x509 -in fullchain.pem -text -noout

# Test SSL configuration (requires site to be running)
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

## Security Best Practices

1. **Never commit certificates to Git**: Add `*.pem` to `.gitignore`
2. **Restrict permissions**: Private key should be 600, certificate 644
3. **Monitor expiration**: Set up alerts 30 days before expiry
4. **Use strong key size**: Minimum 2048-bit RSA or 256-bit ECDSA
5. **Enable HSTS**: Already configured in nginx.conf
6. **Test your SSL**: Use https://www.ssllabs.com/ssltest/

## Troubleshooting

### Certificate file not found
```
Error: cannot load certificate "/etc/nginx/ssl/fullchain.pem"
```
**Solution**: Ensure certificate files exist in this directory and have correct names.

### Permission denied
```
Error: BIO_new_file("/etc/nginx/ssl/privkey.pem") failed
```
**Solution**: Check file permissions with `ls -la` and fix with `chmod 600 privkey.pem`.

### Certificate expired
```
Error: certificate has expired
```
**Solution**: Renew certificate using `certbot renew` and restart nginx.
