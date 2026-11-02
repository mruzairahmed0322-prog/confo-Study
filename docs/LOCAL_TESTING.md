# LOCAL_TESTING.md — Local Testing Guide (Zero Se)

> Laragon pe ConfoStudy test karna — step by step.
>
> **Last updated:** Aug 2026

---

## Step 1: Laragon start

1. Laragon kholo → **Start All** (Apache + MySQL)
2. Project folder: `C:\laragon\www`

---

## Step 2: First time setup

```bash
# Option A — one click
START.bat

# Option B — manual
setup.bat
# ya:
composer install && npm install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

---

## Step 3: Dev chalao

```bash
npm run dev:full
# Laravel :8000 + Vite :5173
```

Browser: **http://localhost:8000/app**

---

## Step 4: Demo login

| Role | Email | Password |
|------|-------|----------|
| School Owner | `owner@school.com` | `password` |
| Admin | `admin@school.com` | `password` |

---

## Step 5: Test checklist

| # | Test | Pass? |
|---|------|-------|
| 1 | Login → Dashboard (no white flash) | ☐ |
| 2 | Sidebar click → URL change, **no full reload** | ☐ |
| 3 | Students → Add → toast → phpMyAdmin me row | ☐ |
| 4 | Teachers → Add/Edit → DB save | ☐ |
| 5 | Parents → Add/Edit → DB save | ☐ |
| 6 | Classes → Add class → DB save | ☐ |
| 7 | Attendance → class select → mark → Save | ☐ |
| 8 | Fees → Collect → amount save | ☐ |
| 9 | Payment Proofs → Approve/Reject | ☐ |
| 10 | Homework → Create → DB save | ☐ |
| 11 | Quiz → Attempt → score show | ☐ |
| 12 | Profile → name change → save | ☐ |
| 13 | Settings → save → reload pe same data | ☐ |
| 14 | Dark mode toggle | ☐ |
| 15 | Logout → login page | ☐ |
| 16 | Forgot password → email form submit | ☐ |

---

## Step 6: Production build test (deploy se pehle)

```bash
npm run build
php artisan serve
# http://localhost:8000/app — Vite band ho, build assets se chale
```

---

## Step 7: Common fixes

| Problem | Fix |
|---------|-----|
| Blank white page | `del public\hot` then `npm run build` |
| 419 / CSRF | Clear browser cache, re-login |
| API 401 | `localStorage` clear → login again |
| DB error | Laragon MySQL ON + `.env` DB check |
| Vite not loading | `npm run dev` alag terminal me |

---

## phpMyAdmin check

- URL: `http://localhost/phpmyadmin`
- Database: `school_mgmt`
- Tables: `users`, `students`, `attendances`, `fee_payments` etc.

---

## AI ko testing ke liye dena

```
READ: docs/LOCAL_TESTING.md
Mujhe local testing guide karo / ye error aa raha hai: [error]
```

---

*ConfoStudy · LOCAL_TESTING.md · Aug 2026*
