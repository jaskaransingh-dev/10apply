-- ==============================================================================
-- rec - Cloudflare D1 Database Schema
-- Distributed SQL Database for Candidates, Recruiters & Matching Engine
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'candidate', -- candidate | recruiter | employer | admin
    account_status TEXT DEFAULT 'active',    -- active | pending_verification | suspended
    invite_code TEXT UNIQUE DEFAULT '',
    invited_by TEXT DEFAULT '',
    is_demo INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Invitations Table (Single-use token tracking)
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL,
    recipient_email TEXT DEFAULT '',
    status TEXT DEFAULT 'pending', -- pending | accepted | expired | revoked
    created_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT,
    expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);

-- 3. Candidate Profiles Table
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    headline TEXT DEFAULT '',
    location TEXT DEFAULT '',
    work_authorization TEXT DEFAULT 'Authorized to work in US (Citizen or PR)',
    min_salary INTEGER DEFAULT 0,
    salary_min INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    remote_preference TEXT DEFAULT 'Remote',
    work_arrangement TEXT DEFAULT 'Remote',
    remote INTEGER DEFAULT 1,
    roles TEXT DEFAULT '[]',
    functions TEXT DEFAULT '["Engineering"]',
    seniority TEXT DEFAULT 'Mid level',
    industries TEXT DEFAULT '[]',
    locations TEXT DEFAULT '[]',
    employment_types TEXT DEFAULT '["Full-time"]',
    start_date TEXT DEFAULT 'Immediately',
    hours_per_week INTEGER DEFAULT 40,
    experience_level TEXT DEFAULT '2-5 years',
    skills TEXT DEFAULT '[]',
    resume_url TEXT DEFAULT '',
    resume_text TEXT DEFAULT '',
    portfolio_url TEXT DEFAULT '',
    github_url TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    profile_data TEXT DEFAULT '{}',
    questionnaire_answers TEXT DEFAULT '{}',
    auto_apply_consent INTEGER DEFAULT 1,
    profile_complete INTEGER DEFAULT 100,
    is_demo INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user ON candidate_profiles(user_id);

-- 4. Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    filename TEXT DEFAULT '',
    file_path TEXT DEFAULT '',
    storage_key TEXT DEFAULT '',
    mime_type TEXT DEFAULT 'application/pdf',
    file_size INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    status TEXT DEFAULT 'parsed',
    error_details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resumes_candidate ON resumes(candidate_id);

-- 5. Resume Parses Table
CREATE TABLE IF NOT EXISTS resume_parses (
    id TEXT PRIMARY KEY,
    resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    candidate_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    raw_text TEXT DEFAULT '',
    parsed_name TEXT DEFAULT '',
    parsed_email TEXT DEFAULT '',
    parsed_title TEXT DEFAULT '',
    parsed_skills TEXT DEFAULT '[]',
    parsed_experience TEXT DEFAULT '[]',
    parsed_education TEXT DEFAULT '[]',
    parsed_projects TEXT DEFAULT '[]',
    total_experience_years REAL DEFAULT 0.0,
    parser_version TEXT DEFAULT '2.0.0',
    status TEXT DEFAULT 'parsed',
    error_details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. Candidate Projects Table
CREATE TABLE IF NOT EXISTS candidate_projects (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    label TEXT DEFAULT '',
    title TEXT DEFAULT '',
    url TEXT DEFAULT '',
    repo_url TEXT DEFAULT '',
    demo_url TEXT DEFAULT '',
    project_type TEXT DEFAULT 'github',
    description TEXT DEFAULT '',
    contribution TEXT DEFAULT '',
    technologies TEXT DEFAULT '[]',
    is_private_demo INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT DEFAULT '',
    website TEXT DEFAULT '',
    work_email TEXT DEFAULT '',
    verified INTEGER DEFAULT 1,
    industry TEXT DEFAULT 'Technology',
    stage TEXT DEFAULT 'Seed',
    size TEXT DEFAULT '1-10',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Recruiter Profiles Table
CREATE TABLE IF NOT EXISTS recruiter_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT DEFAULT '',
    company_website TEXT DEFAULT '',
    role_title TEXT DEFAULT 'Recruiter',
    verified INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 9. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recruiter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    company TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    company_website TEXT DEFAULT '',
    title TEXT DEFAULT '',
    function TEXT DEFAULT 'Engineering',
    seniority TEXT DEFAULT 'Mid level',
    employment_type TEXT DEFAULT 'Full-time',
    work_arrangement TEXT DEFAULT 'Remote',
    remote_policy TEXT DEFAULT 'Remote',
    location TEXT DEFAULT 'Remote',
    experience TEXT DEFAULT '2-5 years',
    salary_min INTEGER DEFAULT 0,
    salary_max INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    description TEXT DEFAULT '',
    responsibilities TEXT DEFAULT '',
    required_skills TEXT DEFAULT '[]',
    preferred_skills TEXT DEFAULT '[]',
    application_questions TEXT DEFAULT '[]',
    sponsorship_policy TEXT DEFAULT 'Will sponsor',
    status TEXT DEFAULT 'published',
    is_demo INTEGER DEFAULT 0,
    structured_data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);

-- 10. Job Requirements Table
CREATE TABLE IF NOT EXISTS job_requirements (
    id TEXT PRIMARY KEY,
    job_id TEXT UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    required_skills TEXT DEFAULT '[]',
    preferred_skills TEXT DEFAULT '[]',
    min_experience_years REAL DEFAULT 0.0,
    hard_constraints TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 11. Matches Table (Formula: 0.35K + 0.25E + 0.20R + 0.10P + 0.10D)
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    score REAL DEFAULT 0.0,
    score_breakdown TEXT DEFAULT '{}',
    explanation TEXT DEFAULT '',
    matched_skills TEXT DEFAULT '[]',
    missing_skills TEXT DEFAULT '[]',
    strengths TEXT DEFAULT '[]',
    match_version TEXT DEFAULT '2.0.0',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(score DESC);

-- 12. Applications Table (Daily 10 AM Automated Submissions)
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'submitted', -- submitted | in_review | recruiter_contacted | interviewing | rejected | accepted
    source TEXT DEFAULT 'auto_10am', -- auto_10am | manual | recruiter_outreach
    last_activity_at TEXT DEFAULT (datetime('now')),
    generated_answers TEXT DEFAULT '{}',
    consent_verified INTEGER DEFAULT 1,
    applied_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);

-- 13. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    recruiter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
    last_message_at TEXT DEFAULT (datetime('now')),
    candidate_unread_count INTEGER DEFAULT 0,
    recruiter_unread_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 14. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT,
    job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
    content TEXT DEFAULT '',
    body TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- 15. Email Outbox Table (Idempotent Transactional Email)
CREATE TABLE IF NOT EXISTS email_outbox (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT DEFAULT '',
    subject TEXT NOT NULL,
    template TEXT DEFAULT 'notification',
    payload TEXT DEFAULT '{}',
    status TEXT DEFAULT 'pending', -- pending | sent | failed
    attempts INTEGER DEFAULT 0,
    error_message TEXT DEFAULT '',
    sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_key ON email_outbox(idempotency_key);

-- 16. Recruiter Waitlist Table
CREATE TABLE IF NOT EXISTS recruiter_waitlist (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    company_website TEXT DEFAULT '',
    hiring_needs TEXT DEFAULT '',
    status TEXT DEFAULT 'pending_review',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recruiter_waitlist_email ON recruiter_waitlist(email);

-- 17. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_tokens ON password_reset_tokens(token);
