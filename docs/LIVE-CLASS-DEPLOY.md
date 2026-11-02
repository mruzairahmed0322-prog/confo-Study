# YouTube Live Class — Hostinger deploy (baqi steps)

## PC pe (ek dafa)

```bat
cd C:\laragon\www
DEPLOY-LIVE-CLASS.bat
```

Output: `HOSTINGER-UPLOAD/` folder

---

## Hostinger pe (File Manager)

### Step 1 — Code update
1. hPanel → **admin.confostudy.com** → File Manager
2. `confostudy` folder kholo
3. Upload **`confostudy-deploy.zip`** → **Extract** (overwrite)
4. **`.env` mat overwrite** — DB password same rehna chahiye

### Step 2 — Migration (naya table: live_class_attendances)
1. Upload `TO-public_html-admin/hostinger-setup.php` → `public_html/admin/`
2. Browser:
   ```
   https://admin.confostudy.com/hostinger-setup.php?key=ConfoStudy2026Setup
   ```
3. "migrate --force" success dikhe
4. **Delete** `hostinger-setup.php` (security)

### Step 3 — Cache clear
```
https://admin.confostudy.com/hostinger-clear-cache.php?key=ConfoStudy2026Setup
```
Phir file delete karo.

### Step 4 — YouTube Connect (ek dafa agar nahi kiya)
1. Portal login → **System Settings** → YouTube Connect
2. Google account se authorize

### Step 5 — Cron (recording auto + live status)
hPanel → **Advanced** → **Cron Jobs**

| Field | Value |
|-------|--------|
| Command | `php /home/u815787663/confostudy/artisan schedule:run` |
| Schedule | Every minute `* * * * *` |

(Path Hostinger support se confirm — agar error aaye.)

---

## Mobile app (naya APK)

PC pe:
```bat
cd C:\laragon\confostudy-mobile
npm install
npm run build:apk
```

EAS login chahiye. APK install karke purana app replace karo.

---

## Test checklist

- [ ] Student (fee paid) → Live Classes → **Join** → video andar
- [ ] Student ko YouTube URL nahi dikhna
- [ ] Teacher → **Open Class** → monitor (present/absent/minutes)
- [ ] Class end → Recordings → **Watch**
- [ ] Mobile app → Join / Watch in-app (naya APK)

---

## Agar Join button na aaye

1. YouTube connected hai?
2. Class schedule hui with class + subject?
3. Student `fee_cleared` = true?
4. Cron chal rahi hai?
