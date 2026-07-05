# Production Deployment Guide

This document describes how the CampusChain system is deployed, maintained, and restarted in the production environment.

---

## 1. Hosting Services

* **Frontend**: Netlify (Continuous Deployment)
  * Serves HTML, CSS, JavaScript, and asset files.
  * Wire config targets API requests to: `https://campuschain.online`
* **Backend REST API**: AWS EC2 (Express.js runtime environment)
* **Database**: TiDB Cloud (Serverless MySQL)

---

## 2. Server Configuration (AWS EC2)

### Process Manager (PM2)
The backend Node.js application process is kept alive and supervised by **PM2**.
* **Startup/Restart Service**:
  ```bash
  pm2 restart server
  ```
* **Check Logs**:
  ```bash
  pm2 logs server
  ```
* **Verify Status**:
  ```bash
  pm2 status
  ```

### Reverse Proxy (Nginx)
Nginx acts as a reverse proxy on port `80` / `443` and forwards traffic to the Express.js application listening locally (default port `5000`).
* **Nginx Configuration Path**: `/etc/nginx/sites-available/default`
* **Configuration Snippet**:
  ```nginx
  server {
      server_name campuschain.online;

      location / {
          proxy_pass http://localhost:5000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
      }
  }
  ```
* **Nginx Operations**:
  ```bash
  sudo nginx -t             # Test Configuration
  sudo systemctl restart nginx  # Restart Nginx
  ```

### SSL Certificates (Let's Encrypt)
Certificates are managed automatically via Certbot.
* **Renewal**:
  ```bash
  sudo certbot renew --dry-run
  ```
