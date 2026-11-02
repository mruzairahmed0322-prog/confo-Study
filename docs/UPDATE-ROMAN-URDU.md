# ConfoStudy — Baad Mein Changes Kaise Karen (Roman Urdu)

> Deploy ho gaya ✅ Ab UI ya database change karne ka beginner guide.
>
> **Rule:** Pehle **local** (Laragon) par change + test → phir **Hostinger** par update.

**Live site:** `https://admin.confostudy.com`  
**Local site:** `http://localhost:8000/app`

---

## Golden Rule (Yaad Rakho)

```
1. Local change karo (C:\laragon\www)
2. Local test karo (browser mein dekho)
3. Hostinger par upload karo (sirf jo files change hui)
4. Live site check karo
```

**Kabhi bhi** server par direct code edit mat karo — hamesha local se.

---

# PART A — UI Change (Login, Dashboard, Colors, Text)

## UI Files Kahan Hain?

| Kya change | File path (local) |
|------------|-------------------|
| Login page | `resources/js/pages/auth/Login.tsx` |
| Register page | `resources/js/pages/auth/Register.tsx` |
| Dashboard | `resources/js/pages/Dashboard.tsx` |
| Sidebar menu | `resources/js/components/layout/Sidebar.tsx` |
| Top bar | `resources/js/components/layout/Topbar.tsx` |
| Buttons, inputs | `resources/js/components/ui/` |
| Colors / theme | `resources/css/app.css` (Tailwind) |

---

## Example: Login Page Text Change

### Step 1 — Local file kholo
```
C:\laragon\www\resources\js\pages\auth\Login.tsx
```

### Step 2 — Text change karo (Cursor / Notepad)
Maslan: "Sign In" → "Login Karein"

### Step 3 — Local test
Laragon **Start All** → double-click `START.bat`  
Browser: `http://localhost:8000/app/login`  
Change dikhe → thek ✅

### Step 4 — Build karo (production files)
Terminal / Laragon:
```bash
cd C:\laragon\www
npm run build
```
`public/build/` folder update ho jayega.

### Step 5 — Hostinger par upload (sirf build folder)

**Option A — Sirf CSS/JS (tez):**
1. hPanel → File Manager
2. `public_html/admin/build/` folder **delete** karo
3. Local `C:\laragon\www\public\build\` ki **poori folder** upload karo
4. Destination: `public_html/admin/build/`

**Option B — Poora ZIP (bada change):**
1. `DEPLOY-HOSTINGER.bat` chalao
2. Naya ZIP upload + extract (pehle guide dekho)

### Step 6 — Live test
```
https://admin.confostudy.com/app/login
```
Browser **hard refresh**: `Ctrl + Shift + R`

---

## UI Change Quick Table

| Change type | Local command | Hostinger upload |
|-------------|---------------|------------------|
| Text, color, layout | `npm run build` | `public_html/admin/build/` |
| Naya page | `npm run build` | `public/build/` + agar backend bhi → poora deploy |
| Sirf image/logo | — | `public/` mein image upload |

---

# PART B — Database Change

## Type 1: Data Change (Student name, fee, user)

**Tool:** phpMyAdmin (asaan — code nahi)

### Local data change
1. Laragon → HeidiSQL ya phpMyAdmin
2. Database: `school_mgmt`
3. Table kholo (maslan `students`)
4. Row edit → Save
5. Local site check

### Live data change
1. hPanel → phpMyAdmin
2. Database: `u815787663_confostudy`
3. Same table edit
4. Live site check

> **Tip:** Student/user add karne ke liye app se karo (Academics → Students) — direct DB risky hai.

---

## Type 2: Naya Column / Naya Table (Structure)

**Tool:** Laravel migrations (developer step)

### Step 1 — Migration banao (local)
```bash
cd C:\laragon\www
php artisan make:migration add_phone_to_students_table
```

### Step 2 — Migration file edit
`database/migrations/` mein nayi file — column define karo.

### Step 3 — Local run
```bash
php artisan migrate
```

### Step 4 — Local test

### Step 5 — Live par migrate
**Option A — SSH (agar hai):**
```bash
cd ~/confostudy
php artisan migrate --force
```

**Option B — phpMyAdmin (SSH nahi):**
1. Local HeidiSQL → `school_mgmt` → Export (structure only ya full)
2. Hostinger phpMyAdmin → Import

**Option C — Migration file upload + SSH migrate**

Migration files upload: `confostudy/database/migrations/` (naya file)

---

## Type 3: Database Backup (Pehle Kabhi Bhi)

### Local backup
Double-click: `EXPORT-DATABASE.bat`  
Ya:
```bash
C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe -u root school_mgmt > backup.sql
```

### Live backup
hPanel → phpMyAdmin → `u815787663_confostudy` → **Export** → Go

> **Har bade change se pehle backup lo.**

---

# PART C — Backend / API Change

Agar PHP code change (Controller, Model, routes):

| Folder | Kya hai |
|--------|---------|
| `app/Http/Controllers/` | API logic |
| `app/Models/` | Database models |
| `routes/api.php` | API routes |
| `routes/web.php` | Web routes |

### Workflow
1. Local change + test (`composer dev` ya `START.bat`)
2. `DEPLOY-HOSTINGER.bat` → naya ZIP
3. Hostinger: ZIP upload → extract (overwrite)
4. **`.env` mat overwrite** — server ki `.env` safe rakho
5. Permissions check (`storage` 775)

---

# PART D — `.env` Change (Settings)

| Setting | Kahan |
|---------|-------|
| Local | `C:\laragon\www\.env` |
| Live | `confostudy/.env` (File Manager) |

**Live `.env` change ke baad** site refresh — cache file delete:
`confostudy/bootstrap/cache/packages.php` + `services.php` delete

---

# PART E — Faculty Sync + Login (Name / Email / Mobile)

## Local
```bash
cd C:\laragon\www
php artisan app:sync-real-faculty
npm run build
```
- Sync: teachers + Super Admin (`Sir Ronald`) + passwords → `docs/SECRET_CREDENTIALS.md`
- Build: login field label **Email / Name / Mobile** live UI ke liye zaroori

## Live (Hostinger — bina SSH)

1. Naya code upload (`DEPLOY-HOSTINGER.bat` → ZIP) **ya** sirf:
   - PHP: `app/Http/Controllers/Api/AuthController.php` + seeder/command files
   - UI: local `public/build/` → `public_html/admin/build/`
2. Faculty sync (browser):
   - Upload `scripts/hostinger-sync-faculty.php` → `public_html/admin/`
   - Open: `https://admin.confostudy.com/hostinger-sync-faculty.php?key=ConfoStudy2026Setup`
   - **DELETE** script after use
