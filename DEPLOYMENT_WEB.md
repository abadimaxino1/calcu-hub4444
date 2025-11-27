# Calcu-Hub Web Deployment Guide

This document explains how to deploy Calcu-Hub as a production web application.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- A server (VPS, cloud instance, or managed platform)
- Domain name with SSL certificate
- SQLite or PostgreSQL database

## Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create a `.env` file with production values:

```env
# Server
PORT=4000
NODE_ENV=production
BASE_URL=https://yourdomain.com

# Database
DATABASE_URL="file:./prod.db"

# Session Secret (generate a strong random string)
SESSION_SECRET=your-strong-secret-here-32-chars-min

# Optional: Analytics & Ads
VITE_GA_ID=G-XXXXXXXXXX
VITE_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXX

# Optional: Site URL for sitemap
SITE_URL=https://yourdomain.com
```

### 3. Build Frontend

```bash
npm run build
```

This creates optimized production files in the `dist/` folder.

### 4. Initialize Database

```bash
# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
node scripts/seed-db-direct.cjs
```

### 5. Start Production Server

```bash
NODE_ENV=production node server/index.cjs
```

Or use a process manager like PM2:

```bash
pm2 start server/index.cjs --name calcu-hub
```

---

## Nginx Configuration

Here's an example Nginx configuration for production:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # HSTS (optional but recommended)
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml;
    
    # Root for static files
    root /var/www/calcu-hub/dist;
    index index.html;
    
    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
    
    # Static assets with caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /icons/ {
        expires 1y;
        add_header Cache-Control "public";
    }
    
    location /images/ {
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # Service worker - no caching
    location /sw.js {
        add_header Cache-Control "no-cache";
    }
    
    location /service-worker.js {
        add_header Cache-Control "no-cache";
    }
    
    # Manifest
    location /manifest.webmanifest {
        add_header Content-Type application/manifest+json;
        expires 1d;
    }
    
    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### Install Let's Encrypt SSL

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Alternative: Node.js Static Server

If you prefer not to use Nginx, the backend can serve static files:

```javascript
// In server/index.cjs, ensure this is present for production:
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}
```

---

## Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "server/index.cjs"]
```

Build and run:

```bash
docker build -t calcu-hub .
docker run -d -p 4000:4000 --env-file .env calcu-hub
```

---

## Post-Deployment Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Admin user created with secure password
- [ ] Firewall configured (only 80/443 open)
- [ ] Backup strategy in place
- [ ] Monitoring/logging configured
- [ ] CDN configured (optional but recommended)

---

## Monitoring & Maintenance

### Logs

```bash
# PM2 logs
pm2 logs calcu-hub

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Backup

```bash
# SQLite backup
cp /var/www/calcu-hub/dev.db /backups/calcu-hub-$(date +%Y%m%d).db
```

### SSL Renewal

Let's Encrypt certificates auto-renew, but verify:

```bash
sudo certbot renew --dry-run
```

---

## Security Notes

1. **Change default admin password** immediately after deployment
2. **Enable HTTPS** - Never run production without SSL
3. **Set strong SESSION_SECRET** - At least 32 random characters
4. **Configure firewall** - Only expose ports 80 and 443
5. **Regular updates** - Keep Node.js and npm packages updated
6. **Database backups** - Schedule regular automated backups

---

## Support

For issues or questions, check:
- GitHub Issues
- Documentation in `/docs` folder
- Admin panel at `/admin` (requires authentication)
