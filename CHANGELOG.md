# Ledger-Pro v2.0 Changelog

All notable changes to this project will be documented in this file.  
Format: `[Phase] > [Date] > [Change]`

---

## Phase 1 — SaaS Foundation

### ✅ 2026-07-16

- Added `master` database connection in `backend/config/database.php`.
- `master` connection is an exact duplicate of the existing `mysql` connection.
- Preserved existing `mysql` connection with zero modifications.
- Default connection remains `env('DB_CONNECTION', 'mysql')` — no change.
- No migrations, models, services, or middleware created.
- No business logic or application behaviour modified.
- Verified: `php artisan optimize:clear` passed all steps cleanly.
- Verified: `php artisan serve` boots normally on `http://127.0.0.1:8000`.
- Verified: Frontend (Vite/React) runs on `http://localhost:5173`.
- Commit: `b9e72ec` — `feat: add master database connection for SaaS foundation`

---

## Upcoming — Phase 2

- [ ] Add `tenant` database connection (dynamic, per-request resolution).
- [ ] Create tenant identification middleware.
- [ ] Implement tenant-aware database switching service.
- [ ] Scope models to the correct tenant connection.
