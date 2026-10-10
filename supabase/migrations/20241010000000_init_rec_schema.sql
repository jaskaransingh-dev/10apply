-- ==============================================================================
-- rec - Private Candidate Network & Recruiter Marketplace
-- Supabase Schema Migration: Full Schema, Storage & Security Policies
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'candidate', -- candidate | recruiter | employer | admin
    account_status VARCHAR(32) DEFAULT 'active',    -- active | pending_verification | suspended
    invite_code VARCHAR(64) UNIQUE DEFAULT '',
    invited_by VARCHAR(64) DEFAULT '',
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Invitations Table (Single-use token tracking)
CREATE TABLE IF NOT EXISTS public.invitations (
    id VARCHAR(64) PRIMARY KEY,
    inviter_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invitee_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    token VARCHAR(128) UNIQUE NOT NULL,
    recipient_email VARCHAR(255) DEFAULT '',
    status VARCHAR(32) DEFAULT 'pending', -- pending | accepted | expired | revoked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON public.invitations(inviter_id);

-- 3. Candidate Profiles Table
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    headline VARCHAR(255) DEFAULT '',
    location VARCHAR(255) DEFAULT '',
    work_authorization VARCHAR(255) DEFAULT 'Authorized to work in US',
    min_salary INTEGER DEFAULT 0,
    salary_min INTEGER DEFAULT 0,
    currency VARCHAR(16) DEFAULT 'USD',
    remote_preference VARCHAR(64) DEFAULT 'Remote',
    work_arrangement VARCHAR(64) DEFAULT 'Remote',
    remote INTEGER DEFAULT 1,
    roles TEXT DEFAULT '[]',
    functions TEXT DEFAULT '["Engineering"]',
    seniority VARCHAR(64) DEFAULT 'Mid level',
    industries TEXT DEFAULT '[]',
    locations TEXT DEFAULT '[]',
    employment_types TEXT DEFAULT '["Full-time"]',
    start_date VARCHAR(64) DEFAULT 'Immediately',
    hours_per_week INTEGER DEFAULT 40,
    experience_level VARCHAR(64) DEFAULT '2-5 years',
    skills TEXT DEFAULT '[]',
    resume_url VARCHAR(512) DEFAULT '',
    resume_text TEXT DEFAULT '',
    portfolio_url VARCHAR(512) DEFAULT '',
    github_url VARCHAR(512) DEFAULT '',
    linkedin_url VARCHAR(512) DEFAULT '',
    profile_data TEXT DEFAULT '{}',
    questionnaire_answers TEXT DEFAULT '{}',
    auto_apply_consent INTEGER DEFAULT 1,
    profile_complete INTEGER DEFAULT 100,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user ON public.candidate_profiles(user_id);

-- 4. Resumes Table
CREATE TABLE IF NOT EXISTS public.resumes (
    id VARCHAR(64) PRIMARY KEY,
    candidate_id VARCHAR(64) NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    filename VARCHAR(255) DEFAULT '',
    file_path VARCHAR(512) DEFAULT '',
    storage_key VARCHAR(255) DEFAULT '',
    mime_type VARCHAR(128) DEFAULT 'application/pdf',
    file_size INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(32) DEFAULT 'parsed',
    error_details TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_resumes_candidate ON public.resumes(candidate_id);

-- 5. Resume Parses Table
CREATE TABLE IF NOT EXISTS public.resume_parses (
    id VARCHAR(64) PRIMARY KEY,
    resume_id VARCHAR(64) NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
    candidate_id VARCHAR(64) NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    raw_text TEXT DEFAULT '',
    parsed_name VARCHAR(255) DEFAULT '',
    parsed_email VARCHAR(255) DEFAULT '',
    parsed_title VARCHAR(255) DEFAULT '',
    parsed_skills TEXT DEFAULT '[]',
    parsed_experience TEXT DEFAULT '[]',
    parsed_education TEXT DEFAULT '[]',
    parsed_projects TEXT DEFAULT '[]',
    total_experience_years REAL DEFAULT 0.0,
    parser_version VARCHAR(32) DEFAULT '2.0.0',
    status VARCHAR(32) DEFAULT 'parsed',
    error_details TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Candidate Projects Table
CREATE TABLE IF NOT EXISTS public.candidate_projects (
    id VARCHAR(64) PRIMARY KEY,
    candidate_id VARCHAR(64) NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    label VARCHAR(255) DEFAULT '',
    title VARCHAR(255) DEFAULT '',
    url VARCHAR(512) DEFAULT '',
    repo_url VARCHAR(512) DEFAULT '',
    demo_url VARCHAR(512) DEFAULT '',
    project_type VARCHAR(64) DEFAULT 'github',
    description TEXT DEFAULT '',
    contribution TEXT DEFAULT '',
    technologies TEXT DEFAULT '[]',
    is_private_demo INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(64) PRIMARY KEY,
    employer_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT '',
    website VARCHAR(512) DEFAULT '',
    work_email VARCHAR(255) DEFAULT '',
    verified INTEGER DEFAULT 1,
    industry VARCHAR(128) DEFAULT 'Technology',
    stage VARCHAR(64) DEFAULT 'Seed',
    size VARCHAR(64) DEFAULT '1-10',
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Recruiter Profiles Table
CREATE TABLE IF NOT EXISTS public.recruiter_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) DEFAULT '',
    company_website VARCHAR(512) DEFAULT '',
    role_title VARCHAR(128) DEFAULT 'Recruiter',
    verified INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Jobs Table
CREATE TABLE IF NOT EXISTS public.jobs (
    id VARCHAR(64) PRIMARY KEY,
    employer_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recruiter_id VARCHAR(64) REFERENCES public.users(id) ON DELETE SET NULL,
    company_id VARCHAR(64) REFERENCES public.companies(id) ON DELETE SET NULL,
    company VARCHAR(255) DEFAULT '',
    company_name VARCHAR(255) DEFAULT '',
    company_website VARCHAR(512) DEFAULT '',
    title VARCHAR(255) DEFAULT '',
    function VARCHAR(128) DEFAULT 'Engineering',
    seniority VARCHAR(64) DEFAULT 'Mid level',
    employment_type VARCHAR(64) DEFAULT 'Full-time',
    work_arrangement VARCHAR(64) DEFAULT 'Remote',
    remote_policy VARCHAR(64) DEFAULT 'Remote',
    location VARCHAR(255) DEFAULT 'Remote',
    experience VARCHAR(64) DEFAULT '2-5 years',
    salary_min INTEGER DEFAULT 0,
    salary_max INTEGER DEFAULT 0,
    currency VARCHAR(16) DEFAULT 'USD',
    description TEXT DEFAULT '',
    responsibilities TEXT DEFAULT '',
    required_skills TEXT DEFAULT '[]',
    preferred_skills TEXT DEFAULT '[]',
    application_questions TEXT DEFAULT '[]',
    sponsorship_policy VARCHAR(128) DEFAULT 'Will sponsor',
    status VARCHAR(32) DEFAULT 'published',
    is_demo BOOLEAN DEFAULT FALSE,
    structured_data TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON public.jobs(employer_id);

-- 10. Job Requirements Table
CREATE TABLE IF NOT EXISTS public.job_requirements (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) UNIQUE NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    required_skills TEXT DEFAULT '[]',
    preferred_skills TEXT DEFAULT '[]',
    min_experience_years REAL DEFAULT 0.0,
    hard_constraints TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Matches Table (Deterministic formula: 0.35K + 0.25E + 0.20R + 0.10P + 0.10D)
CREATE TABLE IF NOT EXISTS public.matches (
    id VARCHAR(64) PRIMARY KEY,
    candidate_id VARCHAR(64) NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    job_id VARCHAR(64) NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    score REAL DEFAULT 0.0,
    score_breakdown TEXT DEFAULT '{}',
    explanation TEXT DEFAULT '',
    matched_skills TEXT DEFAULT '[]',
    missing_skills TEXT DEFAULT '[]',
    strengths TEXT DEFAULT '[]',
    match_version VARCHAR(32) DEFAULT '2.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_candidate_job_match UNIQUE(candidate_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_matches_score ON public.matches(score DESC);

-- 12. Applications Table (Daily 10:00 AM Dispatches & Outreach)
CREATE TABLE IF NOT EXISTS public.applications (
    id VARCHAR(64) PRIMARY KEY,
    candidate_id VARCHAR(64) NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    job_id VARCHAR(64) NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    status VARCHAR(64) DEFAULT 'submitted', -- submitted | in_review | recruiter_contacted | interviewing | rejected | accepted
    source VARCHAR(64) DEFAULT 'auto_10am', -- auto_10am | manual | recruiter_outreach
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    generated_answers TEXT DEFAULT '{}',
    consent_verified INTEGER DEFAULT 1,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_candidate_job_application UNIQUE(candidate_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);

-- 13. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id VARCHAR(64) PRIMARY KEY,
    candidate_id VARCHAR(64) NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    recruiter_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    job_id VARCHAR(64) REFERENCES public.jobs(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    candidate_unread_count INTEGER DEFAULT 0,
    recruiter_unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(64),
    job_id VARCHAR(64) REFERENCES public.jobs(id) ON DELETE SET NULL,
    content TEXT DEFAULT '',
    body TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- 15. Email Outbox Table (Idempotent Transactional Outbox)
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id VARCHAR(64) PRIMARY KEY,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) DEFAULT '',
    subject VARCHAR(255) NOT NULL,
    template VARCHAR(64) DEFAULT 'notification',
    payload TEXT DEFAULT '{}',
    status VARCHAR(32) DEFAULT 'pending', -- pending | sent | failed
    attempts INTEGER DEFAULT 0,
    error_message TEXT DEFAULT '',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_key ON public.email_outbox(idempotency_key);

-- 16. Recruiter Waitlist Table
CREATE TABLE IF NOT EXISTS public.recruiter_waitlist (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_website VARCHAR(512) DEFAULT '',
    hiring_needs TEXT DEFAULT '',
    status VARCHAR(32) DEFAULT 'pending_review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_recruiter_waitlist_email ON public.recruiter_waitlist(email);

-- 17. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_tokens ON public.password_reset_tokens(token);

-- 18. Supabase Storage Bucket Setup (for secure resume PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policy
CREATE POLICY "Authenticated users can upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Recruiters and candidates can view authorized resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes');
