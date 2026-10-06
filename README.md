# 10Apply — 10 jobs. One click. Done.

Two-sided hiring marketplace. Candidates upload a resume once, get 10 matched jobs daily, apply to all with one click. Employers paste/upload a JD, get ranked candidates, message them.

## Stack
- Frontend: Next.js 14 + TypeScript + Tailwind (`/frontend`, port 3000)
- Backend: FastAPI + SQLAlchemy + SQLite (`tenapply.db`, port 8000). Postgres-ready via `DATABASE_URL`.
- Matching: dense-vector search (offline, dependency-free token embeddings in `backend/app/embed.py` → cosine similarity) + exact-skill / experience / location / comp bonuses. Daily picks pinned per day.
- Parsing: offline heuristics (never invents data — "Not found" when missing). Swap in an LLM later behind `parse.py`.

## Run
```bash
# backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# frontend (new terminal)
cd frontend && npm install && npm run dev
```
Open http://localhost:3000. Backend health: http://localhost:8000/health

## Demo data (password for all: `demo1234`)
```bash
curl -X POST http://localhost:8000/demo/seed   # idempotent
```
- Employers: `ava@demo.acme.test` (Backend + Frontend + 1 draft), `ben@demo.bright.test` (Full-Stack + Data Eng), `cara@demo.insight.test` (Data Scientist + ML Eng), `omar@demo.cloud.test` (DevOps + Go Backend), `pip@demo.pixel.test` (Frontend + Product Designer)
- Candidates: `dev-backend@demo.test`, `front-react@demo.test`, `data-ana@demo.test` (each with applications), `ops-iva@demo.test` (DevOps), `des-ign@demo.test` (design, 1 interview), `new-grad@demo.test` (fresh, none)
- The login page has one-click demo login buttons (no password needed).

## The working loop
1. Sign up as candidate → Upload resume (or "Use sample resume") → profile auto-populates → edit → Looks Good
2. That's it — **auto-apply runs daily at 10am server time** and submits your top-10 vector matches (all matched jobs if fewer than 10). No clicking needed. `POST /demo/auto-apply` triggers a run on demand; `GET /candidate/auto-status` shows today's result.
3. Sign up as employer (seed jobs auto-created) → Create Job (paste JD → Generate → Publish)
4. Open job → ranked candidates → View Profile → Message / Invite to Interview / Reject. **Employer → candidate messages also go out over email** (SMTP via `SMTP_HOST/PORT/USER/PASS/FROM` env; without it they're recorded in `email_outbox.log` + `GET /demo/emails`).
5. Candidate sees employer message under Candidates → Messages. Application statuses update on both sides. `source` is `auto` or `manual`.

## Sides
Candidate (`/candidate/*`) and employer (`/employer/*`) areas are separated: role-guard layouts redirect to the right side, and the API returns 403 on cross-side calls (profile view + messages are shared).

## API (excerpt)
```
POST /auth/signup POST /auth/login
POST /candidate/resume  GET/PATCH /candidate/profile
GET /candidate/daily-jobs  POST /candidate/apply-all  POST /candidate/apply/{job_id}
GET /candidate/applications
POST /employer/jobs/parse  POST /employer/jobs  PATCH /employer/jobs/{id}  POST /employer/jobs/{id}/publish
GET /employer/jobs  GET /employer/jobs/{id}/candidates  PATCH /employer/applications/{cid}/{jid}
POST /messages  GET /messages
```

## Notes
- Auth is email/password + JWT access tokens (7 days) + rotating refresh tokens (90 days, `POST /auth/refresh`, revoke via `POST /auth/logout`). The frontend silently refreshes expired sessions, so users stay logged in; "Keep me logged in" unchecked = this-tab-only session.
- Applications happen natively on-platform (no external ATS automation, per spec §27).
- Seed: 12 jobs auto-seeded so Daily 10 works on first signup.
