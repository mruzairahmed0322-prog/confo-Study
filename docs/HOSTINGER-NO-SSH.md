# Hostinger — Bina SSH / VPS (Sirf File Manager)

> Tumhare paas **SSH nahi** — koi baat nahi. Hostinger **Business** plan pe File Manager + phpMyAdmin se sab ho sakta hai.

---

## 404 kyun aa raha hai?

`https://admin.confostudy.com/api/v1/public/home` pe **404** = ya to **purana code** hai, ya **CMS tables** database mein nahi (migrate nahi hua).

Admin login chal raha hai = MySQL + Laravel theek hain. Sirf **naya code upload** + **database tables** chahiye.

---

## Step 1 — Naya ZIP banao (apne PC pe)

```bat
cd C:\laragon\www
DEPLOY-HOSTINGER.bat
```

Nayi file: `C:\laragon\www\confostudy-deploy.zip` (aaj ki date wali)

---

## Step 2 — Hostinger File Manager (ZIP replace)

1. [hpanel.hostinger.com](https://hpanel.hostinger.com) → **admin.confostudy.com** → **File Manager**
2. **`confostudy`** folder kholo
3. Purani files **select all → Delete** (ya overwrite extract)
4. Naya **`confostudy-deploy.zip`** upload karo → **Extract**
5. **`.env` check karo** — agar ZIP ne overwrite ki to purani `.env` backup se wapas lagao (DB password wahi rehna chahiye)

**Mat chhedo:**
- `public_html/admin/index.php` — yahi Laravel boot karta hai

---

## Step 3 — Database update (SSH ke BINA)

### Option A — Browser script (asaan) ✅

1. PC se file copy karo:  
   `C:\laragon\www\scripts\hostinger-setup.php`
2. Hostinger pe upload karo:  
   **`public_html/admin/hostinger-setup.php`**
3. Browser kholo:
   ```
   https://admin.confostudy.com/hostinger-setup.php?key=ConfoStudy2026Setup
   ```
4. Screen pe "DONE" aur migrate success dikhe
5. Agar **CmsSeeder** pe sirf `500 Server Error` (HTML) aaye = **timeout** — alag script chalao (Step 3b)
6. **Turant delete karo** setup scripts (security)

### Step 3b — CMS seed alag (agar setup timeout ho)

1. Upload: `scripts/hostinger-cms-seed.php` → `public_html/admin/`
2. Browser:
   ```
   https://admin.confostudy.com/hostinger-cms-seed.php?key=ConfoStudy2026Setup
   ```
3. `Exit: 0` aur row counts dikhen

### Step 3c — Public API 500 fix

Agar login chal raha hai lekin `/api/v1/public/home` **500**:

1. Upload: `scripts/hostinger-clear-cache.php` → run:
   ```
   https://admin.confostudy.com/hostinger-clear-cache.php?key=ConfoStudy2026Setup
   ```
2. Upload: `scripts/hostinger-test-public-api.php` → run:
   ```
   https://admin.confostudy.com/hostinger-test-public-api.php?key=ConfoStudy2026Setup
   ```
3. Output mein `MISSING` files dikhen to **naya ZIP** dubara extract karo (`app/Services/CmsWebsiteService.php` etc.)
4. Phir `hostinger-cms-seed.php` chalao

### Option B — phpMyAdmin (agar script fail ho)

1. hPanel → **Databases** → **phpMyAdmin**
2. Database: `u815787663_confostudy` (ya jo `.env` mein hai)
3. **Import** tab → local se SQL import (agar hum SQL file dein)

---

## Step 4 — Test

Browser:
```
https://admin.confostudy.com/api/v1/public/home?school_id=1
```

- **Pehle:** `404 | NOT FOUND` ❌  
- **Baad mein:** JSON data (school, faculty, stats, faqs...) ✅

Phir login:
```
https://admin.confostudy.com/app/login
```
Sidebar → **Website CMS** dikhna chahiye.

---

## Step 5 — Mobile app (4 guest tabs)

| Tab | CMS mode (recommended) | WordPress mode |
|-----|------------------------|----------------|
| Home | Super Admin hero, stats, courses | WebView of confostudy.com |
| Courses | Super Admin programs / boards | Same CMS list (always API) |
| Explore | Events, services, news | WebView (scroll to sections) |
| More | Faculty, FAQ, contact | WebView (faculty section) |

**Ab default = CMS** — WordPress site down ho to bhi teachers/courses dikhen.

Website CMS → General → Guest home source = **CMS**.

### WordPress timeout / Domain: undefined
- `confostudy.com` reachable nahi → WebView `ERR_TIMED_OUT`
- Empty URL → Android shows `Domain: undefined`
- Fix: CMS mode + valid `wordpress_home_url` + latest APK (error UI + fallback)

### Live pe naya faculty / Super Admin
1. Deploy latest ZIP (`AuthController`, CMS seeders, `public/build`)
2. `hostinger-sync-faculty.php` chalao
3. Website CMS → Guest source = **CMS** → Save
4. Mobile: pull-to-refresh **ya** naya APK (`npm run build:apk`)

### APK rebuild?
- Is CMS/WordPress fix + Sir Ronald login demos ke liye: **haan, naya APK** install karo.
- Sirf web admin UI: `npm run build` + upload `build/` — APK nahi.

---

## Step 5b — Faculty + name-login accounts (live)

Local pe pehle:
```bash
php artisan app:sync-real-faculty
npm run build
```

Live (bina SSH):
1. Latest ZIP / PHP + `public/build` upload
2. Upload `scripts/hostinger-sync-faculty.php` → `public_html/admin/`
3. Browser: `https://admin.confostudy.com/hostinger-sync-faculty.php?key=ConfoStudy2026Setup`
4. Script **delete** karo

---

## Kya SSH ke bina NAHI ho sakta?

| Kaam | Bina SSH |
|------|----------|
| Code upload | ✅ File Manager |
| Database migrate | ✅ setup.php ya phpMyAdmin |
| CMS seed data | ✅ setup.php |
| Admin UI | ✅ |
| Public API | ✅ (step 1–3 ke baad) |
| YouTube cron (har 5 min) | ⚠️ hPanel → **Cron Jobs** (SSH nahi, lekin cron form hai) |
| `php artisan` daily | ⚠️ Cron se `schedule:run` |

Hostinger Business mein **Cron Jobs** hPanel mein hoti hain — SSH alag cheez hai.

**Cron add (optional, YouTube ke liye):**
- hPanel → Advanced → **Cron Jobs**
- Command: `php /home/u815787663/confostudy/artisan schedule:run`
- Every minute: `* * * * *`

(Path Hostinger support se confirm kar lo agar error aaye.)

---

## Folder map (yaad rakho)

| Hostinger | Kya hai |
|-----------|---------|
| `confostudy/` | Laravel poora app |
| `confostudy/.env` | DB password — **mat overwrite** |
| `public_html/admin/index.php` | Site entry — **mat delete** |
| `public_html/admin/build/` | React admin UI |

---

## Problem solve

| Problem | Fix |
|---------|-----|
| 404 public API | Naya ZIP + setup.php chalao |
| 500 error | `confostudy/storage/logs/laravel.log` File Manager se dekho |
| Website CMS nahi dikha | RolePermissionSeeder — setup.php mein hai |
| Purani UI | `public_html/admin/build/` delete → local `npm run build` → upload build folder |
| Faculty / Sir Ronald login | `hostinger-sync-faculty.php` (Step 5b) + AuthController live pe |

---

*SSH / VPS zaroori NAHI — File Manager + setup.php kaafi hai Phase 1 ke liye.*
