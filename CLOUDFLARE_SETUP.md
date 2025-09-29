# ☁️ Cloudflare Configuration Guide

This guide will help you configure Cloudflare for your Sound by Sound Slowly API service.

## 📋 Prerequisites

- Cloudflare account (free tier is sufficient)
- Domain name: `soundbysoundslowly.com`
- Google Cloud VM with external IP
- API service running on port 11434

## Step 1: Add Domain to Cloudflare

### 1.1 Login to Cloudflare
- Go to: https://dash.cloudflare.com/
- Click **"Add a Site"**
- Enter your domain: `soundbysoundslowly.com`
- Choose the **Free** plan (sufficient for most use cases)

### 1.2 Update Nameservers
1. Cloudflare will provide you with 2 nameservers
2. Go to your domain registrar (where you bought the domain)
3. Update the nameservers to the ones provided by Cloudflare
4. Wait for DNS propagation (can take up to 24 hours, usually much faster)

## Step 2: Configure DNS Records

### 2.1 Main Domain (A Record)
```
Type: A
Name: @
Content: [Your VM's External IP]
Proxy status: Proxied (orange cloud)
TTL: Auto
```

### 2.2 WWW Subdomain (CNAME)
```
Type: CNAME
Name: www
Content: soundbysoundslowly.com
Proxy status: Proxied (orange cloud)
TTL: Auto
```

### 2.3 API Subdomain (A Record)
```
Type: A
Name: api
Content: [Your VM's External IP]
Proxy status: Proxied (orange cloud)
TTL: Auto
```

### 2.4 Optional: Admin Subdomain (A Record)
```
Type: A
Name: admin
Content: [Your VM's External IP]
Proxy status: Proxied (orange cloud)
TTL: Auto
```

## Step 3: SSL/TLS Configuration

### 3.1 SSL/TLS Overview
1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **"Full (strict)"**
3. This ensures end-to-end encryption

### 3.2 Edge Certificates
1. Go to **SSL/TLS** → **Edge Certificates**
2. Enable **"Always Use HTTPS"**
3. Enable **"HTTP Strict Transport Security (HSTS)"**
4. Set HSTS Max Age to **6 months**
5. Enable **"Minimum TLS Version"** → Set to **TLS 1.2**

### 3.3 Origin Server
1. Go to **SSL/TLS** → **Origin Server**
2. Create **Origin Certificate**:
   - Hostnames: `api.soundbysoundslowly.com`
   - Certificate Validity: **15 years**
   - Key type: **RSA (2048)**
3. Download the certificate and private key
4. Install on your VM (see VM setup guide)

## Step 4: Page Rules Configuration

### 4.1 API Subdomain Rule
1. Go to **Rules** → **Page Rules**
2. Create new rule:
   ```
   URL: api.soundbysoundslowly.com/*
   Settings:
   - Always Use HTTPS: On
   - Cache Level: Bypass
   - Browser Cache TTL: 4 hours
   - Security Level: Medium
   ```

### 4.2 Admin Interface Rule
1. Create another rule:
   ```
   URL: api.soundbysoundslowly.com/admin*
   Settings:
   - Always Use HTTPS: On
   - Cache Level: Bypass
   - Security Level: High
   - Disable Apps: On
   ```

## Step 5: Security Configuration

### 5.1 Security Settings
1. Go to **Security** → **Settings**
2. Security Level: **Medium**
3. Challenge Passage: **30 minutes**
4. Browser Integrity Check: **On**

### 5.2 Bot Fight Mode
1. Go to **Security** → **Bots**
2. Enable **"Bot Fight Mode"**
3. This helps protect against automated attacks

### 5.3 WAF (Web Application Firewall)
1. Go to **Security** → **WAF**
2. Enable **"Web Application Firewall"**
3. Create custom rules for your API:

#### Rule 1: Protect Admin Endpoint
```
Rule name: Protect Admin Interface
Expression: (http.host eq "api.soundbysoundslowly.com" and http.request.uri.path contains "/admin")
Action: Block
```

#### Rule 2: Rate Limiting for API
```
Rule name: API Rate Limiting
Expression: (http.host eq "api.soundbyslowly.com" and http.request.uri.path contains "/v1/")
Action: Challenge
Rate: 100 requests per minute
```

## Step 6: Caching Configuration

### 6.1 Caching Rules
1. Go to **Caching** → **Configuration**
2. Caching Level: **Standard**
3. Browser Cache TTL: **4 hours**

