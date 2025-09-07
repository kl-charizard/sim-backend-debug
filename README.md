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

#### One-by-one steps (copy-paste)

1. Update packages and install basics
```bash
sudo apt-get update && sudo apt-get install -y git curl nginx ca-certificates lsb-release
```

2. Install Node.js 20 (NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

3. Install Certbot (choose one)
- Debian 12 / Ubuntu:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```
- Debian 11 (snap):
```bash
sudo apt-get install -y snapd
sudo snap install core && sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

4. Clone the repo
```bash
cd ~
git clone https://github.com/kl-charizard/sim-backend-debug.git
cd sim-backend-debug
```

5. Create env file
```bash
cp env.example .env
```

6. Edit env values
```bash
nano .env
```
- Set a strong `ADMIN_API_KEY` (generate: `openssl rand -hex 32`)
- Set `OPENROUTER_API_KEY`, `OPENROUTER_REFERER`
- Optionally set `CORS_ORIGIN` to your app origins (or `*`)
- Save and exit (Ctrl+O, Enter, Ctrl+X)

7. Install dependencies and init DB
```bash
npm install
npm run migrate
```

8. Start the app with PM2 (auto-restart)
```bash
sudo npm i -g pm2
pm2 start src/index.js --name cloud-proxy
pm2 save
pm2 startup systemd -u $USER --hp $HOME
# run the command PM2 prints
```

9. Configure Nginx (replace `api.example.com` with your domain)
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
sudo ln -s /etc/nginx/sites-available/cloud-proxy /etc/nginx/sites-enabled/cloud-proxy
sudo nginx -t && sudo systemctl restart nginx
```

10. Point DNS for your domain
- Create an A record for `api.example.com` → your server’s public IP
- Wait for DNS to propagate (can take minutes)

11. Get SSL certificate (HTTPS)
```bash
sudo certbot --nginx -d api.example.com --redirect -m you@example.com --agree-tos -n
```

12. Smoke test
```bash
curl -s https://api.example.com/health
```

13. Issue a user key
```bash
curl -s -X POST https://api.example.com/admin/keys \
  -H 'x-admin-key: REPLACE_WITH_ADMIN_KEY' \
  -H 'content-type: application/json' \
  -d '{"rateLimitPerMin":60}'
```

14. Call OpenRouter via your proxy
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

15. Update later
```bash
cd ~/sim-backend-debug
git pull
npm ci || npm install
npm run migrate
pm2 restart cloud-proxy
```

Notes:
- If using systemd instead of PM2, see the systemd section above.
- Set `CORS_ORIGIN` to your production app origins.
- Keep `.env` private and back up `data/db.sqlite` if needed.