3. Hard refresh: `Ctrl + Shift + R` on `/app/login`

### Super Admin login examples
| Field | Value | Password |
|-------|-------|----------|
| Name | `Sir Ronald` | `SirRonald` |
| Email | `mruzairahmed0322@gmail.com` | `SirRonald` |

## Mobile APK — kab rebuild?

| Change | Web `npm run build` | Mobile APK rebuild |
|--------|---------------------|--------------------|
| Login field **label** (web only) | ✅ Haan | ❌ Nahi |
| Backend name-login API | (PHP upload) | ❌ Nahi — Email field mein `Sir Ronald` |
| Faculty / passwords (DB seed) | ❌ | ❌ Nahi |
| Guest tabs CMS vs WordPress / WP error fix | ✅ (admin UI) | ✅ **Haan** — naya APK |
| Mobile login demo accounts (Sir Ronald) | ❌ | ✅ Haan |

**Short:** WordPress load fail + Super Admin data 4 tabs mein dikhane ke liye **naya APK** chahiye. Live pe pehle ZIP + `hostinger-sync-faculty.php` + Website CMS → Guest source = **CMS**.

Mobile APK:
```bat
cd C:\laragon\confostudy-mobile
npm run build:apk
```

---

# PART F — Common Tasks Cheat Sheet

| Kaam | Kaise |
|------|-------|
| Login text/color | `Login.tsx` / `auth-i18n.ts` → `npm run build` → upload `build/` |
| Faculty + name passwords | `php artisan app:sync-real-faculty` (live: `hostinger-sync-faculty.php`) |
| Naya student | App se: Academics → Students |
| User password reset | App se: Admin → Users |
| Fee change | App se: Fees module |
| School name | Admin → Settings |
| DB data edit | phpMyAdmin |
| Naya DB column | Migration → migrate |
| Full app update | `DEPLOY-HOSTINGER.bat` → ZIP upload |
| DB backup | `EXPORT-DATABASE.bat` ya phpMyAdmin Export |
| Mobile UI change | `confostudy-mobile` → `npm run build:apk` |

---

# PART G — Upload Map (Yaad Rakho)

| Local | Hostinger |
|-------|-----------|
| `public/build/` | `public_html/admin/build/` |
| `confostudy/` (poora app) | `/files/confostudy/` |
| `.env` | `confostudy/.env` (manual edit, upload mat) |
| Database | phpMyAdmin import |

**index.php** location: `public_html/admin/index.php` — **mat delete karo.**

---

# PART H — Problems

| Problem | Fix |
|---------|-----|
| UI change nahi dikha | `npm run build` + `build/` upload + Ctrl+Shift+R |
| 500 error | `laravel.log` check; `.env` DB password |
| CSS broken | `public_html/admin/build/` check |
| DB error | phpMyAdmin credentials + `.env` match |
| Old page dikhe | Browser cache clear |

---

# PART I — AI Se Help (Cursor)

Cursor mein likho:

```
Local: C:\laragon\www
Live: https://admin.confostudy.com

TASK: [kya change chahiye]
Example: Login page ka title change karo
Example: students table mein phone column add karo
```

Files reference:
- `docs/UPDATE-ROMAN-URDU.md` (ye file)
- `docs/CURRENT_ARCHITECTURE.md`
- `docs/GLOBAL_AI_RULES.md`

---

*ConfoStudy · UPDATE-ROMAN-URDU.md · Aug 2026*
