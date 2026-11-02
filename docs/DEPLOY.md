# DEPLOY.md — Hostinger Deploy Guide

> Production pe ConfoStudy live karna.
>
> **Pehle:** `LOCAL_TESTING.md` se local test pass karo.
>
> **Last updated:** Aug 2026

---

## Pre-deploy checklist

```bash
php artisan app:sync-real-faculty   # teachers + Super Admin name-login accounts
npm run build                       # must pass — login UI / SPA assets
php artisan test                    # if tests exist
```

**Login UI change** (Email / Name / Mobile) → hamesha `npm run build` + `public/build` upload.

**Mobile APK:** is web login update ke liye **rebuild mat karo**. Purane APK ke Email field mein name ya email chalega (API live pe name login support kare).

Local test: `LOCAL_TESTING.md` → Step 6 (production build test)

---

## Server requirements

- PHP 8.2+ (extensions: mbstring, openssl, pdo_mysql, tokenizer, xml, ctype, json, bcmath, fileinfo)
- MySQL 8
- Composer 2
- Node 18+ (sirf build ke liye — server pe optional)

---

## Upload files

```
/public          → document root (Hostinger: public_html ya subdomain folder)
Baqi sab         → public_html ke UPAR (Laravel root)
```

> **Important:** Hostinger pe `public/` folder ko document root banao, ya `.htaccess` se redirect.

---

## Production `.env`

```env
APP_NAME=ConfoStudy
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=your_db
DB_USERNAME=your_user
DB_PASSWORD=your_pass

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=your_mail_pass
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your@email.com
```

---

## Server commands (SSH)

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate          # pehli dafa only
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend (local ya server pe)
npm ci && npm run build
```

---

## Apache `.htaccess` (SPA fallback — `public/.htaccess` me add)

```apache
# React SPA — /app/* routes Laravel ko do
RewriteCond %{REQUEST_URI} ^/app
RewriteRule ^ index.php [L]
```

---

## Permissions

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

## Post-deploy verify

- [ ] `https://yourdomain.com/app/login` — page load
- [ ] Login → dashboard (no 404 on refresh)
- [ ] API: `https://yourdomain.com/api/v1/login` — JSON response
- [ ] Form save → DB me data
- [ ] `APP_DEBUG=false` — errors hide ho

---

## AI ko deploy ke liye dena

```
READ: docs/DEPLOY.md + docs/LOCAL_TESTING.md
TASK: Hostinger pe deploy karna hai — step by step help karo
Domain: [your domain]
```

---

*ConfoStudy · DEPLOY.md · Aug 2026*
