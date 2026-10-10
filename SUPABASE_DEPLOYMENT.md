# Supabase Deployment Guide

This project is fully equipped to deploy to **Supabase** for PostgreSQL database hosting, Row Level Security (RLS), and Supabase Storage for candidate resumes.

---

## 1. Quick Deploy via Connection String

If you already have a Supabase project created:

1. Copy your database connection string from **Supabase Dashboard &rarr; Project Settings &rarr; Database &rarr; Connection string (URI)**.
   Format:
   ```bash
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
   *(Or use port `6543` if using the connection pooler)*

2. Set the environment variable and run the automated deployment script:
   ```bash
   export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   python3 backend/deploy_supabase.py
   ```

   This script will:
   - Verify connection to Supabase PostgreSQL.
   - Execute the complete schema migration (`supabase/migrations/20241010000000_init_rec_schema.sql`).
   - Create all 17 tables (`users`, `invitations`, `candidate_profiles`, `resumes`, `matches`, `applications`, `recruiter_waitlist`, `password_reset_tokens`, etc.).
   - Configure the `resumes` storage bucket with private access policies.
   - Seed initial demo accounts (`alex.backend@example.com`, `elena.datascience@example.com`, `founder@apexfoundry.example.com`).

---

## 2. Deploy via Supabase CLI

If you prefer using the Supabase CLI:

1. Log in to your Supabase account:
   ```bash
   supabase login
   ```

2. Link to your remote project:
   ```bash
   supabase link --project-ref [YOUR-PROJECT-REF]
   ```

3. Push the migrations directly:
   ```bash
   supabase db push
   ```

---

## 3. Environment Variables Configuration

### Backend (`backend/.env` or Production Server)
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=your_jwt_secret_key_here
FRONTEND_URL=https://discovered-site.vercel.app
```

### Frontend (`frontend/.env.local` or Vercel Environment Variables)
```env
NEXT_PUBLIC_API=https://your-backend-api-url.com
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
```
