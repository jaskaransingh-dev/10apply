import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, Boolean
from .database import Base

def uid():
    return uuid.uuid4().hex[:12]

INVITE_LIMIT = 5

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=uid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="candidate")  # candidate | recruiter | employer | admin
    account_status = Column(String, default="active")  # active | pending_verification | suspended
    invite_code = Column(String, unique=True, index=True, default="")
    invited_by = Column(String, default="")
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Invitation(Base):
    """Candidate single-use invite system with token redemption and tracking."""
    __tablename__ = "invitations"
    id = Column(String, primary_key=True, default=uid)
    inviter_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    invitee_id = Column(String, ForeignKey("users.id"), index=True, nullable=True)
    token = Column(String, unique=True, index=True, nullable=False)
    recipient_email = Column(String, default="")
    status = Column(String, default="pending")  # pending | accepted | expired | revoked
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)


class Company(Base):
    """Company profile registered by founders or recruiters."""
    __tablename__ = "companies"
    id = Column(String, primary_key=True, default=uid)
    employer_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, default="")
    website = Column(String, default="")
    work_email = Column(String, default="")
    verified = Column(Integer, default=1)
    industry = Column(String, default="Technology")
    stage = Column(String, default="Seed")
    size = Column(String, default="1-10")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class RecruiterProfile(Base):
    """Minimal recruiter identity and company membership."""
    __tablename__ = "recruiter_profiles"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    company_name = Column(String, default="")
    company_website = Column(String, default="")
    role_title = Column(String, default="Recruiter")
    verified = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CandidateProfile(Base):
    """Minimal candidate settings, parsed info, and preferences."""
    __tablename__ = "candidate_profiles"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True)
    name = Column(String, default="")
    email = Column(String, default="")
    headline = Column(String, default="")
    location = Column(String, default="")
    work_authorization = Column(String, default="Authorized to work in US")
    min_salary = Column(Integer, default=0)
    salary_min = Column(Integer, default=0)  # alias for backwards compatibility
    currency = Column(String, default="USD")
    remote_preference = Column(String, default="Remote")  # Remote | Hybrid | On-site | Any
    work_arrangement = Column(String, default="Remote")  # backwards compat
    remote = Column(Integer, default=1)

    # Preferences & taxonomy
    roles = Column(Text, default="[]")  # JSON list
    functions = Column(Text, default='["Engineering"]')
    seniority = Column(String, default="Mid level")
    industries = Column(Text, default="[]")
    locations = Column(Text, default="[]")
    employment_types = Column(Text, default='["Full-time"]')
    start_date = Column(String, default="Immediately")
    hours_per_week = Column(Integer, default=40)
    experience_level = Column(String, default="2-5 years")

    # Resume & links
    skills = Column(Text, default="[]")  # JSON list
    resume_url = Column(String, default="")
    resume_text = Column(Text, default="")
    portfolio_url = Column(String, default="")
    github_url = Column(String, default="")
    linkedin_url = Column(String, default="")
    profile_data = Column(Text, default="{}")  # JSON parsed resume

    # Questionnaire & Consent
    questionnaire_answers = Column(Text, default="{}")
    auto_apply_consent = Column(Integer, default=1)
    profile_complete = Column(Integer, default=100)

    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Resume(Base):
    """Original file reference, version, and parsing status in private storage."""
    __tablename__ = "resumes"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, ForeignKey("candidate_profiles.id"), index=True, nullable=False)
    filename = Column(String, default="")
    file_path = Column(String, default="")
    storage_key = Column(String, index=True, default="")
    mime_type = Column(String, default="application/pdf")
    file_size = Column(Integer, default=0)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    status = Column(String, default="uploaded")  # uploaded | parsing | parsed | failed
    error_details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResumeParse(Base):
    """Extracted text, structured fields, parser version."""
    __tablename__ = "resume_parses"
    id = Column(String, primary_key=True, default=uid)
    resume_id = Column(String, ForeignKey("resumes.id"), index=True, nullable=False)
    candidate_id = Column(String, ForeignKey("candidate_profiles.id"), index=True, nullable=False)
    raw_text = Column(Text, default="")
    parsed_name = Column(String, default="")
    parsed_email = Column(String, default="")
    parsed_title = Column(String, default="")
    parsed_skills = Column(Text, default="[]")  # JSON list of {"name": str, "canonical": str, "confidence": float, "evidence": str}
    parsed_experience = Column(Text, default="[]")  # JSON list of {"employer": str, "title": str, "start_date": str, "end_date": str, "evidence": str, "skills": list}
    parsed_education = Column(Text, default="[]")  # JSON list
    parsed_projects = Column(Text, default="[]")  # JSON list of {"name": str, "url": str, "description": str, "technologies": list}
    total_experience_years = Column(Float, default=0.0)
    parser_version = Column(String, default="2.0.0")
    status = Column(String, default="parsed")  # parsed | failed
    error_details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CandidateProject(Base):
    """Optional portfolio links, GitHub repositories, and project attachments."""
    __tablename__ = "candidate_projects"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, ForeignKey("candidate_profiles.id"), index=True, nullable=False)
    label = Column(String, default="")
    title = Column(String, default="")  # backwards compat
    url = Column(String, default="")
    repo_url = Column(String, default="")  # backwards compat
    demo_url = Column(String, default="")  # backwards compat
    project_type = Column(String, default="github")  # github | demo | portfolio | video | other
    description = Column(Text, default="")
    contribution = Column(Text, default="")
    technologies = Column(Text, default="[]")  # JSON list
    is_private_demo = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    """Published and draft job postings."""
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=uid)
    employer_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)  # recruiter user id
    recruiter_id = Column(String, ForeignKey("users.id"), index=True, nullable=True)  # alias
    company_id = Column(String, ForeignKey("companies.id"), nullable=True, index=True)
    company = Column(String, default="")
    company_name = Column(String, default="")
    company_website = Column(String, default="")
    title = Column(String, default="")
    function = Column(String, default="Engineering")
    seniority = Column(String, default="Mid level")
    employment_type = Column(String, default="Full-time")
    work_arrangement = Column(String, default="Remote")  # Remote | Hybrid | On-site
    remote_policy = Column(String, default="Remote")
    location = Column(String, default="Remote")
    experience = Column(String, default="2-5 years")
    salary_min = Column(Integer, default=0)
    salary_max = Column(Integer, default=0)
    currency = Column(String, default="USD")
    description = Column(Text, default="")
    responsibilities = Column(Text, default="")
    required_skills = Column(Text, default="[]")
    preferred_skills = Column(Text, default="[]")
    application_questions = Column(Text, default="[]")
    sponsorship_policy = Column(String, default="Will sponsor")
    status = Column(String, default="published")  # published | draft | closed | active
    is_demo = Column(Boolean, default=False)
    structured_data = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobRequirement(Base):
    """Structured requirements, canonical skills, constraints, and preferences."""
    __tablename__ = "job_requirements"
    id = Column(String, primary_key=True, default=uid)
    job_id = Column(String, ForeignKey("jobs.id"), index=True, unique=True, nullable=False)
    required_skills = Column(Text, default="[]")  # JSON list of {"name": str, "canonical": str, "weight": float}
    preferred_skills = Column(Text, default="[]")  # JSON list of {"name": str, "canonical": str, "weight": float}
    min_experience_years = Column(Float, default=0.0)
    hard_constraints = Column(Text, default="{}")  # JSON dict (work_authorization, remote_only, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Match(Base):
    """Deterministic candidate-job score (0.0 - 1.0), evidence, and scoring version."""
    __tablename__ = "matches"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, ForeignKey("candidate_profiles.id"), index=True, nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), index=True, nullable=False)
    score = Column(Float, default=0.0)  # 0.0 - 1.0
    score_breakdown = Column(Text, default="{}")  # JSON {"K": float, "E": float, "R": float, "P": float, "D": float}
    explanation = Column(Text, default="")
    matched_skills = Column(Text, default="[]")  # JSON list
    missing_skills = Column(Text, default="[]")  # JSON list
    strengths = Column(Text, default="[]")  # JSON list
    match_version = Column(String, default="2.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Backwards compatibility alias for CandidateJobMatch
CandidateJobMatch = Match


class Application(Base):
    """Explicit candidate applications and persistent status."""
    __tablename__ = "applications"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, ForeignKey("candidate_profiles.id"), index=True, nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), index=True, nullable=False)
    status = Column(String, default="matched")  # matched | in_review | recruiter_contacted | interviewing | rejected | accepted
    source = Column(String, default="match")  # match | manual | recruiter_outreach
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    generated_answers = Column(Text, default="{}")
    consent_verified = Column(Integer, default=1)
    applied_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    """Candidate-recruiter communication thread associated with candidate and optional job."""
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, ForeignKey("candidate_profiles.id"), index=True, nullable=False)
    recruiter_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    candidate_unread_count = Column(Integer, default=0)
    recruiter_unread_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Message(Base):
    """Persistent message content, sender, recipient, and timestamps."""
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=uid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True, index=True)
    sender_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    recipient_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    receiver_id = Column(String, index=True, nullable=True)  # backwards compat
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    content = Column(Text, default="")
    body = Column(Text, default="")  # backwards compat
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    """In-app notification state and delivery status."""
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, default="")
    message = Column(String, default="")
    link = Column(String, default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmailOutbox(Base):
    """Transactional email outbox with idempotency and retry tracking."""
    __tablename__ = "email_outbox"
    id = Column(String, primary_key=True, default=uid)
    idempotency_key = Column(String, unique=True, index=True, nullable=False)
    recipient_email = Column(String, index=True, nullable=False)
    recipient_name = Column(String, default="")
    subject = Column(String, nullable=False)
    template = Column(String, default="recruiter_outreach")
    payload = Column(Text, default="{}")  # JSON metadata
    status = Column(String, default="pending")  # pending | sent | failed
    attempts = Column(Integer, default=0)
    error_message = Column(Text, default="")
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProcessingJob(Base):
    """Background parsing and matching job status and error tracking."""
    __tablename__ = "processing_jobs"
    id = Column(String, primary_key=True, default=uid)
    job_type = Column(String, index=True, nullable=False)  # parse_resume | match_candidate | match_job
    target_id = Column(String, index=True, nullable=False)
    status = Column(String, default="pending")  # pending | processing | completed | failed
    attempts = Column(Integer, default=0)
    error_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Supporting / legacy tables
class MatchingRun(Base):
    __tablename__ = "matching_runs"
    id = Column(String, primary_key=True, default=uid)
    run_key = Column(String, unique=True, index=True)
    run_date = Column(String, index=True)
    timezone = Column(String, default="America/Los_Angeles")
    candidate_count = Column(Integer, default=0)
    jobs_evaluated = Column(Integer, default=0)
    matches_generated = Column(Integer, default=0)
    applications_submitted = Column(Integer, default=0)
    status = Column(String, default="completed")
    metrics = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, index=True, nullable=True)
    event_type = Column(String, index=True, nullable=False)
    description = Column(Text, default="")
    metadata_json = Column(Text, default="{}")
    ip_address = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyPick(Base):
    __tablename__ = "daily_picks"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, index=True)
    day = Column(String, index=True)
    job_ids = Column(Text, default="[]")


