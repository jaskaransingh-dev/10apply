# Cloudflare Deployment Guide: Backend & D1 Database

The backend API and database for **rec** are configured to run entirely on **Cloudflare**:
- **Database**: **Cloudflare D1** (Serverless distributed SQL database powered by SQLite).
- **Backend API**: **Cloudflare Workers** (Global edge runtime with direct D1 binding `env.DB`).

---

## 1. Cloudflare D1 Database Architecture

Cloudflare D1 provides distributed SQL storage at the edge. The full database schema is located at:
`cloudflare/d1/schema.sql`

It creates the following tables:
- `users`: Core candidate and recruiter user accounts.
- `invitations`: 5-invite single-use token tracking.
- `candidate_profiles`: Structured candidate profiles, disciplines, work authorization, and compensation floors.
- `resumes` & `resume_parses`: Uploaded resume documents and structured parsed attributes.
- `candidate_projects`: GitHub repositories and portfolio demos.
- `companies` & `recruiter_profiles`: Startup company profiles and verified recruiter identities.
- `jobs` & `job_requirements`: Published startup openings and structured requirements.
- `matches`: Deterministic 5-component scoring (Formula: \(S = 0.35K + 0.25E + 0.20R + 0.10P + 0.10D\)).
- `applications`: Automated 10:00 AM daily dispatches.
- `conversations` & `messages`: Direct candidate-recruiter messaging.
- `recruiter_waitlist`: Company access requests from startup founders.
- `password_reset_tokens`: Time-bound password reset tokens.
- `email_outbox`: Idempotent transactional outbox.

---

## 2. Quick Deploy with Wrangler

### Local Testing (D1 Emulator)
To initialize and test the D1 database locally without remote credentials:
```bash
./backend/deploy_cloudflare.sh --local
```
Or with Wrangler:
```bash
npx wrangler d1 execute rec_db --local --file=cloudflare/d1/schema.sql
npx wrangler d1 execute rec_db --local --file=cloudflare/d1/seed.sql
```

### Production Cloudflare Deploy

1. Authenticate with Cloudflare:
   ```bash
   npx wrangler login
   ```
   *Or export your API token:*
   ```bash
   export CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"
   ```

2. Create your remote D1 database:
   ```bash
   npx wrangler d1 create rec_db
   ```
   *Note the `database_id` output by Wrangler and ensure it matches the `database_id` in `wrangler.toml`.*

3. Execute the schema migration on remote D1:
   ```bash
   npx wrangler d1 execute rec_db --remote --file=cloudflare/d1/schema.sql
   ```

4. Deploy the Cloudflare Worker API:
   ```bash
   npx wrangler deploy
   ```

---

## 3. Configuration (`wrangler.toml`)

```toml
name = "rec-backend"
main = "backend/cloudflare/worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "rec_db"
database_id = "rec-d1-db-id"
migrations_dir = "cloudflare/d1"
```

---

## 4. Frontend Integration

In `frontend/.env.local` or your frontend hosting environment (e.g. Vercel or Cloudflare Pages), point the API endpoint to your Cloudflare Worker URL:
```env
NEXT_PUBLIC_API="https://rec-backend.<your-subdomain>.workers.dev"
```
