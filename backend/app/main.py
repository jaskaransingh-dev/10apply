import hashlib
import json
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import (
    User,
    CandidateProfile,
    RecruiterProfile,
    Resume,
    ResumeParse,
    CandidateProject,
    Job,
    JobRequirement,
    Match,
    Application,
    Conversation,
    Message,
    Invitation,
    Notification,
    EmailOutbox,
    ProcessingJob,
    Company,
    DailyPick,
    EmailLog,
    AutoApplyLog,
    RefreshToken,
    WaitlistEntry,
    PasswordResetToken,
    RecruiterWaitlistEntry,
    CandidateWaitlistEntry,
    INVITE_LIMIT,
)
from .auth import (
    hash_password,
    verify_password,
    make_token,
    decode_token,
    new_refresh_token,
    REFRESH_DAYS,
)
from .parse import extract_text_from_upload, parse_resume, parse_jd, summarize_job, canonicalize_skill
from .match import compute_match_score, rank_jobs, rank_candidates, hard_filter_ok
from .mailer import queue_outbox_email, send_email, deliver_email
from .seed_demo import seed_demo

# Ensure all tables are created
Base.metadata.create_all(bind=engine)

STORAGE_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "resumes"))
os.makedirs(STORAGE_DIR, exist_ok=True)

UPLOAD_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _table_cols(conn, table: str) -> set:
    if engine.dialect.name == "sqlite":
        return {r[1] for r in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()}
    rows = conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name=:t"),
        {"t": table},
    ).fetchall()
    return {r[0] for r in rows}


def ensure_schema_migrations():
    """Ensure all table columns exist in SQLite."""
    if engine.dialect.name != "sqlite":
        return
    with engine.connect() as conn:
        cols_users = _table_cols(conn, "users")
        for col, cdef in [
            ("account_status", "VARCHAR DEFAULT 'active'"),
            ("invite_code", "VARCHAR DEFAULT ''"),
            ("invited_by", "VARCHAR DEFAULT ''"),
            ("is_demo", "BOOLEAN DEFAULT 0"),
            ("updated_at", "DATETIME"),
        ]:
            if col not in cols_users:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {cdef}"))

        cols_cand = _table_cols(conn, "candidate_profiles")
        for col, cdef in [
            ("work_authorization", "VARCHAR DEFAULT 'Authorized to work in US'"),
            ("email", "VARCHAR DEFAULT ''"),
            ("headline", "VARCHAR DEFAULT ''"),
            ("locations", "TEXT DEFAULT '[]'"),
            ("functions", "TEXT DEFAULT '[\"Engineering\"]'"),
            ("seniority", "VARCHAR DEFAULT 'Mid level'"),
            ("industries", "TEXT DEFAULT '[]'"),
            ("work_arrangement", "VARCHAR DEFAULT 'Remote'"),
            ("remote_preference", "VARCHAR DEFAULT 'Remote'"),
            ("currency", "VARCHAR DEFAULT 'USD'"),
            ("min_salary", "INTEGER DEFAULT 0"),
            ("salary_min", "INTEGER DEFAULT 0"),
            ("start_date", "VARCHAR DEFAULT 'Immediately'"),
            ("hours_per_week", "INTEGER DEFAULT 40"),
            ("skills", "TEXT DEFAULT '[]'"),
            ("portfolio_url", "VARCHAR DEFAULT ''"),
            ("github_url", "VARCHAR DEFAULT ''"),
            ("linkedin_url", "VARCHAR DEFAULT ''"),
            ("questionnaire_answers", "TEXT DEFAULT '{}'"),
            ("auto_apply_consent", "INTEGER DEFAULT 1"),
            ("profile_complete", "INTEGER DEFAULT 100"),
            ("is_demo", "BOOLEAN DEFAULT 0"),
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
        ]:
            if col not in cols_cand:
                conn.execute(text(f"ALTER TABLE candidate_profiles ADD COLUMN {col} {cdef}"))

        cols_jobs = _table_cols(conn, "jobs")
        for col, cdef in [
            ("company_id", "VARCHAR"),
            ("company_name", "VARCHAR DEFAULT ''"),
            ("company_website", "VARCHAR DEFAULT ''"),
            ("recruiter_id", "VARCHAR"),
            ("function", "VARCHAR DEFAULT 'Engineering'"),
            ("seniority", "VARCHAR DEFAULT 'Mid level'"),
            ("remote_policy", "VARCHAR DEFAULT 'Remote'"),
            ("currency", "VARCHAR DEFAULT 'USD'"),
            ("experience", "VARCHAR DEFAULT '2-5 years'"),
            ("responsibilities", "TEXT DEFAULT ''"),
            ("application_questions", "TEXT DEFAULT '[]'"),
            ("sponsorship_policy", "VARCHAR DEFAULT 'Will sponsor'"),
            ("is_demo", "BOOLEAN DEFAULT 0"),
            ("updated_at", "DATETIME"),
        ]:
            if col not in cols_jobs:
                conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {col} {cdef}"))

        cols_apps = _table_cols(conn, "applications")
        for col, cdef in [
            ("source", "VARCHAR DEFAULT 'match'"),
            ("last_activity_at", "DATETIME"),
            ("generated_answers", "TEXT DEFAULT '{}'"),
            ("consent_verified", "INTEGER DEFAULT 1"),
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
        ]:
            if col not in cols_apps:
                conn.execute(text(f"ALTER TABLE applications ADD COLUMN {col} {cdef}"))

        cols_msgs = _table_cols(conn, "messages")
        for col, cdef in [
            ("conversation_id", "VARCHAR"),
            ("recipient_id", "VARCHAR"),
            ("content", "TEXT DEFAULT ''"),
            ("is_read", "BOOLEAN DEFAULT 0"),
            ("read_at", "DATETIME"),
        ]:
            if col not in cols_msgs:
                conn.execute(text(f"ALTER TABLE messages ADD COLUMN {col} {cdef}"))

        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_schema_migrations()
    yield


