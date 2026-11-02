# ConfoStudy — School Management System

Enterprise school management built with **Laravel 12**, **MySQL 8**, and **React + Vite** SPA.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 12, PHP 8.2+, Spatie Permission, Sanctum |
| Frontend | React 18, TypeScript, Vite, Tailwind |
| Database | MySQL 8, multi-tenant via `school_id` |

## Requirements

- PHP 8.2+ (Laragon recommended)
- Composer 2.x
- Node.js 18+ and npm
- MySQL 8

## Quick Start (Laragon)

### One-click (recommended)

Double-click **`START.bat`** or **`START.vbs`** in the project folder.

It will automatically:
- Use Laragon PHP/Node paths
- Create missing database tables (`migrate`)
- Add demo users & sample data if needed (`seed`)
- Open http://localhost:8000/app in your browser
- Start Laravel + Vite + queue + logs

**Login:** `mruzairahmed0322@gmail.com` / `password`

> Start Apache + MySQL in Laragon first.

### First-time full setup

```bash
setup.bat
```

Or manually:

```bash
composer install
npm install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

### Development

```bash
composer dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:8000/app | React SPA (main app) |
| http://localhost:8000/app/login | Login page |
| http://localhost:8000/api/v1 | REST API (Sanctum) |

## Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin (Sir Ronald) | mruzairahmed0322@gmail.com | SirRonald |

Other users join via **Register** (`/app/register`) — you approve them in **User Approvals**.

### Register flow (Option A)

**Public register:** Parent and Staff only (`/app/register`).

**Super Admin creates:** Students and Teachers (with login) from **Academics → Students / Teachers**.

| Who registers | Your action |
|---------------|-------------|
| Parent / Staff | **Approve** in User Approvals → login enabled |
| Student / Teacher | Cannot self-register — you add them from Academics (email creates login, default password: `password`) |

## Project Structure

```
app/
├── Http/Controllers/Api/   # REST API for React SPA
├── Models/                 # School, User, Student, etc.
├── Support/                # DashboardData, RegistrationGuard
resources/
├── js/                     # React SPA (app.tsx, pages/, components/)
├── views/spa.blade.php     # SPA mount point
routes/
├── api.php                 # /api/v1/* Sanctum API
└── web.php                 # SPA catch-all + auth redirects
```

## Security

- `RegistrationGuard::canLogin()` — single login gate
- Brute-force lock: 5 attempts → 15 minutes
- CSRF, security headers, Sanctum token auth

## License

MIT