class EmailLog(Base):
    __tablename__ = "email_log"
    id = Column(String, primary_key=True, default=uid)
    to_email = Column(String, index=True, default="")
    subject = Column(String, default="")
    body = Column(Text, default="")
    status = Column(String, default="logged")
    info = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class AutoApplyLog(Base):
    __tablename__ = "auto_apply_log"
    id = Column(String, primary_key=True, default=uid)
    day = Column(String, unique=True, index=True)
    ran_at = Column(DateTime, default=datetime.utcnow)
    candidate_count = Column(Integer, default=0)
    applied_count = Column(Integer, default=0)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    token_hash = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    revoked = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class WaitlistEntry(Base):
    __tablename__ = "waitlist"
    id = Column(String, primary_key=True, default=uid)
    side = Column(String, default="candidate")
    name = Column(String, default="")
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, default="")
    location = Column(String, default="")
    company = Column(String, default="")
    hiring_notes = Column(String, default="")
    resume_text = Column(Text, default="")
    skills = Column(Text, default="[]")
    invite_code = Column(String, unique=True, index=True, default="")
    uses = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    """Temporary tokens for secure password reset requests."""
    __tablename__ = "password_reset_tokens"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RecruiterWaitlistEntry(Base):
    """Waitlist entries for recruiters requesting hiring platform access."""
    __tablename__ = "recruiter_waitlist"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String, nullable=False)
    company_website = Column(String, default="")
    hiring_needs = Column(Text, default="")
    status = Column(String, default="pending_review")  # pending_review | approved | rejected
    created_at = Column(DateTime, default=datetime.utcnow)

