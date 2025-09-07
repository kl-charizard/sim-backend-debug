## Cloud Proxy Service

Minimal Node.js service to issue per-user keys and proxy to providers:
- OpenRouter (LLM chat)
- iFlytek (e.g., TTS)
- FaceFusion (face swap)

Keys are stored in SQLite with per-key rate limiting.

### Prereqs
- Node 20+

### Setup (local/dev)
1. Create env file
```bash
cp env.example .env
```
2. Install deps
```bash
npm install
```
3. Init DB
```bash
npm run migrate
```
4. Start
```bash
npm run start
```

### API
- GET `/health`

Admin
- POST `/admin/keys`
  - Header: `x-admin-key: <ADMIN_API_KEY>`
  - Body: `{ "rateLimitPerMin": 60 }` (optional)
  - Returns: `{ key, rateLimitPerMin, status }`

Auth
- All `/v1/**` require `x-api-key: <issued key>`

OpenRouter
- POST `/v1/openrouter/chat/completions` → passthrough of OpenRouter request/response; supports `stream`

iFlytek (example TTS)
- POST `/v1/iflytek/tts` `{ text, voice?, format? }` → audio bytes

FaceFusion
- POST `/v1/facefusion/swap` `{ targetImageUrl, sourceFaceUrl }`

### Production deployment (Ubuntu/Debian)

#### 1) Prepare the server
- OS: Ubuntu 22.04+ or Debian 12 (bookworm). For Debian 11, see Certbot note below.
- Open firewall for HTTP/HTTPS (if using UFW):
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```
- Install Node.js 20 (NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

#### 2) Clone and configure
```bash
cd ~
git clone https://github.com/kl-charizard/sim-backend-debug.git
cd sim-backend-debug
cp env.example .env
nano .env
```
- Set `ADMIN_API_KEY` to a strong secret (you can generate one: `openssl rand -hex 32`)
- Set provider credentials (`OPENROUTER_API_KEY`, `OPENROUTER_REFERER`, etc.)
- Set `CORS_ORIGIN` to your allowed origins (comma-separated) or `*` for any

Install and init DB:
```bash
npm ci || npm install
npm run migrate
```

#### 3A) Run with PM2 (recommended for Node)
```bash
sudo npm i -g pm2
pm2 start src/index.js --name cloud-proxy
pm2 save
pm2 startup systemd -u $USER --hp $HOME
# run the command PM2 prints to enable at boot
```
Useful PM2 commands:
```bash
pm2 status
pm2 logs cloud-proxy --lines 200
pm2 restart cloud-proxy
pm2 stop cloud-proxy
```

#### 3B) Or run with systemd
Create service file (adjust username/home path if not `ubuntu`):
```bash
sudo tee /etc/systemd/system/cloud-proxy.service >/dev/null <<'UNIT'
[Unit]
Description=Cloud Proxy Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/ubuntu/sim-backend-debug
ExecStart=/usr/bin/node src/index.js
Environment=NODE_ENV=production
# Load env file
EnvironmentFile=/home/ubuntu/sim-backend-debug/.env
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
```
Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cloud-proxy
sudo systemctl start cloud-proxy
sudo systemctl status cloud-proxy
journalctl -u cloud-proxy -f
```

#### 4) Reverse proxy with Nginx + SSL
Install Nginx and Certbot:
```bash
sudo apt-get update && sudo apt-get install -y nginx
# Debian 12/Ubuntu: apt certbot package
sudo apt-get install -y certbot python3-certbot-nginx
```
Debian 11 (bullseye) Certbot via snap (if apt package not available):
```bash
sudo apt-get install -y snapd
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```
Create site config (replace `api.example.com`):
```bash
sudo tee /etc/nginx/sites-available/cloud-proxy >/dev/null <<'NGINX'
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:8080;
        proxy_read_timeout 300s;
    }
}
NGINX
```
Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/cloud-proxy /etc/nginx/sites-enabled/cloud-proxy
sudo nginx -t && sudo systemctl restart nginx
```
Get SSL certificate:
```bash
sudo certbot --nginx -d api.example.com --redirect -m you@example.com --agree-tos -n
```

#### 5) Smoke test and usage
Health check:
```bash
curl -s https://api.example.com/health
```
Issue a user key:
```bash
curl -s -X POST https://api.example.com/admin/keys \
  -H 'x-admin-key: REPLACE_WITH_ADMIN_KEY' \
  -H 'content-type: application/json' \
  -d '{"rateLimitPerMin":60}'
```
Call OpenRouter via proxy using the issued key:
```bash
curl -s https://api.example.com/v1/openrouter/chat/completions \
  -H 'x-api-key: REPLACE_WITH_USER_KEY' \
  -H 'content-type: application/json' \
  -d '{
    "model":"openrouter/auto",
    "messages":[{"role":"user","content":"Hello!"}],
    "temperature":0.7
  }'
```

#### 6) Updating to a new version
```bash
cd ~/sim-backend-debug
git pull
npm ci || npm install
npm run migrate
# If using PM2
pm2 restart cloud-proxy
# If using systemd
sudo systemctl restart cloud-proxy
```

### Security tips
- Set `CORS_ORIGIN` to your actual app origins in production
- Keep the service behind HTTPS (Nginx + Certbot)
- Rotate `ADMIN_API_KEY` and issued user keys when needed
- Adjust `DEFAULT_RATE_LIMIT_PER_MIN` per plan tier or use per-key custom limits
