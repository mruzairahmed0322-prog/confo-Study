# ConfoStudy — Current Architecture (Live)

> Naya kaam isi ke upar **extend** karo — overwrite mat karo.

---

## Stack

```
Browser → /app/* → React SPA (NavLink, no reload)
         → /api/v1/* → Laravel Api/* → MySQL school_mgmt
```

**Token:** `localStorage.auth_token` · **Client:** `resources/js/lib/api.ts`

---

## Global Design (`resources/css/admin.css`)

| Token | Value |
|-------|-------|
| `--admin-green` | `#059669` |
| `--admin-lime` | `#84cc16` |
| `--admin-yellow` | `#eab308` |

Classes: `.admin-card`, `.admin-sidebar`, `.admin-btn-primary`, `.admin-table-wrap`, `.admin-input`

---

## React Pages (Built)

| Route | File | DB Save |
|-------|------|---------|
| `/app/login` | auth/Login.tsx | ✅ |
| `/app/register` | auth/Register.tsx | ✅ |
| `/app/forgot-password` | auth/ForgotPassword.tsx | ✅ |
| `/app/reset-password/:token` | auth/ResetPassword.tsx | ✅ |
| `/app` | Dashboard.tsx | read + role widgets |
| `/app/students` | students/StudentsPage.tsx | ✅ |
| `/app/parents` | parents/ParentsPage.tsx | ✅ CRUD |
| `/app/teachers` | modules/ModulePages.tsx | ✅ CRUD |
| `/app/classes` | admin/ClassesPage.tsx | ✅ |
| `/app/attendance` | attendance/AttendanceMarkPage.tsx | ✅ |
| `/app/homework` | homework/HomeworkPage.tsx | ✅ CRUD |
| `/app/quizzes/:id/attempt` | quizzes/QuizAttemptPage.tsx | ✅ |
| `/app/fees/collect` | fees/FeesCollectPage.tsx | ✅ |
| `/app/profile` | admin/ProfilePage.tsx | ✅ |
| `/app/settings` | admin/SettingsPage.tsx | ✅ |
| `/app/approvals` | approvals/ApprovalsPage.tsx | ✅ |
| `/app/reports` | admin/ReportsPage.tsx | ✅ |
| `/app/library` | admin/LibraryPage.tsx | ✅ CRUD |
| `/app/certificates` | admin/CertificatesPage.tsx | ⏳ read-only |
| `/app/subjects` etc. | modules/ModulePages.tsx | ⏳ list only |
| Admin (timetable, salary, expenses, roles, logs) | admin/* | ✅ |

---

## API Controllers

`AuthController`, `RegisterApiController`, `StudentApiController`, `TeacherApiController`, `AttendanceApiController`, `FeeApiController`, `ModuleApiController`, `AdminApiController`, `ApprovalApiController`

---

## Mandatory Patterns

```tsx
// Navigation — no reload
<NavLink to="/app/students" />

// Save — must hit database
apiPost('/students', body) → toast('Saved') → invalidateQueries

// Fast lists
placeholderData: (prev) => prev, staleTime: 30_000
```

---

## Frozen (Never Rewrite)

`RegistrationGuard.php`, `DashboardData.php`, `DashboardWidgets.php`, ran migrations, `RolePermissionSeeder.php`

---

*Aug 2026*
