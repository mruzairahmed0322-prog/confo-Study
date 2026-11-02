# BAQI_DEVELOPMENT.md — Baqi Kaam (AI Development Guide)

> Purane steps (0–8c) **complete** — dubara mat banwao.
>
> **Saath me padho:** `CURRENT_ARCHITECTURE.md` + `GLOBAL_AI_RULES.md`
>
> **Last updated:** Aug 2026

---

## Project (Fixed — Change Mat Karo)

| Field | Value |
|-------|-------|
| App | ConfoStudy School Management |
| Backend | Laravel 12 · PHP 8.2 · MySQL `school_mgmt` |
| Frontend | React 18 + TypeScript + Vite + React Router |
| Auth | Sanctum · `localStorage.auth_token` |
| URL | `http://localhost:8000/app` |
| Theme | `resources/css/admin.css` — emerald `#059669` · lime `#84cc16` |

### Rules (Har Task Pe)

- `/app/*` — **zero page reload** (`NavLink`, `useNavigate`)
- Har form → `apiPost`/`apiPut` → MySQL → `toast()` → `invalidateQueries`
- TanStack Query: `staleTime: 30_000`, `placeholderData`
- Backend: sirf `Api/*` extend — rewrite mat karo
- **Mat chhedo:** `RegistrationGuard.php`, `DashboardData.php`, migrations, `RolePermissionSeeder`

### Mat Overwrite Karo

```
app.tsx · admin.css · auth.css · contexts/* · lib/api.ts
Auth pages · AppLayout · Sidebar · ui/* components
StudentsPage · TeachersPage · ParentsPage · ClassesPage
FeesCollectPage · AttendanceMarkPage · HomeworkPage
QuizAttemptPage · Dashboard · LibraryPage · ReportsPage
ProfilePage · SettingsPage · ApprovalsPage · existing Api/*
```

---

## ⏳ Baqi Kaam (Sirf Ye Karo)

### Task A — List-only pages → Full CRUD

`resources/js/pages/modules/ModulePages.tsx` me `createModulePage()` wale pages ko **TeachersPage / HomeworkPage** pattern se upgrade karo:

| Page | Route | API (abhi) | Kaam |
|------|-------|------------|------|
| Subjects | `/app/subjects` | GET only | POST/PUT routes + modal CRUD |
| Live Classes | `/app/live-classes` | GET only | POST/PUT routes + modal CRUD |
| Exams | `/app/exams` | GET only | POST/PUT routes + modal CRUD |
| Results | `/app/results` | GET only | POST/PUT routes + modal CRUD |
| Fee Invoices | `/app/fees` | GET only | POST/PUT routes + modal CRUD |
| Assignments | `/app/assignments` | **API ready** ✅ | Sirf frontend CRUD (copy HomeworkPage) |
| Quizzes | `/app/quizzes` | GET + attempt | Quiz **create** form + API POST |

### Task B — Certificates

`resources/js/pages/admin/CertificatesPage.tsx`
- "Coming Soon" hatao
- Create modal + approve button
- API: `POST /certificates`, `PUT /certificates/{id}/approve` (extend `AdminApiController`)

### Task C — Performance

- Lighthouse score 90+ (Performance, Accessibility)
- Large lists (1000+ rows) → virtual scroll in DataTable
- `npm run build` — bundle check

---

## 📋 COPY — AI Prompts

### Prompt 1: Module CRUD

```
PROJECT: ConfoStudy React SPA
READ: docs/BAQI_DEVELOPMENT.md + docs/CURRENT_ARCHITECTURE.md + docs/GLOBAL_AI_RULES.md

TASK: ModulePages.tsx — list-only pages ko full CRUD banao:
Subjects, Live Classes, Exams, Results, Fee Invoices, Assignments (API ready), Quizzes (create)

PATTERN: TeachersPage / HomeworkPage — Modal + apiPost/apiPut + toast + invalidateQueries
BACKEND: Api/* me POST/PUT add karo jahan GET only hai (school_id scope + permissions)

⛔ DO NOT overwrite existing working pages
✅ npm run build when done
```

### Prompt 2: Certificates

```
PROJECT: ConfoStudy
READ: docs/BAQI_DEVELOPMENT.md + docs/CURRENT_ARCHITECTURE.md

TASK: CertificatesPage — create + approve workflow
API: extend AdminApiController (POST store, PUT approve)
UI: modal form, remove "Coming Soon" badge
```

### Prompt 3: Performance

```
READ: docs/BAQI_DEVELOPMENT.md + docs/GLOBAL_AI_RULES.md
TASK: Lighthouse 90+, virtual scroll on DataTable for 1000+ rows
Do not break existing pages. npm run build must pass.
```

---

## Related Docs

| File | Purpose |
|------|---------|
| `CURRENT_ARCHITECTURE.md` | Live routes + API map |
| `GLOBAL_AI_RULES.md` | Coding rules |
| `LOCAL_TESTING.md` | Test kaise karna hai |
| `DEPLOY.md` | Hostinger deploy |

---

*ConfoStudy · BAQI_DEVELOPMENT.md · Aug 2026*