### 6.2 Page Rules for Caching
1. Go to **Rules** → **Page Rules**
2. Create rule for static assets:
   ```
   URL: api.soundbysoundslowly.com/*.css
   Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 month
   ```

## Step 7: Analytics and Monitoring

### 7.1 Web Analytics
1. Go to **Analytics** → **Web Analytics**
2. Enable analytics for your domain
3. This helps track traffic and performance

### 7.2 Security Events
1. Go to **Security** → **Events**
2. Monitor security events and attacks
3. Set up alerts for suspicious activity

## Step 8: Performance Optimization

### 8.1 Speed Settings
1. Go to **Speed** → **Optimization**
2. Enable **"Auto Minify"** for:
   - HTML: On
   - CSS: On
   - JavaScript: On
3. Enable **"Brotli"** compression

### 8.2 Network Settings
1. Go to **Speed** → **Network**
2. Enable **"HTTP/2"**
3. Enable **"HTTP/3 (with QUIC)"**
4. Enable **"0-RTT Connection Resumption"**

## Step 9: Advanced Features

### 9.1 Workers (Optional)
If you want to add custom logic:
1. Go to **Workers & Pages**
2. Create a new Worker
3. Add custom headers or request modification

### 9.2 Load Balancing (Optional)
For high traffic:
1. Go to **Traffic** → **Load Balancing**
2. Create a load balancer
3. Add multiple origin servers

## Step 10: Testing Your Configuration

### 10.1 Test DNS Resolution
```bash
# Test DNS resolution
nslookup api.soundbysoundslowly.com
dig api.soundbysoundslowly.com
```

### 10.2 Test SSL Certificate
```bash
# Test SSL certificate
curl -I https://api.soundbysoundslowly.com/health
openssl s_client -connect api.soundbysoundslowly.com:443 -servername api.soundbysoundslowly.com
```

### 10.3 Test API Endpoints
```bash
# Test health check
curl https://api.soundbysoundslowly.com/health

# Test admin interface
curl https://api.soundbysoundslowly.com/admin

# Test API with key
curl -X POST https://api.soundbysoundslowly.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'
```

## Step 11: Monitoring and Alerts

### 11.1 Uptime Monitoring
1. Go to **Analytics** → **Web Analytics**
2. Set up uptime monitoring
3. Configure alerts for downtime

### 11.2 Security Monitoring
1. Go to **Security** → **Events**
2. Monitor blocked requests
3. Set up alerts for high attack volumes

## 🔧 Troubleshooting

### Common Issues:

1. **502 Bad Gateway**
   - Check if your VM is running
   - Verify Nginx configuration
   - Check PM2 status

2. **SSL Certificate Issues**
   - Ensure DNS is properly configured
   - Check Cloudflare SSL settings
   - Verify origin certificate

3. **API Not Responding**
   - Check firewall rules
   - Verify port 11434 is open
   - Check application logs

4. **Slow Performance**
   - Check Cloudflare caching settings
   - Verify origin server performance
   - Check for rate limiting

### Useful Commands:

```bash
# Check DNS propagation
dig @8.8.8.8 api.soundbysoundslowly.com

# Test SSL
curl -vI https://api.soundbysoundslowly.com

# Check Cloudflare status
curl -H "CF-Connecting-IP: 1.1.1.1" https://api.soundbysoundslowly.com/health
```

## 📊 Performance Monitoring

### Key Metrics to Monitor:
- Response time
- Error rate
- Bandwidth usage
- Cache hit ratio
- Security events

### Cloudflare Analytics:
- Go to **Analytics** → **Web Analytics**
- Monitor traffic patterns
- Check performance metrics
- Review security events

## 🎉 You're Done!

Your API service is now:
- ✅ Protected by Cloudflare
- ✅ SSL secured
- ✅ Rate limited
- ✅ Cached for performance
- ✅ Monitored for security

Your API will be available at:
- **API Base URL:** `https://api.soundbysoundslowly.com/v1`
- **Admin Interface:** `https://api.soundbysoundslowly.com/admin`
- **Health Check:** `https://api.soundbysoundslowly.com/health`

## 📞 Support

If you encounter issues:
1. Check Cloudflare status: https://www.cloudflarestatus.com/
2. Review your DNS settings
3. Check your VM status
4. Review Cloudflare analytics

Your API hub is now ready to serve requests with enterprise-grade security and performance! 🚀
