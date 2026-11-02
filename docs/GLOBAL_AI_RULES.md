# GLOBAL_AI_RULES.md — Coding Rules

> Har development task pe apply ho.
> Saath me padho: `CURRENT_ARCHITECTURE.md` + `BAQI_DEVELOPMENT.md`
---

## SPA + API (Critical)

1. **Primary UI = React `/app/*`** — Blade me naya kaam mat likho.
2. **Zero page reload** — `NavLink`, `useNavigate` only. No `<a href>`, no `window.location`.
3. **Har form = API → MySQL → toast** — `apiPost`/`apiPut` + `invalidateQueries`.
4. **Fast nav** — direct page imports (no lazy on routes), `placeholderData`, `staleTime: 30_000`.
5. **Global colors** — `resources/css/admin.css` emerald/lime — match existing pages.
6. **Alerts** — `useToast()` saves; `AlertModal` login blocks.

---

## Kabhi Mat Karo

1. Working files overwrite mat karo — **extend** karo.
2. Backend rewrite mat karo — thin `Api/*` wrappers only.
3. Ran migrations alter mat karo.
4. Mobile API routes break mat karo.
5. TypeScript me `any` mat use karo.
6. Duplicate components mat banao — pehle `components/ui/` check karo.

---

## Hamesha Karo

1. Pehle existing code read/grep karo.
2. `DataTable`, `Button`, `Card` reuse karo.
3. Spatie permission server + client dono.
4. `school_id` scope har API query me.
5. Step khatam pe `npm run build` + file list do.

---

## Save Pattern

```tsx
const mutation = useMutation({
  mutationFn: (body) => apiPost('/classes', body),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['classes'] });
    toast('Saved to database');
  },
  onError: () => toast('Save failed', 'error'),
});
```

---

*Include in every step prompt · Jul 2026*