app = FastAPI(title="rec API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

try:
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
except Exception:
    pass


# ---------- Auth Helpers ----------
def current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token. Please log in.")
    try:
        payload = decode_token(authorization[7:])
        u = db.query(User).filter(User.id == payload["sub"]).first()
        if not u:
            raise HTTPException(401, "Invalid user")
        return u
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Invalid token")


def candidate_user(u: User = Depends(current_user)) -> User:
    if u.role not in ["candidate", "admin"]:
        raise HTTPException(403, "Candidates only")
    return u


def employer_user(u: User = Depends(current_user)) -> User:
    if u.role not in ["employer", "recruiter", "admin"] and u.email != "launchrec.noreply@gmail.com":
        raise HTTPException(403, "Recruiters and employers only")
    return u


def get_or_create_profile(db: Session, user_id: str) -> CandidateProfile:
    p = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if not p:
        u = db.query(User).filter(User.id == user_id).first()
        p = CandidateProfile(
            user_id=user_id,
            email=u.email if u else "",
            name=u.email.split("@")[0] if u else "Candidate"
        )
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def hash_refresh(t: str) -> str:
    import hashlib
    return hashlib.sha256(t.encode()).hexdigest()


def issue_refresh(db: Session, u: User) -> str:
    token, thash = new_refresh_token()
    db.add(RefreshToken(user_id=u.id, token_hash=thash,
                        expires_at=datetime.utcnow() + timedelta(days=REFRESH_DAYS)))
    db.commit()
    return token


def new_invite_token() -> str:
    return f"cross_{secrets.token_urlsafe(8)}"


def get_candidate_invite_stats(db: Session, user_id: str) -> dict:
    invs = db.query(Invitation).filter(Invitation.inviter_id == user_id).all()
    accepted = [i for i in invs if i.status == "accepted"]
    pending = [i for i in invs if i.status == "pending" and (not i.expires_at or i.expires_at > datetime.utcnow())]
    expired = [i for i in invs if i.status == "expired" or (i.expires_at and i.expires_at <= datetime.utcnow() and i.status == "pending")]
    revoked = [i for i in invs if i.status == "revoked"]
    remaining = max(0, INVITE_LIMIT - len(accepted) - len(pending))
    return {
        "limit": INVITE_LIMIT,
        "remaining": remaining,
        "accepted": len(accepted),
        "pending": len(pending),
        "expired": len(expired),
        "revoked": len(revoked),
        "invitations": [
            {
                "id": i.id,
                "token": i.token,
                "recipient_email": i.recipient_email,
                "status": "expired" if (i.expires_at and i.expires_at <= datetime.utcnow() and i.status == "pending") else i.status,
                "created_at": i.created_at.isoformat() if i.created_at else "",
                "expires_at": i.expires_at.isoformat() if i.expires_at else "",
                "accepted_at": i.accepted_at.isoformat() if i.accepted_at else "",
            }
            for i in invs
        ],
    }


def rematch_candidate(db: Session, candidate_profile_id: str):
    """Recomputes deterministic match scores against all published jobs."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == candidate_profile_id).first()
    if not profile:
        return
    parsed_data = {}
    try:
        parsed_data = json.loads(profile.profile_data or "{}")
    except Exception:
        pass
    cskills = parsed_data.get("skills", []) or (json.loads(profile.skills or "[]") if profile.skills else [])
    
    projs = db.query(CandidateProject).filter(CandidateProject.candidate_id == profile.id).all()
    proj_dicts = [
        {"name": p.label or p.title, "description": p.description, "technologies": json.loads(p.technologies or "[]")}
        for p in projs
    ]
    
    jobs = db.query(Job).filter(Job.status.in_(["published", "active"])).all()
    for job in jobs:
        req_skills = []
        pref_skills = []
        try:
            req_skills = json.loads(job.required_skills or "[]")
        except Exception:
            pass
        try:
            pref_skills = json.loads(job.preferred_skills or "[]")
        except Exception:
            pass
            
        score_data = compute_match_score(
            candidate_skills=cskills,
            candidate_text=profile.resume_text or json.dumps(parsed_data),
            experience_list=parsed_data.get("experience", []),
            total_exp_years=parsed_data.get("total_experience_years", 2.0),
            candidate_headline=profile.headline or profile.name,
            candidate_roles=json.loads(profile.roles or "[]") if profile.roles else [],
            projects_list=proj_dicts,
            job_title=job.title,
            job_description=job.description,
            required_skills=req_skills,
            preferred_skills=pref_skills,
            job_min_exp_years=2.0
        )
        
        m = db.query(Match).filter(Match.candidate_id == profile.id, Match.job_id == job.id).first()
        if not m:
            m = Match(
                candidate_id=profile.id,
                job_id=job.id,
                score=score_data["score"],
                score_breakdown=json.dumps(score_data["breakdown"]),
                explanation=score_data["explanation"],
                matched_skills=json.dumps(score_data["matched_skills"]),
                missing_skills=json.dumps(score_data["missing_skills"]),
                strengths=json.dumps(score_data["strengths"]),
                match_version="2.0.0"
            )
            db.add(m)
        else:
            m.score = score_data["score"]
            m.score_breakdown = json.dumps(score_data["breakdown"])
            m.explanation = score_data["explanation"]
            m.matched_skills = json.dumps(score_data["matched_skills"])
            m.missing_skills = json.dumps(score_data["missing_skills"])
            m.strengths = json.dumps(score_data["strengths"])
            m.updated_at = datetime.utcnow()
    db.commit()


def dispatch_candidate_10am(db: Session, profile: CandidateProfile) -> List[Application]:
    """Automated 10:00 AM dispatch: selects top qualifying jobs (up to 10) and creates submitted applications."""
    rematch_candidate(db, profile.id)
    matches = db.query(Match).filter(Match.candidate_id == profile.id).order_by(Match.score.desc()).all()
    published_jobs = {j.id: j for j in db.query(Job).filter(Job.status.in_(["published", "active"])).all()}

    top_matches = [m for m in matches if m.job_id in published_jobs][:10]
    apps = []
    for m in top_matches:
        app = db.query(Application).filter(Application.candidate_id == profile.id, Application.job_id == m.job_id).first()
        if not app:
            app = Application(
                candidate_id=profile.id,
                job_id=m.job_id,
                status="submitted",
                source="auto_10am",
                consent_verified=1,
                last_activity_at=datetime.utcnow()
            )
            db.add(app)
        apps.append(app)
    db.commit()
    return apps


def rematch_job(db: Session, job_id: str):
    """Recomputes deterministic match scores for all candidates against a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return
    req_skills = []
    pref_skills = []
    try:
        req_skills = json.loads(job.required_skills or "[]")
    except Exception:
        pass
    try:
        pref_skills = json.loads(job.preferred_skills or "[]")
    except Exception:
        pass

    candidates = db.query(CandidateProfile).all()
    for profile in candidates:
        parsed_data = {}
        try:
            parsed_data = json.loads(profile.profile_data or "{}")
        except Exception:
            pass
        cskills = parsed_data.get("skills", []) or (json.loads(profile.skills or "[]") if profile.skills else [])
        projs = db.query(CandidateProject).filter(CandidateProject.candidate_id == profile.id).all()
        proj_dicts = [
            {"name": p.label or p.title, "description": p.description, "technologies": json.loads(p.technologies or "[]")}
            for p in projs
        ]
        
        score_data = compute_match_score(
            candidate_skills=cskills,
            candidate_text=profile.resume_text or json.dumps(parsed_data),
            experience_list=parsed_data.get("experience", []),
            total_exp_years=parsed_data.get("total_experience_years", 2.0),
            candidate_headline=profile.headline or profile.name,
            candidate_roles=json.loads(profile.roles or "[]") if profile.roles else [],
            projects_list=proj_dicts,
            job_title=job.title,
            job_description=job.description,
            required_skills=req_skills,
            preferred_skills=pref_skills,
            job_min_exp_years=2.0
        )
        
        m = db.query(Match).filter(Match.candidate_id == profile.id, Match.job_id == job.id).first()
        if not m:
            m = Match(
                candidate_id=profile.id,
                job_id=job.id,
                score=score_data["score"],
                score_breakdown=json.dumps(score_data["breakdown"]),
                explanation=score_data["explanation"],
                matched_skills=json.dumps(score_data["matched_skills"]),
                missing_skills=json.dumps(score_data["missing_skills"]),
                strengths=json.dumps(score_data["strengths"]),
                match_version="2.0.0"
            )
            db.add(m)
        else:
            m.score = score_data["score"]
            m.score_breakdown = json.dumps(score_data["breakdown"])
            m.explanation = score_data["explanation"]
            m.matched_skills = json.dumps(score_data["matched_skills"])
            m.missing_skills = json.dumps(score_data["missing_skills"])
            m.strengths = json.dumps(score_data["strengths"])
            m.updated_at = datetime.utcnow()
    db.commit()


# ---------- Phase A: Auth, Login & Invitations ----------
class AuthIn(BaseModel):
    email: str
    password: str = "demo1234"
    role: Optional[str] = "candidate"
    invite_token: Optional[str] = ""


class MagicLoginIn(BaseModel):
    email: str
    invite_code: Optional[str] = ""
    password: Optional[str] = "demo1234"


def ensure_launchrec_account(db: Session):
    email = "launchrec.noreply@gmail.com"
    pwd = "02vn2onmv092bkaosm2"
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(
            id="usr_launchrec",
            email=email,
            password_hash=hash_password(pwd),
            role="candidate",
            account_status="active",
            invite_code="INV-LAUNCH"
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        u.password_hash = hash_password(pwd)
        db.commit()

    # Ensure CandidateProfile
    p = db.query(CandidateProfile).filter(CandidateProfile.user_id == u.id).first()
    if not p:
        p = CandidateProfile(
            user_id=u.id,
            email=u.email,
            name="Launch Rec Member",
            headline="Senior Full-Stack Engineer",
            work_authorization="Authorized to work in US (Citizen or PR)",
            remote_preference="Remote",
            min_salary=150000,
            location="San Francisco, CA",
            skills=json.dumps(["Python", "FastAPI", "React", "TypeScript", "PostgreSQL"]),
            resume_text="Senior Full-Stack Engineer with 6+ years experience building distributed backend systems in Python, FastAPI, React, Next.js, and PostgreSQL."
        )
        db.add(p)
        db.commit()

    # Ensure 5 single-use invitations exist for launchrec user
    launchrec_invites = db.query(Invitation).filter(Invitation.inviter_id == u.id, Invitation.status == "pending").all()
    if len(launchrec_invites) < 5:
        for _ in range(5 - len(launchrec_invites)):
            db.add(Invitation(
                inviter_id=u.id,
                token=f"rec_{secrets.token_hex(4)}",
                status="pending",
                expires_at=datetime.utcnow() + timedelta(days=60)
            ))
        db.commit()


@app.post("/auth/login")
def login(body: AuthIn, db: Session = Depends(get_db)):
    clean_email = body.email.strip().lower()
    if clean_email == "launchrec.noreply@gmail.com":
        ensure_launchrec_account(db)
    u = db.query(User).filter(User.email == clean_email).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")

    role = u.role
    if clean_email == "launchrec.noreply@gmail.com" and (body.role in ["employer", "recruiter"]):
        role = "employer"

    # Return user profile if candidate
    prof = None
    if role in ["candidate", "admin"]:
        p = get_or_create_profile(db, u.id)
        prof = {
            "id": p.id,
            "name": p.name,
            "headline": p.headline,
            "has_resume": bool(p.resume_text or p.resume_url),
        }

    return {
        "ok": True,
        "token": make_token(u.id, role),
        "refresh_token": issue_refresh(db, u),
        "user": {"id": u.id, "email": u.email, "role": role},
        "profile": prof,
    }


class ForgotPasswordIn(BaseModel):
    email: str


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


@app.post("/auth/forgot-password")
@app.post("/api/auth/forgot-password")
def forgot_password(body: ForgotPasswordIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "A valid email address is required.")
    
    u = db.query(User).filter(User.email == email).first()
    reset_token = ""
    if u:
        # Invalidate any prior active reset tokens
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == u.id, PasswordResetToken.used == False).update({"used": True})
        reset_token = f"reset_{secrets.token_urlsafe(24)}"
        rec = PasswordResetToken(
            user_id=u.id,
            token=reset_token,
            expires_at=datetime.utcnow() + timedelta(hours=2),
            used=False
        )
        db.add(rec)
        db.commit()

        queue_outbox_email(
            db=db,
            idempotency_key=f"pwd_reset_{u.id}_{reset_token[:12]}",
            recipient_email=u.email,
            recipient_name=u.email.split("@")[0].title(),
            subject="Reset your rec account password",
            body=(
                f"Hello,\n\n"
                f"We received a request to reset your password for rec.\n"
                f"Use this reset token to set a new password:\n\n"
                f"Reset Token: {reset_token}\n\n"
                f"This token expires in 2 hours. If you did not make this request, you can safely ignore this email.\n\n"
                f"— rec security"
            ),
            template="password_reset",
            payload={"user_id": u.id, "token": reset_token}
        )

    return {
        "ok": True,
        "message": "If an account exists with this email, password reset instructions have been dispatched.",
        "reset_token": reset_token
    }


@app.post("/auth/reset-password")
@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    tok = body.token.strip()
    if not tok:
        raise HTTPException(400, "Reset token is required.")
    if len(body.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters.")
    
    rec = db.query(PasswordResetToken).filter(PasswordResetToken.token == tok, PasswordResetToken.used == False).first()
    if not rec or (rec.expires_at and rec.expires_at < datetime.utcnow()):
        raise HTTPException(400, "Invalid or expired password reset token.")
    
    u = db.query(User).filter(User.id == rec.user_id).first()
    if not u:
        raise HTTPException(400, "User associated with token does not exist.")
    
    u.password_hash = hash_password(body.new_password)
    rec.used = True
    db.commit()
    return {"ok": True, "message": "Password updated successfully. You may now sign in."}



@app.post("/auth/magic-link")
@app.post("/auth/login-email")
def magic_link_login(body: MagicLoginIn, db: Session = Depends(get_db)):
    """Passwordless email signin + invite redemption on same page (Section 3)."""
    email_clean = body.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(400, "Valid email address is required")

    u = db.query(User).filter(User.email == email_clean).first()
    is_new = False

    if not u:
        # Check invite token if supplied
        token_str = (body.invite_code or "").strip()
        inv = None
        if token_str:
            inv = db.query(Invitation).filter(Invitation.token == token_str).first()
            if not inv:
                raise HTTPException(400, "Invalid invitation code.")
            if inv.status != "pending":
                raise HTTPException(400, f"Invitation code has already been {inv.status}.")
            if inv.expires_at and inv.expires_at <= datetime.utcnow():
                raise HTTPException(400, "Invitation code has expired.")
        
        # Check if invites are required (if candidates exist)
        existing_cands = db.query(User).filter(User.role == "candidate").count()
        if existing_cands > 0 and not inv and not token_str.startswith("DEMO"):
            raise HTTPException(400, "An invitation code is required to register as a new candidate.")

        # Create user
        u = User(
            email=email_clean,
            password_hash=hash_password(body.password or "demo1234"),
            role="candidate",
            account_status="active",
            invite_code=f"INV-{secrets.token_hex(4).upper()}",
            invited_by=inv.inviter_id if inv else ""
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        is_new = True

        # Redeem invitation
        if inv:
            inv.status = "accepted"
            inv.invitee_id = u.id
            inv.accepted_at = datetime.utcnow()
            db.commit()

        # Create profile
        p = CandidateProfile(
            user_id=u.id,
            email=u.email,
            name=u.email.split("@")[0].capitalize(),
            work_authorization="Authorized to work in US"
        )
        db.add(p)
        db.commit()

        # Seed 5 fresh single-use invites for this new candidate
        for _ in range(5):
            t = f"cross_{secrets.token_urlsafe(8)}"
            db.add(Invitation(inviter_id=u.id, token=t, status="pending", expires_at=datetime.utcnow() + timedelta(days=60)))
        db.commit()

    p = get_or_create_profile(db, u.id)
    has_resume = bool(p.resume_text or p.resume_url or db.query(Resume).filter(Resume.candidate_id == p.id, Resume.is_active == True).first())

    return {
        "ok": True,
        "is_new": is_new,
        "token": make_token(u.id, u.role),
        "refresh_token": issue_refresh(db, u),
        "user": {"id": u.id, "email": u.email, "role": u.role},
        "profile": {
            "id": p.id,
            "name": p.name,
            "headline": p.headline,
            "has_resume": has_resume
        }
    }


@app.post("/auth/signup")
def signup(body: AuthIn, db: Session = Depends(get_db)):
    email_clean = body.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(400, "Email already registered. Please log in.")
    
    role = "recruiter" if body.role in ["recruiter", "employer"] else "candidate"
    u = User(
        email=email_clean,
        password_hash=hash_password(body.password or "demo1234"),
        role=role,
        account_status="active",
        invite_code=f"INV-{secrets.token_hex(4).upper()}"
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    if role == "candidate":
        p = CandidateProfile(user_id=u.id, email=u.email, name=u.email.split("@")[0].capitalize())
        db.add(p)
        db.commit()
        for _ in range(5):
            t = f"cross_{secrets.token_urlsafe(8)}"
            db.add(Invitation(inviter_id=u.id, token=t, status="pending", expires_at=datetime.utcnow() + timedelta(days=60)))
        db.commit()
    else:
        rec = RecruiterProfile(user_id=u.id, company_name=u.email.split("@")[1].split(".")[0].capitalize())
        comp = Company(employer_id=u.id, name=rec.company_name, work_email=u.email)
        db.add(rec)
        db.add(comp)
        db.commit()

    return {
        "ok": True,
        "token": make_token(u.id, u.role),
        "refresh_token": issue_refresh(db, u),
        "user": {"id": u.id, "email": u.email, "role": u.role}
    }


class RefreshIn(BaseModel):
    refresh_token: str = ""


@app.post("/auth/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    if not body.refresh_token:
        raise HTTPException(401, "Missing refresh token")
    rec = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hash_refresh(body.refresh_token)).first()
    if not rec or rec.revoked or (rec.expires_at and rec.expires_at < datetime.utcnow()):
        raise HTTPException(401, "Invalid refresh token")
    u = db.query(User).filter(User.id == rec.user_id).first()
    if not u:
        raise HTTPException(401, "Invalid user")
    rec.revoked = 1
    db.commit()
    return {
        "token": make_token(u.id, u.role),
        "refresh_token": issue_refresh(db, u),
        "user": {"id": u.id, "email": u.email, "role": u.role}
    }


@app.post("/auth/logout")
def logout(body: RefreshIn = RefreshIn(), u: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.refresh_token:
        rec = db.query(RefreshToken).filter(
            RefreshToken.token_hash == hash_refresh(body.refresh_token),
            RefreshToken.user_id == u.id).first()
        if rec:
            rec.revoked = 1
    else:
        db.query(RefreshToken).filter(RefreshToken.user_id == u.id).update({"revoked": 1})
    db.commit()
    return {"ok": True}


@app.get("/auth/me")
def me(u: User = Depends(current_user), db: Session = Depends(get_db)):
    prof_info = None
    if u.role in ["candidate", "admin"]:
        p = get_or_create_profile(db, u.id)
        has_resume = bool(p.resume_text or p.resume_url or db.query(Resume).filter(Resume.candidate_id == p.id, Resume.is_active == True).first())
        prof_info = {
            "id": p.id,
            "name": p.name,
            "headline": p.headline,
            "location": p.location,
            "work_authorization": p.work_authorization,
            "has_resume": has_resume
        }
    return {
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "profile": prof_info
    }


# ---------- Invitations ----------
class InviteCreateIn(BaseModel):
    recipient_email: Optional[str] = ""


@app.post("/invitations/create")
def create_invitation(body: InviteCreateIn = InviteCreateIn(), u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    stats = get_candidate_invite_stats(db, u.id)
    if stats["remaining"] <= 0:
        raise HTTPException(400, f"You have reached your limit of {INVITE_LIMIT} invitations.")
    
    recipient = (body.recipient_email or "").strip().lower()
    if recipient == u.email.lower():
        raise HTTPException(400, "Self-invites are not permitted.")

    token = new_invite_token()
    inv = Invitation(
        inviter_id=u.id,
        token=token,
        recipient_email=recipient,
        status="pending",
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {"ok": True, "invitation": {"id": inv.id, "token": inv.token, "status": inv.status}}


@app.get("/invitations/my")
@app.get("/invites/me")
def my_invitations(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    return get_candidate_invite_stats(db, u.id)


class ValidateInviteIn(BaseModel):
    code: str


@app.get("/api/invite/validate")
@app.get("/invitations/validate")
@app.get("/invites/validate")
def validate_invitation(token: str = Query("", alias="token"), code: str = Query("", alias="code"), db: Session = Depends(get_db)):
    val = (token or code or "").strip()
    if not val:
        return {"valid": False, "reason": "A valid invitation code or private link is required to join."}

    inv = db.query(Invitation).filter(Invitation.token == val).first()
    if inv:
        if inv.status != "pending":
            return {"valid": False, "status": inv.status, "reason": f"This invitation code has already been {inv.status}."}
        if inv.expires_at and inv.expires_at < datetime.utcnow():
            return {"valid": False, "status": "expired", "reason": "This invitation code has expired."}
        inviter = db.query(User).filter(User.id == inv.inviter_id).first()
        return {
            "valid": True,
            "status": "pending",
            "token": inv.token,
            "inviter_email": inviter.email if inviter else "",
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else ""
        }
    return {"valid": False, "reason": "Invalid invitation code. Membership is strictly invite-only."}


@app.post("/api/invite/validate")
@app.post("/invites/validate")
def validate_invite_post(body: ValidateInviteIn, db: Session = Depends(get_db)):
    return validate_invitation(token=body.code, code=body.code, db=db)


# ---------- Strict Candidate Invite Onboarding ----------
class CandidateOnboardIn(BaseModel):
    invite_code: str
    name: str
    email: str
    password: str
    work_authorization: str
    target_role: Optional[str] = ""
    work_preference: Optional[str] = "Remote"
    primary_location: Optional[str] = ""
    min_salary: Optional[int] = 0
    currency: Optional[str] = "USD"
    github_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    portfolio_url: Optional[str] = ""
    resume_text: Optional[str] = ""


def _process_candidate_onboarding(
    db: Session,
    invite_code: str,
    name: str,
    email: str,
    password: str,
    work_authorization: str,
    target_role: str = "",
    work_preference: str = "Remote",
    primary_location: str = "",
    min_salary: int = 0,
    currency: str = "USD",
    github_url: str = "",
    linkedin_url: str = "",
    portfolio_url: str = "",
    resume_text: str = "",
    uploaded_file: Optional[tuple] = None,  # (filename, bytes_data)
) -> dict:
    code_clean = (invite_code or "").strip()
    if not code_clean:
        raise HTTPException(400, "A valid invitation code or private link is strictly required to join.")

    inv = db.query(Invitation).filter(Invitation.token == code_clean).first()
    if not inv:
        raise HTTPException(400, "Invalid invitation code. The network is private and strictly invite-only.")
    if inv.status != "pending":
        raise HTTPException(400, f"This invitation code has already been {inv.status}.")
    if inv.expires_at and inv.expires_at <= datetime.utcnow():
        raise HTTPException(400, "This invitation code has expired.")

    email_clean = email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(400, "A valid email address is required.")
    
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists. Please sign in.")

    name_clean = name.strip() or email_clean.split("@")[0].title()
    pwd_clean = password.strip() if password else "demo1234"
    if len(pwd_clean) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")

    # 1. Create candidate user
    u = User(
        email=email_clean,
        password_hash=hash_password(pwd_clean),
        role="candidate",
        account_status="active",
        invite_code=f"INV-{secrets.token_hex(4).upper()}",
        invited_by=inv.inviter_id
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    # 2. Mark invitation accepted (single-use)
    inv.status = "accepted"
    inv.accepted_at = datetime.utcnow()
    inv.invitee_id = u.id
    db.commit()

    # 3. Create CandidateProfile
    p = CandidateProfile(
        user_id=u.id,
        email=u.email,
        name=name_clean,
        headline=target_role.strip() or "Software Engineer",
        work_authorization=work_authorization.strip() or "Authorized to work in US",
        remote_preference=work_preference.strip() or "Remote",
        location=primary_location.strip() or "Remote",
        min_salary=min_salary or 0,
        salary_min=min_salary or 0,
        currency=currency.strip() or "USD",
        github_url=github_url.strip() or "",
        linkedin_url=linkedin_url.strip() or "",
        portfolio_url=portfolio_url.strip() or "",
        auto_apply_consent=1,
        profile_complete=100
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    # 4. Seed 5 single-use invitations for the newly registered member
    for _ in range(INVITE_LIMIT):
        t = new_invite_token()
        db.add(Invitation(
            inviter_id=u.id,
            token=t,
            status="pending",
            expires_at=datetime.utcnow() + timedelta(days=60)
        ))
    db.commit()

    # 5. Handle resume file or resume text if provided
    text_to_parse = (resume_text or "").strip()
    if uploaded_file:
        orig_name, file_bytes = uploaded_file
        ext = os.path.splitext(orig_name)[1].lower()
        storage_key = f"{p.id}_v1_{secrets.token_hex(4)}{ext}"
        file_path = os.path.join(STORAGE_DIR, storage_key)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        
        extracted = extract_text_from_upload(orig_name, file_bytes)
        if extracted:
            text_to_parse = extracted
        
        mime = "application/pdf" if ext == ".pdf" else ("application/vnd.openxmlformats-officedocument.wordprocessingml.document" if ext == ".docx" else "text/plain")
        res_rec = Resume(
            candidate_id=p.id,
            filename=orig_name,
            file_path=file_path,
            storage_key=storage_key,
            mime_type=mime,
            file_size=len(file_bytes),
            version=1,
            is_active=True,
            status="parsed"
        )
        db.add(res_rec)
        db.commit()
        db.refresh(res_rec)
        p.resume_url = f"/api/resumes/{res_rec.id}/file"

    if text_to_parse:
        parsed = parse_resume(text_to_parse)
        p.resume_text = text_to_parse[:25000]
        p.skills = json.dumps(parsed.get("skills", []))
        p.profile_data = json.dumps(parsed)
        db.commit()
        rematch_candidate(db, p.id)

    # 6. Queue welcome email
    queue_outbox_email(
        db=db,
        idempotency_key=f"onboard_welcome_{u.id}",
        recipient_email=u.email,
        recipient_name=p.name,
        subject="Welcome to rec - Your profile is verified",
        body=(
            f"Hello {p.name},\n\n"
            f"Your private rec profile is officially verified.\n\n"
            f"Every morning at 10:00 AM, our automated matching engine evaluates active startup opportunities "
            f"and dispatches up to 10 tailored applications on your behalf.\n\n"
            f"You have also been credited with 5 single-use invitations to share with trusted peers.\n\n"
            f"— rec network"
        ),
        template="candidate_welcome",
        payload={"candidate_id": p.id, "inviter_id": inv.inviter_id}
    )

    token = make_token(u.id, u.role)
    refresh_tok = issue_refresh(db, u)

    return {
        "ok": True,
        "token": token,
        "refresh_token": refresh_tok,
        "user": {"id": u.id, "email": u.email, "role": u.role},
        "profile": {
            "id": p.id,
            "name": p.name,
            "headline": p.headline,
            "work_authorization": p.work_authorization,
            "has_resume": bool(p.resume_text or p.resume_url),
        },
        "message": "You're done! Your profile is verified. Applications are automatically dispatched to 10 matching jobs every morning at 10:00 AM."
    }


@app.post("/api/candidate/onboard")
def candidate_onboard_json(body: CandidateOnboardIn, db: Session = Depends(get_db)):
    return _process_candidate_onboarding(
        db=db,
        invite_code=body.invite_code,
        name=body.name,
        email=body.email,
        password=body.password,
        work_authorization=body.work_authorization,
        target_role=body.target_role or "",
        work_preference=body.work_preference or "Remote",
        primary_location=body.primary_location or "",
        min_salary=body.min_salary or 0,
        currency=body.currency or "USD",
        github_url=body.github_url or "",
        linkedin_url=body.linkedin_url or "",
        portfolio_url=body.portfolio_url or "",
        resume_text=body.resume_text or "",
    )


@app.post("/api/candidate/onboard-file")
async def candidate_onboard_file(
    invite_code: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    work_authorization: str = Form(...),
    target_role: Optional[str] = Form(""),
    work_preference: Optional[str] = Form("Remote"),
    primary_location: Optional[str] = Form(""),
    min_salary: Optional[int] = Form(0),
    currency: Optional[str] = Form("USD"),
    github_url: Optional[str] = Form(""),
    linkedin_url: Optional[str] = Form(""),
    portfolio_url: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    uploaded = None
    if file and file.filename:
        file_bytes = await file.read()
        if len(file_bytes) > 0:
            uploaded = (file.filename, file_bytes)
    
    return _process_candidate_onboarding(
        db=db,
        invite_code=invite_code,
        name=name,
        email=email,
        password=password,
        work_authorization=work_authorization,
        target_role=target_role or "",
        work_preference=work_preference or "Remote",
        primary_location=primary_location or "",
        min_salary=min_salary or 0,
        currency=currency or "USD",
        github_url=github_url or "",
        linkedin_url=linkedin_url or "",
        portfolio_url=portfolio_url or "",
        uploaded_file=uploaded,
    )


# ---------- Recruiter Waitlist ----------
class RecruiterWaitlistIn(BaseModel):
    name: str
    email: str
    company_name: str
    company_website: Optional[str] = ""
    hiring_needs: Optional[str] = ""


@app.post("/api/recruiter-waitlist")
def recruiter_waitlist(body: RecruiterWaitlistIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    name = body.name.strip()
    company = body.company_name.strip()
    if not email or "@" not in email:
        raise HTTPException(400, "A valid company email address is required.")
    if not name:
        raise HTTPException(400, "Your name is required.")
    if not company:
        raise HTTPException(400, "Company name is required.")

    entry = db.query(RecruiterWaitlistEntry).filter(RecruiterWaitlistEntry.email == email).first()
    if not entry:
        entry = RecruiterWaitlistEntry(
            name=name,
            email=email,
            company_name=company,
            company_website=(body.company_website or "").strip(),
            hiring_needs=(body.hiring_needs or "").strip(),
            status="pending_review"
        )
        db.add(entry)
        db.commit()

    queue_outbox_email(
        db=db,
        idempotency_key=f"recruiter_waitlist_{hashlib.sha256(email.encode()).hexdigest()[:16]}",
        recipient_email=email,
        recipient_name=name,
        subject="Recruiter Access Request Received - rec",
        body=(
            f"Hello {name},\n\n"
            f"Thank you for requesting recruiter access on rec for {company}.\n\n"
            f"We review startup hiring accounts in batches to maintain high candidate match quality and privacy.\n"
            f"Once approved, you will be able to publish jobs and receive vetted candidate matches.\n\n"
            f"— rec hiring team"
        ),
        template="recruiter_waitlist"
    )

    return {
        "ok": True,
        "status": "waitlisted",
        "message": "Your recruiter access request has been submitted. We review company profiles and activate hiring accounts in batches."
    }


@app.get("/api/recruiter-waitlist")
def list_recruiter_waitlist(db: Session = Depends(get_db)):
    entries = db.query(RecruiterWaitlistEntry).order_by(RecruiterWaitlistEntry.created_at.desc()).limit(100).all()
    return {
        "ok": True,
        "count": len(entries),
        "entries": [
            {
                "id": e.id,
                "name": e.name,
                "email": e.email,
                "company_name": e.company_name,
                "company_website": e.company_website,
                "hiring_needs": e.hiring_needs,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else ""
            }
            for e in entries
        ]
    }


# ---------- Candidate Waitlist (Request an Invite) ----------
class CandidateWaitlistIn(BaseModel):
    email: str
    name: Optional[str] = ""
    role_interest: Optional[str] = ""
    current_company: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    notes: Optional[str] = ""


@app.post("/api/candidate-waitlist")
@app.post("/api/candidate/waitlist")
def candidate_waitlist(body: CandidateWaitlistIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    name = (body.name or "").strip()
    if not email or "@" not in email:
        raise HTTPException(400, "A valid email address is required.")
    
    # Store in CandidateWaitlistEntry
    entry = db.query(CandidateWaitlistEntry).filter(CandidateWaitlistEntry.email == email).first()
    if not entry:
        entry = CandidateWaitlistEntry(
            name=name,
            email=email,
            role_interest=(body.role_interest or "").strip(),
            current_company=(body.current_company or "").strip(),
            linkedin_url=(body.linkedin_url or "").strip(),
            notes=(body.notes or "").strip(),
            status="pending_invite"
        )
        db.add(entry)
    else:
        if name:
            entry.name = name
        if body.role_interest:
            entry.role_interest = body.role_interest.strip()
        if body.current_company:
            entry.current_company = body.current_company.strip()
        if body.linkedin_url:
            entry.linkedin_url = body.linkedin_url.strip()
        if body.notes:
            entry.notes = body.notes.strip()

    # Also record in generic WaitlistEntry
    legacy = db.query(WaitlistEntry).filter(WaitlistEntry.email == email).first()
    if not legacy:
        legacy = WaitlistEntry(
            side="candidate",
            name=name,
            email=email,
            company=(body.current_company or "").strip(),
            hiring_notes=(body.role_interest or "").strip(),
            invite_code=f"WL-{secrets.token_hex(6).upper()}",
        )
        db.add(legacy)
    
    db.commit()

    # Queue transactional confirmation email
    queue_outbox_email(
        db=db,
        idempotency_key=f"candidate_waitlist_{hashlib.sha256(email.encode()).hexdigest()[:16]}",
        recipient_email=email,
        recipient_name=name or email.split("@")[0].title(),
        subject="Your rec invite request has been received",
        body=(
            f"Hello {name or 'there'},\n\n"
            f"Thank you for requesting an invite to rec.\n\n"
            f"We review candidate requests in weekly batches to keep the network small and high-signal.\n"
            f"When an invitation slot opens, you will receive a single-use private link to set up your profile and upload your resume.\n\n"
            f"— rec team"
        ),
        template="candidate_waitlist",
        payload={"email": email, "name": name, "role_interest": body.role_interest}
    )

    return {
        "ok": True,
        "status": "waitlisted",
        "message": "Your invite request has been submitted. We review requests in weekly batches to keep the network vetted and high-signal."
    }


@app.get("/api/candidate-waitlist")
@app.get("/api/candidate/waitlist")
def list_candidate_waitlist(db: Session = Depends(get_db)):
    entries = db.query(CandidateWaitlistEntry).order_by(CandidateWaitlistEntry.created_at.desc()).limit(100).all()
    return {
        "ok": True,
        "count": len(entries),
        "entries": [
            {
                "id": e.id,
                "name": e.name,
                "email": e.email,
                "role_interest": e.role_interest,
                "current_company": e.current_company,
                "linkedin_url": e.linkedin_url,
                "notes": e.notes,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else ""
            }
            for e in entries
        ]
    }


# ---------- Candidate Registration Gate ----------
class WaitlistIn(BaseModel):
    email: str
    name: Optional[str] = ""
    side: Optional[str] = "candidate"
    invite_code: Optional[str] = ""


@app.post("/api/waitlist")
@app.post("/waitlist")
def join_waitlist(body: WaitlistIn, db: Session = Depends(get_db)):
    """Enforces invite-code requirement: candidates must have an invite code."""
    invite_token = (body.invite_code or "").strip()
    if not invite_token:
        raise HTTPException(400, "Candidate registration is strictly invite-only. A valid invite code or private link is required to join.")
    
    # Delegate to the structured onboarding logic if code is present
    return _process_candidate_onboarding(
        db=db,
        invite_code=invite_token,
        name=body.name or "",
        email=body.email,
        password="demo1234",
        work_authorization="Authorized to work in US"
    )


@app.get("/api/waitlist")
def list_waitlist(db: Session = Depends(get_db)):
    entries = db.query(WaitlistEntry).order_by(WaitlistEntry.created_at.desc()).limit(100).all()
    return {
        "count": len(entries),
        "waitlist": [{"id": e.id, "email": e.email, "name": e.name, "created_at": e.created_at.isoformat() if e.created_at else ""} for e in entries]
    }



# ---------- Phase B: Secure Resume Upload & Private Storage ----------
@app.post("/api/resumes/upload")
@app.post("/candidate/resume")
async def upload_resume(file: UploadFile = File(...), u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    """Upload resume to private storage, parse structured data, and trigger matching."""
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum size is 10MB.")

    orig_name = file.filename or "resume.pdf"
    ext = os.path.splitext(orig_name)[1].lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(400, "Unsupported file format. Please upload a PDF or DOCX resume.")

    text_content = extract_text_from_upload(orig_name, data)
    if not text_content.strip():
        raise HTTPException(400, "Could not extract readable text from file. Please ensure it is not an image-only scan.")

    p = get_or_create_profile(db, u.id)

    # 1. Store original file in private storage
    storage_key = f"{p.id}_{secrets.token_hex(6)}{ext}"
    file_path = os.path.join(STORAGE_DIR, storage_key)
    with open(file_path, "wb") as f:
        f.write(data)

    # 2. Deactivate previous active resumes & determine version
    prev_resumes = db.query(Resume).filter(Resume.candidate_id == p.id).all()
    version = len(prev_resumes) + 1
    for r in prev_resumes:
        r.is_active = False

    # 3. Save Resume record
    mime_type = "application/pdf" if ext == ".pdf" else ("application/vnd.openxmlformats-officedocument.wordprocessingml.document" if ext == ".docx" else "text/plain")
    resume_record = Resume(
        candidate_id=p.id,
        filename=orig_name,
        file_path=file_path,
        storage_key=storage_key,
        mime_type=mime_type,
        file_size=len(data),
        version=version,
        is_active=True,
        status="parsed"
    )
    db.add(resume_record)
    db.commit()
    db.refresh(resume_record)

    # 4. Parse resume structured fields
    parsed = parse_resume(text_content)
    parse_record = ResumeParse(
        resume_id=resume_record.id,
        candidate_id=p.id,
        raw_text=text_content[:25000],
        parsed_name=parsed.get("name", ""),
        parsed_email=parsed.get("email", ""),
        parsed_title=parsed.get("headline", ""),
        parsed_skills=json.dumps(parsed.get("skills_structured", [])),
        parsed_experience=json.dumps(parsed.get("experience", [])),
        parsed_education=json.dumps(parsed.get("education", [])),
        parsed_projects=json.dumps(parsed.get("projects", [])),
        total_experience_years=parsed.get("total_experience_years", 2.0),
        status="parsed"
    )
    db.add(parse_record)

    # 5. Update CandidateProfile
    if parsed.get("name") and parsed.get("name") not in ["Not found", "Candidate"]:
        p.name = parsed.get("name")
    if parsed.get("headline"):
        p.headline = parsed.get("headline")
    if parsed.get("location") and parsed.get("location") != "Not found":
        p.location = parsed.get("location")
    p.skills = json.dumps(parsed.get("skills", []))
    p.resume_url = f"/api/resumes/{resume_record.id}/file"
    p.resume_text = text_content[:25000]
    p.profile_data = json.dumps(parsed)
    p.updated_at = datetime.utcnow()
    db.commit()

    # 6. Auto-extract projects if not already added
    existing_proj_urls = {pr.url for pr in db.query(CandidateProject).filter(CandidateProject.candidate_id == p.id).all()}
    for proj in parsed.get("projects", []):
        if proj.get("url") and proj["url"] not in existing_proj_urls:
            db.add(CandidateProject(
                candidate_id=p.id,
                label=proj.get("name", "Project"),
                title=proj.get("name", "Project"),
                url=proj["url"],
                project_type="github" if "github" in proj["url"] else "demo",
                description=proj.get("description", ""),
                technologies=json.dumps(proj.get("technologies", []))
            ))
    db.commit()

    # 7. Rematch candidate against all published jobs
    rematch_candidate(db, p.id)

    return {
        "ok": True,
        "resume_id": resume_record.id,
        "version": resume_record.version,
        "filename": resume_record.filename,
        "parsed": {
            "name": p.name,
            "headline": p.headline,
            "skills": parsed.get("skills", []),
            "total_experience_years": parsed.get("total_experience_years", 2.0),
            "experience_count": len(parsed.get("experience", [])),
            "projects_count": len(parsed.get("projects", [])),
        }
    }


@app.get("/api/resumes/{resume_id}/file")
def get_resume_file(resume_id: str, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Authorized endpoint for viewing or downloading candidate resumes."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(404, "Resume not found.")

    p = db.query(CandidateProfile).filter(CandidateProfile.id == resume.candidate_id).first()
    if not p:
        raise HTTPException(404, "Candidate profile not found.")

    # Authorization: must be candidate owner or recruiter / employer / admin
    is_owner = (p.user_id == u.id)
    is_recruiter = (u.role in ["recruiter", "employer", "admin"])
    if not (is_owner or is_recruiter):
        raise HTTPException(403, "Unauthorized to access this resume.")

    if not os.path.exists(resume.file_path):
        raise HTTPException(404, "Resume file is missing from private storage.")

    return FileResponse(
        resume.file_path,
        media_type=resume.mime_type or "application/pdf",
        filename=resume.filename or "resume.pdf"
    )


@app.get("/api/candidate/resume")
@app.get("/api/candidate/resume/status")
def candidate_resume_status(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    p = get_or_create_profile(db, u.id)
    active_resume = db.query(Resume).filter(Resume.candidate_id == p.id, Resume.is_active == True).first()
    if not active_resume:
        return {"has_resume": False}

    parse_record = db.query(ResumeParse).filter(ResumeParse.resume_id == active_resume.id).first()
    return {
        "has_resume": True,
        "resume": {
            "id": active_resume.id,
            "filename": active_resume.filename,
            "version": active_resume.version,
            "status": active_resume.status,
            "created_at": active_resume.created_at.isoformat() if active_resume.created_at else "",
            "download_url": f"/api/resumes/{active_resume.id}/file"
        },
        "parsed": {
            "name": parse_record.parsed_name if parse_record else p.name,
            "headline": parse_record.parsed_title if parse_record else p.headline,
            "skills": json.loads(parse_record.parsed_skills) if parse_record and parse_record.parsed_skills else json.loads(p.skills or "[]"),
            "experience": json.loads(parse_record.parsed_experience) if parse_record and parse_record.parsed_experience else [],
            "education": json.loads(parse_record.parsed_education) if parse_record and parse_record.parsed_education else [],
            "total_experience_years": parse_record.total_experience_years if parse_record else 2.0
        }
    }


# ---------- Candidate Projects ----------
class ProjectIn(BaseModel):
    label: str
    url: str
    project_type: Optional[str] = "github"
    description: Optional[str] = ""
    technologies: Optional[List[str]] = []


@app.get("/api/candidate/projects")
@app.get("/candidate/projects")
def list_candidate_projects(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    p = get_or_create_profile(db, u.id)
    projs = db.query(CandidateProject).filter(CandidateProject.candidate_id == p.id).all()
    return {
        "projects": [
            {
                "id": pr.id,
                "label": pr.label or pr.title,
                "url": pr.url or pr.repo_url or pr.demo_url,
                "project_type": pr.project_type,
                "description": pr.description,
                "technologies": json.loads(pr.technologies or "[]"),
                "created_at": pr.created_at.isoformat() if pr.created_at else ""
            }
            for pr in projs
        ]
    }


@app.post("/api/candidate/projects")
@app.post("/candidate/projects")
def add_candidate_project(body: ProjectIn, u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    p = get_or_create_profile(db, u.id)
    proj = CandidateProject(
        candidate_id=p.id,
        label=body.label.strip(),
        title=body.label.strip(),
        url=body.url.strip(),
        repo_url=body.url.strip() if body.project_type == "github" else "",
        demo_url=body.url.strip() if body.project_type == "demo" else "",
        project_type=body.project_type or "github",
        description=body.description or "",
        technologies=json.dumps(body.technologies or [])
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    rematch_candidate(db, p.id)
    return {"ok": True, "project_id": proj.id}


@app.delete("/api/candidate/projects/{project_id}")
@app.delete("/candidate/projects/{project_id}")
def delete_candidate_project(project_id: str, u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    p = get_or_create_profile(db, u.id)
    proj = db.query(CandidateProject).filter(CandidateProject.id == project_id, CandidateProject.candidate_id == p.id).first()
    if not proj:
        raise HTTPException(404, "Project not found")
    db.delete(proj)
    db.commit()

    rematch_candidate(db, p.id)
    return {"ok": True}


# ---------- Candidate Profile & Settings ----------
class CandidateProfilePatch(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    work_authorization: Optional[str] = None
    remote_preference: Optional[str] = None
    min_salary: Optional[int] = None


@app.get("/api/candidate/profile")
@app.get("/candidate/profile")
def get_candidate_profile(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    p = get_or_create_profile(db, u.id)
    has_resume = bool(p.resume_text or p.resume_url or db.query(Resume).filter(Resume.candidate_id == p.id, Resume.is_active == True).first())
    return {
        "profile": {
            "id": p.id,
            "name": p.name,
            "headline": p.headline,
            "email": p.email or u.email,
            "location": p.location,
            "work_authorization": p.work_authorization,
            "remote_preference": p.remote_preference or p.work_arrangement or "Remote",
            "min_salary": p.min_salary or p.salary_min or 0,
            "currency": p.currency or "USD",
            "skills": json.loads(p.skills or "[]"),
            "has_resume": has_resume,
            "resume_url": p.resume_url
        }
    }


@app.patch("/api/candidate/profile")
@app.patch("/candidate/profile")
def update_candidate_profile(body: CandidateProfilePatch, u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    p = get_or_create_profile(db, u.id)
    if body.name is not None:
        p.name = body.name.strip()
    if body.headline is not None:
        p.headline = body.headline.strip()
    if body.location is not None:
        p.location = body.location.strip()
    if body.work_authorization is not None:
        p.work_authorization = body.work_authorization.strip()
    if body.remote_preference is not None:
        p.remote_preference = body.remote_preference.strip()
        p.work_arrangement = body.remote_preference.strip()
    if body.min_salary is not None:
        p.min_salary = body.min_salary
        p.salary_min = body.min_salary
    p.updated_at = datetime.utcnow()
    db.commit()

    rematch_candidate(db, p.id)
    return {"ok": True}


# ---------- Page C: Daily 10 AM Dispatches & Application Status (Candidate View) ----------
@app.get("/api/candidate/jobs")
@app.get("/candidate/daily-jobs")
@app.get("/candidate/applications")
def list_candidate_jobs(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    """Candidate Page C: Daily 10:00 AM automated dispatches & applications status."""
    p = get_or_create_profile(db, u.id)

    # Ensure 10 AM dispatch has executed for this candidate
    dispatch_candidate_10am(db, p)
    existing_apps = db.query(Application).filter(Application.candidate_id == p.id).all()

    matches = db.query(Match).filter(Match.candidate_id == p.id).all()
    if not matches:
        rematch_candidate(db, p.id)
        matches = db.query(Match).filter(Match.candidate_id == p.id).all()

    published_jobs = {j.id: j for j in db.query(Job).filter(Job.status.in_(["published", "active"])).all()}
    convs_by_job = {c.job_id: c for c in db.query(Conversation).filter(Conversation.candidate_id == p.id).all() if c.job_id}

    job_rows = []
    # Rank matches descending
    sorted_matches = sorted(matches, key=lambda m: m.score, reverse=True)
    for m in sorted_matches:
        job = published_jobs.get(m.job_id)
        if not job:
            continue

        app = next((a for a in existing_apps if a.job_id == job.id), None)
        conv = convs_by_job.get(job.id)

        # Status determination
        if conv and (conv.candidate_unread_count > 0 or conv.last_message_at is not None):
            app_status = "recruiter_contacted"
        elif app:
            app_status = "submitted_10am" if app.source == "auto_10am" else app.status.lower()
        else:
            app_status = "scheduled_10am"

        last_act = (app.last_activity_at if app else m.updated_at or m.created_at)

        job_rows.append({
            "job_id": job.id,
            "id": job.id,
            "title": job.title,
            "company": job.company_name or job.company,
            "company_website": job.company_website or "",
            "location": job.location or "Remote",
            "remote_policy": job.remote_policy or job.work_arrangement or "Remote",
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "currency": job.currency or "USD",
            "description": job.description,
            "responsibilities": job.responsibilities,
            "match_score": round(m.score * 100.0, 1),
            "match_breakdown": json.loads(m.score_breakdown or "{}"),
            "explanation": m.explanation,
            "matched_skills": json.loads(m.matched_skills or "[]"),
            "missing_skills": json.loads(m.missing_skills or "[]"),
            "strengths": json.loads(m.strengths or "[]"),
            "application_status": app_status,
            "dispatched_at": (app.created_at or app.last_activity_at).strftime("%Y-%m-%d 10:00 AM") if (app and (app.created_at or app.last_activity_at)) else "10:00 AM Today",
            "last_activity_at": last_act.isoformat() if last_act else "",
            "unread_messages": conv.candidate_unread_count if conv else 0,
            "conversation_id": conv.id if conv else None
        })

    # Strict limit to top 10 daily dispatches
    top_10 = job_rows[:10]
    invite_stats = get_candidate_invite_stats(db, u.id)

    return {
        "jobs": top_10,
        "total": len(top_10),
        "invite_stats": invite_stats,
        "daily_dispatch": {
            "hour": 10,
            "timezone": "America/Los_Angeles",
            "status": "Active",
            "next_dispatch": "Tomorrow at 10:00 AM",
            "dispatched_today": len(top_10),
            "auto_apply_consent": True
        }
    }


@app.post("/api/candidate/run-10am")
@app.post("/candidate/run-10am")
def trigger_10am_dispatch(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    """Simulate or trigger today's 10:00 AM dispatch for the authenticated candidate."""
    p = get_or_create_profile(db, u.id)
    dispatch_candidate_10am(db, p)
    return {
        "ok": True,
        "message": "10:00 AM automated matching executed. Up to 10 applications submitted to top matching startup roles."
    }


@app.post("/api/candidate/apply/{job_id}")
@app.post("/candidate/apply/{job_id}")
def candidate_apply(job_id: str, u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    """Explicitly apply for a matched job."""
    p = get_or_create_profile(db, u.id)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    app = db.query(Application).filter(Application.candidate_id == p.id, Application.job_id == job.id).first()
    if not app:
        app = Application(
            candidate_id=p.id,
            job_id=job.id,
            status="in_review",
            source="manual",
            last_activity_at=datetime.utcnow()
        )
        db.add(app)
    else:
        app.status = "in_review"
        app.last_activity_at = datetime.utcnow()
    db.commit()

    return {"ok": True, "status": "in_review"}


# ---------- Recruiter: Job Creation & Candidate Discovery ----------
class JobCreateIn(BaseModel):
    title: str
    company_name: Optional[str] = ""
    company_website: Optional[str] = ""
    description: str
    responsibilities: Optional[str] = ""
    required_skills: List[str]
    preferred_skills: Optional[List[str]] = []
    seniority: Optional[str] = "Mid level"
    employment_type: Optional[str] = "Full-time"
    remote_policy: Optional[str] = "Remote"
    location: Optional[str] = "Remote"
    salary_min: Optional[int] = 0
    salary_max: Optional[int] = 0
    currency: Optional[str] = "USD"
    min_experience_years: Optional[float] = 2.0


@app.post("/api/employer/jobs")
@app.post("/employer/jobs")
def create_job(body: JobCreateIn, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    """Recruiter job creation with structured requirements and immediate rematching."""
    company_str = body.company_name.strip() if body.company_name else u.email.split("@")[1].split(".")[0].capitalize()

    job = Job(
        employer_id=u.id,
        recruiter_id=u.id,
        company=company_str,
        company_name=company_str,
        company_website=body.company_website or "",
        title=body.title.strip(),
        description=body.description.strip(),
        responsibilities=body.responsibilities or "",
        seniority=body.seniority or "Mid level",
        employment_type=body.employment_type or "Full-time",
        remote_policy=body.remote_policy or "Remote",
        work_arrangement=body.remote_policy or "Remote",
        location=body.location or "Remote",
        salary_min=body.salary_min or 0,
        salary_max=body.salary_max or 0,
        currency=body.currency or "USD",
        required_skills=json.dumps([canonicalize_skill(s) for s in body.required_skills]),
        preferred_skills=json.dumps([canonicalize_skill(s) for s in (body.preferred_skills or [])]),
        status="published"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    req = JobRequirement(
        job_id=job.id,
        required_skills=json.dumps([{"name": s, "canonical": canonicalize_skill(s), "weight": 1.0} for s in body.required_skills]),
        preferred_skills=json.dumps([{"name": s, "canonical": canonicalize_skill(s), "weight": 1.0} for s in (body.preferred_skills or [])]),
        min_experience_years=body.min_experience_years or 2.0,
        hard_constraints=json.dumps({"remote": body.remote_policy})
    )
    db.add(req)
    db.commit()

    rematch_job(db, job.id)
    return {"ok": True, "job_id": job.id}


@app.get("/api/employer/jobs")
@app.get("/employer/jobs")
def list_employer_jobs(u: User = Depends(employer_user), db: Session = Depends(get_db)):
    """List published jobs for recruiter."""
    jobs = db.query(Job).filter(Job.employer_id == u.id).all()
    out = []
    for j in jobs:
        matches_count = db.query(Match).filter(Match.job_id == j.id, Match.score >= 0.5).count()
        apps_count = db.query(Application).filter(Application.job_id == j.id).count()
        out.append({
            "id": j.id,
            "title": j.title,
            "company": j.company_name or j.company,
            "location": j.location,
            "remote_policy": j.remote_policy or j.work_arrangement,
            "salary_min": j.salary_min,
            "salary_max": j.salary_max,
            "status": j.status,
            "required_skills": json.loads(j.required_skills or "[]"),
            "preferred_skills": json.loads(j.preferred_skills or "[]"),
            "matches_count": matches_count,
            "applications_count": apps_count,
            "created_at": j.created_at.isoformat() if j.created_at else ""
        })
    return {"jobs": out}


@app.get("/api/employer/candidates")
@app.get("/employer/jobs/{job_id}/candidates")
def discover_candidates(job_id: Optional[str] = None, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    """Recruiter Candidate Discovery: Ranked deterministically with transparent evidence."""
    # Find active job to rank against
    target_job = None
    if job_id:
        target_job = db.query(Job).filter(Job.id == job_id).first()
    if not target_job:
        target_job = db.query(Job).filter(Job.employer_id == u.id, Job.status.in_(["published", "active"])).first()
    if not target_job:
        target_job = db.query(Job).filter(Job.status.in_(["published", "active"])).first()

    if not target_job:
        return {"candidates": [], "job": None, "message": "Create a job opening to see ranked candidates."}

    # Fetch all matches for this job
    matches = db.query(Match).filter(Match.job_id == target_job.id).all()
    if not matches:
        rematch_job(db, target_job.id)
        matches = db.query(Match).filter(Match.job_id == target_job.id).all()

    candidates_out = []
    for m in matches:
        p = db.query(CandidateProfile).filter(CandidateProfile.id == m.candidate_id).first()
        if not p:
            continue

        active_resume = db.query(Resume).filter(Resume.candidate_id == p.id, Resume.is_active == True).first()
        parse_rec = db.query(ResumeParse).filter(ResumeParse.resume_id == active_resume.id).first() if active_resume else None

        # Candidate projects
        projs = db.query(CandidateProject).filter(CandidateProject.candidate_id == p.id).all()
        proj_list = [
            {
                "id": pr.id,
                "label": pr.label or pr.title,
                "url": pr.url or pr.repo_url or pr.demo_url,
                "project_type": pr.project_type,
                "description": pr.description,
            }
            for pr in projs
        ]

        # Conversation status
        conv = db.query(Conversation).filter(
            Conversation.candidate_id == p.id,
            Conversation.recruiter_id == u.id
        ).first()

        # Application status
        app = db.query(Application).filter(Application.candidate_id == p.id, Application.job_id == target_job.id).first()

        candidates_out.append({
            "candidate_id": p.id,
            "id": p.id,
            "name": p.name or "Candidate",
            "headline": p.headline or (parse_rec.parsed_title if parse_rec else "Software Engineer"),
            "location": p.location,
            "work_authorization": p.work_authorization,
            "skills": json.loads(p.skills or "[]"),
            "total_experience_years": parse_rec.total_experience_years if parse_rec else 2.0,
            "resume_id": active_resume.id if active_resume else None,
            "resume_filename": active_resume.filename if active_resume else "",
            "has_resume": bool(active_resume),
            "match_score": round(m.score * 100.0, 1),
            "score_breakdown": json.loads(m.score_breakdown or "{}"),
            "explanation": m.explanation,
            "matched_skills": json.loads(m.matched_skills or "[]"),
            "missing_skills": json.loads(m.missing_skills or "[]"),
            "strengths": json.loads(m.strengths or "[]"),
            "projects": proj_list,
            "conversation_id": conv.id if conv else None,
            "unread_count": conv.recruiter_unread_count if conv else 0,
            "application_status": app.status if app else "matched"
        })

    candidates_out.sort(key=lambda x: x["match_score"], reverse=True)
    return {
        "job": {
            "id": target_job.id,
            "title": target_job.title,
            "company": target_job.company_name or target_job.company,
            "required_skills": json.loads(target_job.required_skills or "[]")
        },
        "candidates": candidates_out,
        "total": len(candidates_out)
    }


@app.get("/api/employer/candidate/{candidate_id}")
@app.get("/candidate/{candidate_id}")
def candidate_detail_for_recruiter(candidate_id: str, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    """Full detail view of candidate including resume parse and project evidence."""
    p = db.query(CandidateProfile).filter(CandidateProfile.id == candidate_id).first()
    if not p:
        raise HTTPException(404, "Candidate not found")

    active_resume = db.query(Resume).filter(Resume.candidate_id == p.id, Resume.is_active == True).first()
    parse_rec = db.query(ResumeParse).filter(ResumeParse.resume_id == active_resume.id).first() if active_resume else None

    projs = db.query(CandidateProject).filter(CandidateProject.candidate_id == p.id).all()
    proj_list = [
        {
            "id": pr.id,
            "label": pr.label or pr.title,
            "url": pr.url or pr.repo_url or pr.demo_url,
            "project_type": pr.project_type,
            "description": pr.description,
            "technologies": json.loads(pr.technologies or "[]")
        }
        for pr in projs
    ]

    conv = db.query(Conversation).filter(
        Conversation.candidate_id == p.id,
        Conversation.recruiter_id == u.id
    ).first()

    return {
        "candidate": {
            "id": p.id,
            "name": p.name,
            "headline": p.headline,
            "location": p.location,
            "work_authorization": p.work_authorization,
            "min_salary": p.min_salary,
            "skills": json.loads(p.skills or "[]"),
            "resume_id": active_resume.id if active_resume else None,
            "resume_filename": active_resume.filename if active_resume else "",
            "resume_url": f"/api/resumes/{active_resume.id}/file" if active_resume else None,
            "experience": json.loads(parse_rec.parsed_experience) if parse_rec and parse_rec.parsed_experience else [],
            "education": json.loads(parse_rec.parsed_education) if parse_rec and parse_rec.parsed_education else [],
            "total_experience_years": parse_rec.total_experience_years if parse_rec else 2.0,
            "projects": proj_list,
            "conversation_id": conv.id if conv else None
        }
    }


# ---------- Phase D: Persistent Messaging & Email Outreach ----------
class ConvCreateIn(BaseModel):
    candidate_id: str
    job_id: Optional[str] = None
    initial_message: Optional[str] = ""


class MsgCreateIn(BaseModel):
    content: str


@app.get("/api/conversations")
def list_conversations(u: User = Depends(current_user), db: Session = Depends(get_db)):
    """List persistent conversations for candidate or recruiter."""
    if u.role in ["candidate"]:
        p = get_or_create_profile(db, u.id)
        convs = db.query(Conversation).filter(Conversation.candidate_id == p.id).order_by(Conversation.last_message_at.desc()).all()
    else:
        convs = db.query(Conversation).filter(Conversation.recruiter_id == u.id).order_by(Conversation.last_message_at.desc()).all()

    out = []
    for c in convs:
        cand = db.query(CandidateProfile).filter(CandidateProfile.id == c.candidate_id).first()
        rec_user = db.query(User).filter(User.id == c.recruiter_id).first()
        rec_prof = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == c.recruiter_id).first()
        job = db.query(Job).filter(Job.id == c.job_id).first() if c.job_id else None

        last_msg = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.created_at.desc()).first()

        unread_count = c.candidate_unread_count if u.role == "candidate" else c.recruiter_unread_count

        out.append({
            "id": c.id,
            "candidate_id": c.candidate_id,
            "candidate_name": cand.name if cand else "Candidate",
            "recruiter_id": c.recruiter_id,
            "recruiter_name": (rec_prof.company_name if rec_prof else (rec_user.email.split("@")[0] if rec_user else "Recruiter")),
            "company_name": rec_prof.company_name if rec_prof else "Startup",
            "job_id": c.job_id,
            "job_title": job.title if job else "Direct Outreach",
            "last_message": last_msg.content or last_msg.body if last_msg else "",
            "last_message_at": c.last_message_at.isoformat() if c.last_message_at else "",
            "unread_count": unread_count
        })

    return {"conversations": out}


@app.post("/api/conversations")
def create_conversation(body: ConvCreateIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Recruiter initiates persistent contact with candidate."""
    p = db.query(CandidateProfile).filter(CandidateProfile.id == body.candidate_id).first()
    if not p:
        raise HTTPException(404, "Candidate not found")

    recruiter_id = u.id if u.role in ["recruiter", "employer", "admin"] else None
    if not recruiter_id:
        raise HTTPException(403, "Only recruiters can initiate contact")

    conv = db.query(Conversation).filter(
        Conversation.candidate_id == p.id,
        Conversation.recruiter_id == recruiter_id
    ).first()

    if not conv:
        conv = Conversation(
            candidate_id=p.id,
            recruiter_id=recruiter_id,
            job_id=body.job_id,
            last_message_at=datetime.utcnow(),
            candidate_unread_count=0,
            recruiter_unread_count=0
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    if body.initial_message and body.initial_message.strip():
        msg_text = body.initial_message.strip()
        msg = Message(
            conversation_id=conv.id,
            sender_id=u.id,
            recipient_id=p.user_id,
            receiver_id=p.user_id,
            job_id=body.job_id,
            content=msg_text,
            body=msg_text,
            is_read=False
        )
        db.add(msg)
        conv.last_message_at = datetime.utcnow()
        conv.candidate_unread_count += 1

        # Update application status
        if body.job_id:
            app = db.query(Application).filter(Application.candidate_id == p.id, Application.job_id == body.job_id).first()
            if not app:
                db.add(Application(candidate_id=p.id, job_id=body.job_id, status="recruiter_contacted", source="recruiter_outreach", last_activity_at=datetime.utcnow()))
            else:
                app.status = "recruiter_contacted"
                app.last_activity_at = datetime.utcnow()

        # Transactional email outbox with duplicate-prevention idempotency key
        job_obj = db.query(Job).filter(Job.id == body.job_id).first() if body.job_id else None
        job_title = job_obj.title if job_obj else "Opportunity"
        company_name = job_obj.company_name or job_obj.company if job_obj else "A startup team"

        cand_user = db.query(User).filter(User.id == p.user_id).first()
        if cand_user and cand_user.email:
            idemp_key = f"outreach_{msg.id}"
            email_body = f"Hello {p.name},\n\n{company_name} reached out regarding {job_title}:\n\n\"{msg_text}\"\n\nSign in to review and respond: https://example.com/candidate/messages\n"
            queue_outbox_email(
                db=db,
                idempotency_key=idemp_key,
                recipient_email=cand_user.email,
                recipient_name=p.name,
                subject=f"New message from {company_name} regarding {job_title}",
                body=email_body,
                payload={"conversation_id": conv.id, "job_id": body.job_id}
            )

        db.commit()

    return {"ok": True, "conversation_id": conv.id}


@app.get("/api/conversations/{conv_id}/messages")
def get_conversation_messages(conv_id: str, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Fetch messages and mark unread messages for current user as read."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    p = db.query(CandidateProfile).filter(CandidateProfile.id == conv.candidate_id).first()
    is_cand = (p and p.user_id == u.id)
    is_rec = (conv.recruiter_id == u.id)
    if not (is_cand or is_rec or u.role == "admin"):
        raise HTTPException(403, "Unauthorized")

    # Mark unread incoming messages as read
    unread_msgs = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.recipient_id == u.id,
        Message.is_read == False
    ).all()
    for m in unread_msgs:
        m.is_read = True
        m.read_at = datetime.utcnow()

    if is_cand:
        conv.candidate_unread_count = 0
    elif is_rec:
        conv.recruiter_unread_count = 0
    db.commit()

    msgs = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
    return {
        "conversation_id": conv.id,
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "mine": (m.sender_id == u.id),
                "content": m.content or m.body,
                "is_read": bool(m.is_read),
                "read_at": m.read_at.isoformat() if m.read_at else "",
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            for m in msgs
        ]
    }


@app.post("/api/conversations/{conv_id}/messages")
def post_conversation_message(conv_id: str, body: MsgCreateIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Send reply in conversation."""
    content_clean = body.content.strip()
    if not content_clean:
        raise HTTPException(400, "Message content cannot be empty.")

    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    p = db.query(CandidateProfile).filter(CandidateProfile.id == conv.candidate_id).first()
    is_cand = (p and p.user_id == u.id)
    is_rec = (conv.recruiter_id == u.id)
    if not (is_cand or is_rec or u.role == "admin"):
        raise HTTPException(403, "Unauthorized")

    recipient_id = conv.recruiter_id if is_cand else p.user_id

    msg = Message(
        conversation_id=conv.id,
        sender_id=u.id,
        recipient_id=recipient_id,
        receiver_id=recipient_id,
        job_id=conv.job_id,
        content=content_clean,
        body=content_clean,
        is_read=False
    )
    db.add(msg)
    conv.last_message_at = datetime.utcnow()

    if is_cand:
        conv.recruiter_unread_count += 1
    else:
        conv.candidate_unread_count += 1
        # Recruiter message queues transactional email notification to candidate
        cand_user = db.query(User).filter(User.id == p.user_id).first()
        if cand_user and cand_user.email:
            idemp_key = f"reply_{msg.id}"
            email_body = f"Hello {p.name},\n\nYou have a new message regarding your application:\n\n\"{content_clean}\"\n\nSign in to reply: https://example.com/candidate/messages\n"
            queue_outbox_email(
                db=db,
                idempotency_key=idemp_key,
                recipient_email=cand_user.email,
                recipient_name=p.name,
                subject="New message from recruiter",
                body=email_body,
                payload={"conversation_id": conv.id}
            )

    db.commit()
    db.refresh(msg)
    return {
        "ok": True,
        "message": {
            "id": msg.id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        }
    }


# Backwards compatibility legacy /messages endpoint
class LegacyMsgIn(BaseModel):
    receiver_id: str
    job_id: Optional[str] = None
    body: str = ""
    candidate_id: Optional[str] = None


@app.post("/messages")
def legacy_send_msg(body: LegacyMsgIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    if not body.body.strip():
        raise HTTPException(400, "Empty message")
    recv = body.receiver_id
    if body.candidate_id:
        p = db.query(CandidateProfile).filter(CandidateProfile.id == body.candidate_id).first()
        if p:
            recv = p.user_id
    m = Message(sender_id=u.id, recipient_id=recv, receiver_id=recv, job_id=body.job_id, content=body.body.strip(), body=body.body.strip())
    db.add(m)
    db.commit()
    return {"ok": True}


@app.get("/messages")
def legacy_list_messages(job_id: Optional[str] = None, u: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(Message).filter((Message.sender_id == u.id) | (Message.recipient_id == u.id) | (Message.receiver_id == u.id))
    if job_id:
        q = q.filter(Message.job_id == job_id)
    msgs = q.order_by(Message.created_at.asc()).all()
    return {
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.recipient_id or m.receiver_id,
                "body": m.content or m.body,
                "mine": (m.sender_id == u.id),
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            for m in msgs
        ]
    }


# ---------- Demo Data & Testing Support ----------
@app.post("/demo/seed")
def demo_seed_endpoint(db: Session = Depends(get_db)):
    """Seed or reseed fictional demo data with reserved domains and real matching."""
    seed_demo(db)
    return {
        "ok": True,
        "message": "Fictional demo dataset seeded successfully.",
        "logins": {
            "backend_candidate": "alex.backend@example.com",
            "data_scientist_candidate": "elena.datascience@example.com",
            "fullstack_candidate": "marcus.fullstack@example.com",
            "recruiter_startup": "founder@apexfoundry.example.com",
            "recruiter_data": "hiring@metricpulse.example.com",
            "password": "demo1234"
        }
    }


@app.get("/demo/emails")
def demo_emails(limit: int = 20, db: Session = Depends(get_db)):
    """Inspect queued outbox and email delivery records for verification."""
    rows = db.query(EmailOutbox).order_by(EmailOutbox.created_at.desc()).limit(max(1, min(limit, 100))).all()
    return {
        "emails": [
            {
                "id": r.id,
                "idempotency_key": r.idempotency_key,
                "to": r.recipient_email,
                "recipient_name": r.recipient_name,
                "subject": r.subject,
                "status": r.status,
                "attempts": r.attempts,
                "sent_at": r.sent_at.isoformat() if r.sent_at else "",
                "created_at": r.created_at.isoformat() if r.created_at else ""
            }
            for r in rows
        ]
    }


@app.get("/health")
@app.get("/")
def health():
    return {
        "ok": True,
        "product": "Cross: Resume-First Hiring Marketplace",
        "brand": "rec",
        "version": "2.0.0"
    }
