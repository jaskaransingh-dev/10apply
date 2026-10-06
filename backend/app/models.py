import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from .database import Base

def uid():
    return uuid.uuid4().hex[:12]

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=uid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="candidate")  # candidate | employer
    # Invite system: every user owns one code; each code works 5 times.
    # invited_by stores the inviter's user id ("" when founder / legacy).
    invite_code = Column(String, unique=True, index=True, default="")
    invited_by = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

INVITE_LIMIT = 5


class WaitlistEntry(Base):
    """Public waitlist (gated launch): resume-extracted candidates + employer
    leads. Everyone who joins gets a personal 5-use invite code. Not a user —
    the app itself stays members-only."""
    __tablename__ = "waitlist"
    id = Column(String, primary_key=True, default=uid)
    side = Column(String, default="candidate")  # candidate | employer
    name = Column(String, default="")
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, default="")
    location = Column(String, default="")
    company = Column(String, default="")       # employers: hiring company
    hiring_notes = Column(String, default="")  # employers: what they're hiring
    resume_text = Column(Text, default="")
    skills = Column(Text, default="[]")        # JSON list (extracted)
    invite_code = Column(String, unique=True, index=True, default="")
    uses = Column(Integer, default=0)          # invite-code redemptions (max 5)
    created_at = Column(DateTime, default=datetime.utcnow)

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True)
    name = Column(String, default="")
    location = Column(String, default="")
    salary_min = Column(Integer, default=0)
    resume_url = Column(String, default="")
    resume_text = Column(Text, default="")
    profile_data = Column(Text, default="{}")  # JSON string
    # preferences flattened for easy filtering
    roles = Column(Text, default="[]")
    locations = Column(Text, default="[]")
    remote = Column(Integer, default=1)
    employment_types = Column(Text, default='["Full-time"]')
    experience_level = Column(String, default="New Grad")
    updated_at = Column(DateTime, default=datetime.utcnow)

class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=uid)
    employer_id = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String, default="")
    company = Column(String, default="")
    description = Column(Text, default="")
    location = Column(String, default="")
    work_arrangement = Column(String, default="On-site")  # Remote | Hybrid | On-site
    salary_min = Column(Integer, default=0)
    salary_max = Column(Integer, default=0)
    employment_type = Column(String, default="Full-time")
    experience = Column(String, default="0-3 years")
    required_skills = Column(Text, default="[]")
    preferred_skills = Column(Text, default="[]")
    status = Column(String, default="draft")  # draft | active
    structured_data = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, ForeignKey("candidate_profiles.id"), index=True)
    job_id = Column(String, ForeignKey("jobs.id"), index=True)
    status = Column(String, default="Submitted")
    source = Column(String, default="manual")  # manual | auto (10am auto-apply)
    applied_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=uid)
    sender_id = Column(String, index=True)
    receiver_id = Column(String, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True)
    body = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class DailyPick(Base):
    __tablename__ = "daily_picks"
    id = Column(String, primary_key=True, default=uid)
    candidate_id = Column(String, index=True)
    day = Column(String, index=True)  # YYYY-MM-DD
    job_ids = Column(Text, default="[]")  # stable ordering for the day

class EmailLog(Base):
    __tablename__ = "email_log"
    id = Column(String, primary_key=True, default=uid)
    to_email = Column(String, index=True, default="")
    subject = Column(String, default="")
    body = Column(Text, default="")
    status = Column(String, default="logged")  # sent | logged | failed
    info = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class AutoApplyLog(Base):
    __tablename__ = "auto_apply_log"
    id = Column(String, primary_key=True, default=uid)
    day = Column(String, unique=True, index=True)  # YYYY-MM-DD
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
