#!/bin/bash

# Sound by Sound Slowly API Service - VM Setup Script
# Run this script on your Google Cloud VM after connecting via SSH

set -e

echo "🚀 Setting up Sound by Sound Slowly API Service on Google Cloud VM..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
print_status "Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
print_status "Node.js installed: $NODE_VERSION"

# Install PM2
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo apt install nginx -y

# Install Git
print_status "Installing Git..."
sudo apt install git -y

# Install additional tools
print_status "Installing monitoring tools..."
sudo apt install htop iotop nethogs curl wget unzip -y

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /opt/sound-by-sound-api
sudo chown $USER:$USER /opt/sound-by-sound-api
cd /opt/sound-by-sound-api

# Clone repository (you'll need to update this URL)
print_status "Cloning repository..."
if [ ! -d "ssm-web-debug" ]; then
    git clone https://github.com/kl-charizard/ssm-web-debug.git
fi

cd ssm-web-debug/api-service

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install --production

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=11434
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://soundbysoundslowly.com,https://www.soundbysoundslowly.com
LOG_LEVEL=info
REQUIRE_API_KEY=true
EOF

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sound-by-sound-api',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 11434
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Create Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/sound-by-sound-api > /dev/null << 'EOF'
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
EOF

# Enable the site
print_status "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/sound-by-sound-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Start and enable Nginx
print_status "Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl reload nginx

# Install Certbot for SSL
print_status "Installing Certbot for SSL certificates..."
sudo apt install certbot python3-certbot-nginx -y

# Create firewall rules
print_status "Configuring firewall rules..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 11434
sudo ufw --force enable

# Create backup script
print_status "Creating backup script..."
cat > /home/backup-api.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/backups"
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/api-service-$DATE.tar.gz /opt/sound-by-sound-api/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "api-service-*.tar.gz" -mtime +7 -delete

echo "Backup completed: api-service-$DATE.tar.gz"
EOF

chmod +x /home/backup-api.sh

# Setup log rotation
print_status "Setting up log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Display status
print_status "Setup completed! Here's the status:"
echo ""
echo "📊 Service Status:"
pm2 status
echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "🔧 Next Steps:"
echo "1. Get your VM's external IP: curl -4 icanhazip.com"
echo "2. Point api.soundbysoundslowly.com to this IP in Cloudflare"
echo "3. Get SSL certificate: sudo certbot --nginx -d api.soundbysoundslowly.com"
echo "4. Test your API: curl http://$(curl -4 icanhazip.com)/health"
echo ""
echo "📁 Application directory: /opt/sound-by-sound-api/ssm-web-debug/api-service"
echo "📝 Logs: pm2 logs sound-by-sound-api"
echo "🔄 Restart: pm2 restart sound-by-sound-api"
echo ""

# Get external IP
EXTERNAL_IP=$(curl -4 icanhazip.com 2>/dev/null || echo "Unable to get external IP")
print_status "Your VM's external IP: $EXTERNAL_IP"
print_warning "Make sure to configure this IP in Cloudflare DNS settings!"

echo ""
print_status "🎉 Setup completed successfully!"
print_warning "Don't forget to:"
echo "1. Configure DNS in Cloudflare"
echo "2. Get SSL certificate with Certbot"
echo "3. Test your API endpoints"
