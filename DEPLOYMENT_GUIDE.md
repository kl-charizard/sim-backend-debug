# 🚀 Google Cloud VM + Cloudflare Deployment Guide

This guide will walk you through deploying your Sound by Sound Slowly API service to Google Cloud VM and configuring Cloudflare.

## 📋 Prerequisites

- Google Cloud account with billing enabled
- Cloudflare account
- Domain name (soundbysoundslowly.com)
- Basic knowledge of terminal/command line

## Part 1: Google Cloud VM Setup

### Step 1: Create a VM Instance

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project or create a new one

2. **Create VM Instance**
   - Go to **Compute Engine** → **VM instances**
   - Click **"Create Instance"**

3. **Configure VM Settings**
   ```
   Name: sound-by-sound-api
   Region: us-central1 (or closest to your users)
   Zone: us-central1-a
   Machine type: e2-micro (free tier) or e2-small
   Boot disk: Ubuntu 22.04 LTS
   Firewall: Allow HTTP and HTTPS traffic
   ```

4. **Advanced Settings**
   - Go to **Networking** tab
   - Add network tags: `http-server`, `https-server`
   - Click **"Create"**

### Step 2: Configure Firewall Rules

1. **Go to VPC Network** → **Firewall**
2. **Create Firewall Rule**
   ```
   Name: allow-http-https
   Direction: Ingress
   Action: Allow
   Targets: Specified target tags
   Target tags: http-server, https-server
   Source IP ranges: 0.0.0.0/0
   Protocols and ports: TCP, Ports: 80, 443, 11434
   ```

### Step 3: Connect to Your VM

1. **SSH into VM**
   - Click the SSH button next to your VM instance
   - Or use gcloud CLI: `gcloud compute ssh sound-by-sound-api --zone=us-central1-a`

2. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## Part 2: Install Dependencies

### Step 1: Install Node.js

```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Install PM2 startup script
sudo pm2 startup
```

### Step 3: Install Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Part 3: Deploy Your Application

### Step 1: Upload Your Code

1. **Clone from GitHub**
   ```bash
   # Install Git
   sudo apt install git -y
   
   # Clone your repository
   git clone https://github.com/kl-charizard/ssm-web-debug.git
   cd ssm-web-debug/api-service
   ```

2. **Install Dependencies**
   ```bash
   npm install --production
   ```

### Step 2: Configure Environment

```bash
# Create environment file
nano .env
```

Add this content:
```env
NODE_ENV=production
PORT=11434
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://soundbysoundslowly.com,https://www.soundbysoundslowly.com
LOG_LEVEL=info
REQUIRE_API_KEY=true
```

### Step 3: Start with PM2

```bash
# Start the application
pm2 start server.js --name "sound-by-sound-api"

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs sound-by-sound-api
```

## Part 4: Configure Nginx

### Step 1: Create Nginx Configuration

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/sound-by-sound-api
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name api.soundbysoundslowly.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:11434;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:11434/health;
        access_log off;
    }

    # Admin interface
    location /admin {
        proxy_pass http://localhost:11434/admin;
    }
}
```

### Step 2: Enable the Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sound-by-sound-api /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Part 5: SSL Certificate with Let's Encrypt

### Step 1: Install Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Get SSL Certificate

```bash
# Get certificate (replace with your email)
sudo certbot --nginx -d api.soundbysoundslowly.com --email your-email@example.com --agree-tos --non-interactive

# Test auto-renewal
sudo certbot renew --dry-run
```

## Part 6: Cloudflare Configuration

### Step 1: Add Domain to Cloudflare

1. **Login to Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com/
   - Click **"Add a Site"**
   - Enter: `soundbysoundslowly.com`
   - Choose plan (Free is fine)

2. **Update Nameservers**
   - Copy the nameservers provided by Cloudflare
   - Update them in your domain registrar

### Step 2: Configure DNS Records

1. **Add A Record for API Subdomain**
   ```
   Type: A
   Name: api
   Content: [Your VM's External IP]
   Proxy status: Proxied (orange cloud)
   TTL: Auto
   ```

2. **Add CNAME for www (if not already done)**
   ```
   Type: CNAME
   Name: www
   Content: soundbysoundslowly.com
   Proxy status: Proxied
   ```

### Step 3: Configure SSL/TLS

1. **Go to SSL/TLS** → **Overview**
2. **Set encryption mode to "Full (strict)"**
3. **Go to Edge Certificates**
4. **Enable "Always Use HTTPS"**

### Step 4: Configure Page Rules

1. **Go to Rules** → **Page Rules**
2. **Create Page Rule**
   ```
   URL: api.soundbysoundslowly.com/*
   Settings:
   - Always Use HTTPS: On
   - Cache Level: Bypass
   - Browser Cache TTL: 4 hours
   ```

### Step 5: Configure Security

1. **Go to Security** → **Settings**
2. **Security Level: Medium**
3. **Enable Bot Fight Mode**
4. **Go to WAF** → **Custom Rules**
5. **Create rule to protect admin endpoint**

## Part 7: Monitoring and Maintenance

### Step 1: Set Up Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Monitor your application
pm2 monit
```

### Step 2: Set Up Log Rotation

```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Step 3: Backup Script

Create a backup script:
```bash
# Create backup script
nano ~/backup-api.sh
```

```bash
#!/bin/bash
# Backup script for API service
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/backups"
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/api-service-$DATE.tar.gz /home/sound-by-sound-api/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "api-service-*.tar.gz" -mtime +7 -delete

echo "Backup completed: api-service-$DATE.tar.gz"
```

```bash
# Make executable
chmod +x ~/backup-api.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
# 0 2 * * * /home/backup-api.sh
```

## Part 8: Testing Your Deployment

### Step 1: Test API Endpoints

```bash
# Test health check
curl https://api.soundbysoundslowly.com/health

# Test admin interface
curl https://api.soundbysoundslowly.com/admin

# Test API key generation
curl -X POST https://api.soundbysoundslowly.com/admin/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "Test App",
    "developer": "Test Developer",
    "email": "test@example.com",
    "purpose": "Testing",
    "rateLimit": 100,
    "expiry": 30
  }'
```

### Step 2: Test OpenAI Compatibility

```bash
# Test chat completions (replace with your API key)
curl -X POST https://api.soundbysoundslowly.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_generated_api_key" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Hello, test message"
      }
    ],
    "max_tokens": 50
  }'
```

## 🎉 You're Done!

Your API service is now:
- ✅ Running on Google Cloud VM
- ✅ Protected by Cloudflare
- ✅ SSL secured
- ✅ Rate limited
- ✅ Monitored with PM2
- ✅ Backed up automatically

## 🔧 Troubleshooting

### Common Issues:

1. **502 Bad Gateway**
   - Check if PM2 is running: `pm2 status`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

2. **SSL Issues**
   - Verify DNS propagation
   - Check Cloudflare SSL settings
   - Ensure Let's Encrypt certificate is valid

3. **API Key Issues**
   - Check if API key is generated correctly
   - Verify headers are being sent properly
   - Check server logs: `pm2 logs sound-by-sound-api`

### Useful Commands:

```bash
# Restart services
sudo systemctl restart nginx
pm2 restart sound-by-sound-api

# Check logs
pm2 logs sound-by-sound-api --lines 100
sudo tail -f /var/log/nginx/access.log

# Check status
pm2 status
sudo systemctl status nginx
```

## 📞 Support

If you encounter issues:
1. Check the logs first
2. Verify all configurations
3. Test each component individually
4. Check Cloudflare and Google Cloud status pages

Your API hub is now ready to serve requests at `https://api.soundbysoundslowly.com`! 🚀
