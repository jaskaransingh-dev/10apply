import json, os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional

from .database import Base, engine, get_db
from .models import User, CandidateProfile, Job, Application, Message, DailyPick, EmailLog, AutoApplyLog, RefreshToken
from .auth import hash_password, verify_password, make_token, decode_token, new_refresh_token, REFRESH_DAYS
from .parse import extract_text_from_upload, parse_resume, parse_jd, summarize_job
from .match import rank_jobs, rank_candidates, hard_filter_ok
from .seed import seed_jobs
from .seed_demo import seed_demo
from .mailer import send_email

Base.metadata.create_all(bind=engine)


def _table_cols(conn, table: str) -> set:
    """Portable column listing (SQLite PRAGMA vs Postgres information_schema)."""
    if engine.dialect.name == "sqlite":
        return {r[1] for r in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()}
    rows = conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name=:t"),
        {"t": table}).fetchall()
    return {r[0] for r in rows}


def ensure_application_source_column():
    """SQLite-era DBs lack applications.source; fresh DBs get it from models."""
    if engine.dialect.name != "sqlite":
        return
    with engine.connect() as conn:
        cols = _table_cols(conn, "applications")
        if "source" not in cols:
            conn.execute(text("ALTER TABLE applications ADD COLUMN source VARCHAR DEFAULT 'manual'"))
        conn.execute(text("UPDATE applications SET source='manual' WHERE source IS NULL"))
        conn.commit()


def ensure_invite_columns():
    """SQLite-era DBs lack users.invite_code / invited_by; fresh DBs get them from models."""
    import secrets as _secrets
    if engine.dialect.name != "sqlite":
        return
    with engine.connect() as conn:
        cols = _table_cols(conn, "users")
        if "invite_code" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN invite_code VARCHAR DEFAULT ''"))
        if "invited_by" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN invited_by VARCHAR DEFAULT ''"))
        conn.commit()
        # Backfill a unique code for every user missing one.
        rows = conn.execute(text("SELECT id FROM users WHERE invite_code IS NULL OR invite_code=''")).fetchall()
        seen = {r[0] for r in conn.execute(text("SELECT invite_code FROM users WHERE invite_code<>''")).fetchall()}
        for (uid_,) in rows:
            while True:
                code = _secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8]
                if code not in seen:
                    seen.add(code)
                    break
            conn.execute(text("UPDATE users SET invite_code=:c WHERE id=:i"), {"c": code, "i": uid_})
        conn.commit()


def new_invite_code(db: Session) -> str:
    import secrets as _secrets
    while True:
        code = _secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8]
        if not db.query(User).filter(User.invite_code == code).first():
            return code


def invite_usage(db: Session, user_id: str) -> tuple:
    """Returns (used, limit, invited_emails) for a user's code."""
    from .models import INVITE_LIMIT
    invited = db.query(User).filter(User.invited_by == user_id).order_by(User.created_at.desc()).all()
    return len(invited), INVITE_LIMIT, [x.email for x in invited]


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_application_source_column()
    ensure_invite_columns()
    # Passive candidates: no auto-apply. Employers reach out by email and the
    # conversation goes back and forth in the inbox. Nothing runs on a schedule.
    yield
UPLOAD_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="10Apply API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
try:
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
except Exception:
    pass

# ---------- helpers ----------
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
    """Candidate side only."""
    if u.role != "candidate":
        raise HTTPException(403, "Candidates only — use the candidate side")
    return u

def employer_user(u: User = Depends(current_user)) -> User:
    """Employer side only."""
    if u.role != "employer":
        raise HTTPException(403, "Employers only — use the employer side")
    return u

def get_or_create_profile(db: Session, user_id: str) -> CandidateProfile:
    p = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if not p:
        p = CandidateProfile(user_id=user_id)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p

def profile_to_dict(p: CandidateProfile) -> dict:
    try:
        data = json.loads(p.profile_data or "{}")
    except Exception:
        data = {}
    def lj(s, d):
        try:
            return json.loads(s or d)
        except Exception:
            return json.loads(d)
    prefs = (data.get("job_preferences") or {}) if data else {}
    return {
        "id": p.id, "name": p.name or data.get("name", ""), "location": p.location,
        "salary_min": p.salary_min, "resume_url": p.resume_url,
        "roles": lj(p.roles, "[]") or prefs.get("roles", []),
        "locations": lj(p.locations, "[]") or prefs.get("locations", []),
        "remote": bool(p.remote if p.remote is not None else prefs.get("remote", True)),
        "employment_types": lj(p.employment_types, '["Full-time"]'),
        "experience_level": p.experience_level,
        "profile_data": data,
    }

def job_to_dict(job: Job, pct=None, why=None, matched=None) -> dict:
    def lj(s):
        try:
            return json.loads(s or "[]")
        except Exception:
            return []
    return {
        "id": job.id, "title": job.title, "company": job.company,
        "description": job.description, "summary": summarize_job(job.description or ""),
        "location": job.location, "work_arrangement": job.work_arrangement,
        "salary_min": job.salary_min, "salary_max": job.salary_max,
        "employment_type": job.employment_type, "experience": job.experience,
        "required_skills": lj(job.required_skills), "preferred_skills": lj(job.preferred_skills),
        "status": job.status,
        "match_pct": pct, "match_reason": why, "matched_skills": matched or [],
    }

# ---------- auth ----------
class AuthIn(BaseModel):
    email: str
    password: str
    role: str = "candidate"
    invite_code: str = ""

def hash_refresh(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()

def issue_refresh(db: Session, u: User) -> str:
    token, digest = new_refresh_token()
    db.add(RefreshToken(user_id=u.id, token_hash=digest,
                        expires_at=datetime.utcnow() + timedelta(days=REFRESH_DAYS)))
    db.commit()
    return token

@app.post("/auth/signup")
def signup(body: AuthIn, db: Session = Depends(get_db)):
    from .models import INVITE_LIMIT
    email = body.email.strip().lower()
    if not email or not body.password:
        raise HTTPException(400, "Email and password required")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email already registered")
    role = body.role if body.role in ("candidate", "employer") else "candidate"
    # Invite gate (candidates only — employers always join freely):
    # the very first user bootstraps the network (no code needed).
    # After that every CANDIDATE signup must present an unused-up code
    # (5 uses each). Employers skip the gate; a code is recorded if given.
    inviter = None
    code = (body.invite_code or "").strip()
    if role == "candidate" and db.query(User).count() > 0:
        if not code:
            raise HTTPException(400, "An invite link is required to join. Ask a member for theirs.")
        inviter = db.query(User).filter(User.invite_code == code).first()
        if not inviter:
            raise HTTPException(400, "That invite link is invalid.")
        used = db.query(User).filter(User.invited_by == inviter.id).count()
        if used >= INVITE_LIMIT:
            raise HTTPException(400, "That invite link is fully used (5/5). Ask for a fresh one.")
    elif role == "employer" and code:
        inviter = db.query(User).filter(User.invite_code == code).first()
        if not inviter:
            raise HTTPException(400, "That invite link is invalid.")
        used = db.query(User).filter(User.invited_by == inviter.id).count()
        if used >= INVITE_LIMIT:
            raise HTTPException(400, "That invite link is fully used (5/5). Ask for a fresh one.")
    u = User(email=email, password_hash=hash_password(body.password), role=role,
             invite_code=new_invite_code(db), invited_by=inviter.id if inviter else "")
    db.add(u)
    db.commit()
    db.refresh(u)
    if role == "employer":
        seed_jobs(db, u.id)
    else:
        # ensure candidate has jobs to match: seed under a demo employer if none exist
        if db.query(Job).filter(Job.status == "active").count() == 0:
            demo = db.query(User).filter(User.email == "demo-employer@10apply.test").first()
            if not demo:
                demo = User(email="demo-employer@10apply.test", password_hash=hash_password("demo"), role="employer",
                            invite_code=new_invite_code(db))
                db.add(demo)
                db.commit()
                db.refresh(demo)
            seed_jobs(db, demo.id)
    return {"token": make_token(u.id, u.role), "refresh_token": issue_refresh(db, u),
            "user": {"id": u.id, "email": u.email, "role": u.role}}

@app.post("/auth/login")
def login(body: AuthIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(u.id, u.role), "refresh_token": issue_refresh(db, u),
            "user": {"id": u.id, "email": u.email, "role": u.role}}

class RefreshIn(BaseModel):
    refresh_token: str = ""

@app.post("/auth/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    """Swap a refresh token for a fresh session. Rotates (old token revoked)."""
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
    return {"token": make_token(u.id, u.role), "refresh_token": issue_refresh(db, u),
            "user": {"id": u.id, "email": u.email, "role": u.role}}

@app.post("/auth/logout")
def logout(body: RefreshIn = RefreshIn(), u: User = Depends(current_user), db: Session = Depends(get_db)):
    """Revoke a refresh token (or all of the user's when none is given)."""
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
def me(u: User = Depends(current_user)):
    return {"id": u.id, "email": u.email, "role": u.role}

# ---------- invites (each member invites 5, who each invite 5) ----------
@app.get("/invites/me")
def my_invite(u: User = Depends(current_user), db: Session = Depends(get_db)):
    from .models import INVITE_LIMIT
    fresh = db.query(User).filter(User.id == u.id).first()
    if not fresh.invite_code:
        fresh.invite_code = new_invite_code(db)
        db.commit()
        db.refresh(fresh)
    used, limit, emails = invite_usage(db, fresh.id)
    return {"code": fresh.invite_code, "used": used, "limit": limit,
            "remaining": max(0, limit - used),
            "invited": emails,
            "invite_path": f"/signup?invite={fresh.invite_code}"}

@app.get("/invites/validate")
def validate_invite(code: str = "", db: Session = Depends(get_db)):
    from .models import INVITE_LIMIT
    code = (code or "").strip()
    if not code:
        # Open only while the network is empty (first founder).
        open_net = db.query(User).count() == 0
        return {"valid": open_net, "open": open_net, "remaining": 0}
    inviter = db.query(User).filter(User.invite_code == code).first()
    if not inviter:
        return {"valid": False, "remaining": 0}
    used = db.query(User).filter(User.invited_by == inviter.id).count()
    return {"valid": used < INVITE_LIMIT, "remaining": max(0, INVITE_LIMIT - used),
            "used": used, "limit": INVITE_LIMIT}

# ---------- candidate ----------
@app.post("/candidate/resume")
async def upload_resume(file: UploadFile = File(...), u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")
    text = extract_text_from_upload(file.filename or "", data)
    if not text.strip():
        raise HTTPException(400, "Could not extract text from file. Try a text-based PDF or DOCX.")
    parsed = parse_resume(text)
    # save file
    ext = os.path.splitext(file.filename or "")[1] or ".pdf"
    fname = f"{u.id}_{abs(hash(file.filename)) % 99999}{ext}"
    with open(os.path.join(UPLOAD_DIR, fname), "wb") as f:
        f.write(data)
    p = get_or_create_profile(db, u.id)
    prefs = parsed.get("job_preferences", {})
    p.name = parsed.get("name", "") if parsed.get("name") != "Not found" else p.name
    p.location = parsed.get("location", "") if parsed.get("location") != "Not found" else p.location
    p.resume_url = f"/uploads/{fname}"
    p.resume_text = text[:20000]
    p.profile_data = json.dumps(parsed)
    p.roles = json.dumps(prefs.get("roles", []))
    p.locations = json.dumps(prefs.get("locations", []))
    p.remote = 1 if prefs.get("remote", True) else 0
    p.experience_level = prefs.get("experience_level", "New Grad")
    try:
        p.salary_min = int(prefs.get("salary_min", 0) or 0)
    except Exception:
        pass
    db.commit()
    return {"profile": profile_to_dict(p), "steps": ["Extracting experience", "Identifying skills", "Understanding projects", "Identifying education", "Building your job preferences"]}

@app.get("/candidate/profile")
def get_profile(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    return {"profile": profile_to_dict(get_or_create_profile(db, u.id))}

class ProfilePatch(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[int] = None
    roles: Optional[list] = None
    locations: Optional[list] = None
    remote: Optional[bool] = None
    employment_types: Optional[list] = None
    experience_level: Optional[str] = None
    skills: Optional[list] = None

@app.patch("/candidate/profile")
def patch_profile(body: ProfilePatch, u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    p = get_or_create_profile(db, u.id)
    try:
        data = json.loads(p.profile_data or "{}")
    except Exception:
        data = {}
    if body.name is not None:
        p.name = body.name
        data["name"] = body.name
    if body.location is not None:
        p.location = body.location
        data["location"] = body.location
    if body.salary_min is not None:
        p.salary_min = body.salary_min
    if body.roles is not None:
        p.roles = json.dumps(body.roles)
        data.setdefault("job_preferences", {})["roles"] = body.roles
    if body.locations is not None:
        p.locations = json.dumps(body.locations)
        data.setdefault("job_preferences", {})["locations"] = body.locations
    if body.remote is not None:
        p.remote = 1 if body.remote else 0
        data.setdefault("job_preferences", {})["remote"] = body.remote
    if body.employment_types is not None:
        p.employment_types = json.dumps(body.employment_types)
    if body.experience_level is not None:
        p.experience_level = body.experience_level
    if body.skills is not None:
        data["skills"] = body.skills
    data.setdefault("job_preferences", {}).update({
        "roles": json.loads(p.roles or "[]"),
        "locations": json.loads(p.locations or "[]"),
        "remote": bool(p.remote),
        "salary_min": p.salary_min,
        "experience_level": p.experience_level,
    })
    p.profile_data = json.dumps(data)
    db.commit()
    return {"profile": profile_to_dict(p)}

def rank_jobs_for(db: Session, profile: CandidateProfile):
    try:
        pdata = json.loads(profile.profile_data or "{}")
    except Exception:
        pdata = {}
    prefs = {
        "roles": json.loads(profile.roles or "[]"),
        "locations": json.loads(profile.locations or "[]"),
        "remote": bool(profile.remote),
        "salary_min": profile.salary_min or 0,
        "experience_level": profile.experience_level or "New Grad",
    }
    applied = {a.job_id for a in db.query(Application).filter(Application.candidate_id == profile.id).all()}
    jobs = db.query(Job).filter(Job.status == "active").all()
    # Vector search: rank the whole active corpus, then apply
    # hard filters / hide already-applied so IDF stays stable.
    ranked = rank_jobs(pdata, prefs, profile.resume_text or "", jobs)
    scored = []
    for pct, j, why, matched in ranked:
        if j.id in applied:
            continue
        if not hard_filter_ok(prefs, pdata, j):
            continue
        scored.append((pct, j, why, matched))
    # Fewer than 10 matches: fill up with the best vector matches regardless
    # of hard filters (still never re-applying), so everyone gets their 10.
    if len(scored) < 10:
        seen = {j.id for _, j, _, _ in scored} | applied
        for pct, j, why, matched in ranked:
            if len(scored) >= 10:
                break
            if j.id in seen:
                continue
            seen.add(j.id)
            scored.append((pct, j, why, matched))
    return scored, prefs

@app.get("/candidate/daily-jobs")
def daily_jobs(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    profile = get_or_create_profile(db, u.id)
    today = date.today().isoformat()
    pick = db.query(DailyPick).filter(DailyPick.candidate_id == profile.id, DailyPick.day == today).first()
    scored, _ = rank_jobs_for(db, profile)
    if pick:
        try:
            ids = json.loads(pick.job_ids or "[]")
        except Exception:
            ids = []
        by_id = {j.id: (pct, j, why, m) for pct, j, why, m in scored}
        ordered = [by_id[i] for i in ids if i in by_id]
        # append new jobs not in pick
        ordered += [s for s in scored if s[1].id not in set(ids)][: max(0, 10 - len(ordered))]
        scored = ordered
    else:
        top = scored[:10]
        db.add(DailyPick(candidate_id=profile.id, day=today, job_ids=json.dumps([j.id for _, j, _, _ in top])))
        db.commit()
        scored = top
    return {"jobs": [job_to_dict(j, pct, why, m) for pct, j, why, m in scored[:10]],
            "total": len(scored)}

class ApplyIn(BaseModel):
    job_ids: Optional[list] = None

@app.post("/candidate/apply-all")
def apply_all(body: ApplyIn = ApplyIn(), u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    profile = get_or_create_profile(db, u.id)
    scored, _ = rank_jobs_for(db, profile)
    targets = [j for _, j, _, _ in scored[:10]]
    if body.job_ids:
        targets = db.query(Job).filter(Job.id.in_(body.job_ids)).all()
    out = []
    for j in targets:
        exists = db.query(Application).filter(Application.candidate_id == profile.id, Application.job_id == j.id).first()
        if exists:
            out.append({"job_id": j.id, "title": j.title, "status": exists.status, "duplicate": True})
            continue
        a = Application(candidate_id=profile.id, job_id=j.id, status="Submitted", source="manual")
        db.add(a)
        out.append({"job_id": j.id, "title": j.title, "status": "Submitted", "duplicate": False})
    db.commit()
    return {"applied": out, "count": len([o for o in out if not o.get("duplicate")])}

@app.post("/candidate/apply/{job_id}")
def apply_one(job_id: str, u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    profile = get_or_create_profile(db, u.id)
    j = db.query(Job).filter(Job.id == job_id).first()
    if not j:
        raise HTTPException(404, "Job not found")
    exists = db.query(Application).filter(Application.candidate_id == profile.id, Application.job_id == job_id).first()
    if exists:
        return {"ok": True, "duplicate": True}
    db.add(Application(candidate_id=profile.id, job_id=job_id, status="Submitted", source="manual"))
    db.commit()
    return {"ok": True}

@app.get("/candidate/applications")
def my_applications(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    profile = get_or_create_profile(db, u.id)
    apps = db.query(Application).filter(Application.candidate_id == profile.id).order_by(Application.applied_at.desc()).all()
    out = []
    for a in apps:
        j = db.query(Job).filter(Job.id == a.job_id).first()
        out.append({"id": a.id, "status": a.status, "source": a.source or "manual",
                    "applied_at": a.applied_at.isoformat() if a.applied_at else "",
                    "job": job_to_dict(j) if j else None})
    return {"applications": out}

@app.get("/candidate/auto-status")
def auto_status(u: User = Depends(candidate_user), db: Session = Depends(get_db)):
    """How today's 10am auto-apply went for this candidate."""
    from .autoapply import AUTO_APPLY_HOUR
    profile = get_or_create_profile(db, u.id)
    today = date.today().isoformat()
    apps = db.query(Application).filter(Application.candidate_id == profile.id).all()
    auto_today = sum(1 for a in apps
                     if (a.source or "") == "auto" and a.applied_at
                     and a.applied_at.date().isoformat() == today)
    return {"today": today, "auto_applied_today": auto_today,
            "total_applications": len(apps), "enabled": True,
            "next_run": f"{AUTO_APPLY_HOUR}:00 (server local time)"}

# ---------- employer ----------
class JobParseIn(BaseModel):
    text: str = ""
    title_hint: str = ""

@app.post("/employer/jobs/parse")
def parse_job(body: JobParseIn, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    if not body.text.strip():
        raise HTTPException(400, "Provide job description text")
    parsed = parse_jd(body.text)
    if body.title_hint:
        parsed["title"] = body.title_hint
    return {"parsed": parsed}

@app.post("/employer/jobs")
async def create_job(description: str = Form(""), title: str = Form(""), company: str = Form(""),
                     location: str = Form(""), work_arrangement: str = Form("Hybrid"),
                     salary_min: int = Form(0), salary_max: int = Form(0),
                     employment_type: str = Form("Full-time"), experience: str = Form("0-3 years"),
                     required_skills: str = Form("[]"), preferred_skills: str = Form("[]"),
                     file: UploadFile = File(None),
                     u: User = Depends(employer_user), db: Session = Depends(get_db)):
    text = description
    if file is not None:
        raw = await file.read()
        text = extract_text_from_upload(file.filename or "", raw) or description
    parsed = parse_jd(text) if text else {}
    def parse_list(s, fb):
        try:
            v = json.loads(s) if s else fb
            return v if isinstance(v, list) else fb
        except Exception:
            return fb
    req = parse_list(required_skills, parsed.get("required_skills", []))
    pref = parse_list(preferred_skills, parsed.get("preferred_skills", []))
    job = Job(
        employer_id=u.id, title=title or parsed.get("title", "Software Engineer"),
        company=company or parsed.get("company", "") or u.email.split("@")[0],
        description=text or title,
        location=location or parsed.get("location", "San Francisco, CA"),
        work_arrangement=work_arrangement or parsed.get("work_arrangement", "Hybrid"),
        salary_min=salary_min or parsed.get("salary_min", 0),
        salary_max=salary_max or parsed.get("salary_max", 0),
        employment_type=employment_type or parsed.get("employment_type", "Full-time"),
        experience=experience or parsed.get("experience", "0-3 years"),
        required_skills=json.dumps(req), preferred_skills=json.dumps(pref),
        status="draft", structured_data=json.dumps(parsed),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"job": job_to_dict(job)}

class JobPatch(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    work_arrangement: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    employment_type: Optional[str] = None
    experience: Optional[str] = None
    required_skills: Optional[list] = None
    preferred_skills: Optional[list] = None

@app.patch("/employer/jobs/{job_id}")
def patch_job(job_id: str, body: JobPatch, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    j = db.query(Job).filter(Job.id == job_id, Job.employer_id == u.id).first()
    if not j:
        raise HTTPException(404, "Job not found")
    for k, v in body.model_dump(exclude_none=True).items():
        if k in ("required_skills", "preferred_skills"):
            setattr(j, k, json.dumps(v))
        else:
            setattr(j, k, v)
    db.commit()
    return {"job": job_to_dict(j)}

@app.post("/employer/jobs/{job_id}/publish")
def publish_job(job_id: str, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    j = db.query(Job).filter(Job.id == job_id, Job.employer_id == u.id).first()
    if not j:
        raise HTTPException(404, "Job not found")
    j.status = "active"
    db.commit()
    return {"job": job_to_dict(j)}

@app.get("/employer/jobs")
def list_jobs(u: User = Depends(employer_user), db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.employer_id == u.id).order_by(Job.created_at.desc()).all()
    out = []
    for j in jobs:
        n = db.query(Application).filter(Application.job_id == j.id).count()
        d = job_to_dict(j)
        d["applicant_count"] = n
        out.append(d)
    return {"jobs": out}

@app.get("/employer/jobs/{job_id}/candidates")
def job_candidates(job_id: str, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    j = db.query(Job).filter(Job.id == job_id, Job.employer_id == u.id).first()
    if not j:
        raise HTTPException(404, "Job not found")
    apps = db.query(Application).filter(Application.job_id == job_id).all()
    profiles = db.query(CandidateProfile).all()
    # Vector search: JD-as-query against all candidate profiles.
    triplets = []
    for p in profiles:
        try:
            pdata = json.loads(p.profile_data or "{}")
        except Exception:
            pdata = {}
        triplets.append((p, pdata, p.resume_text or ""))
    ranked = rank_candidates(j, triplets)
    # rank applicants first? No — pure relevance order; applied flag shown per row.
    out = []
    for pct, p, pdata, why, matched in ranked[:50]:
        app = next((a for a in apps if a.candidate_id == p.id), None)
        out.append({
            "candidate_id": p.id, "name": p.name or pdata.get("name", "Candidate"),
            "location": p.location, "skills": (pdata.get("skills", []) or [])[:8],
            "education": (pdata.get("education", []) or [])[:2],
            "experience": (pdata.get("experience", []) or [])[:3],
            "match_pct": pct, "match_reason": why, "matched_skills": matched,
            "applied": app is not None, "application_status": app.status if app else None,
        })
    return {"job": job_to_dict(j), "candidates": out}

@app.get("/candidate/{candidate_id}")
def view_candidate(candidate_id: str, u: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.query(CandidateProfile).filter(CandidateProfile.id == candidate_id).first()
    if not p:
        raise HTTPException(404, "Candidate not found")
    try:
        pdata = json.loads(p.profile_data or "{}")
    except Exception:
        pdata = {}
    return {"candidate": {
        "candidate_id": p.id, "name": p.name or pdata.get("name", "Candidate"),
        "location": p.location, "skills": pdata.get("skills", []),
        "education": pdata.get("education", []), "experience": pdata.get("experience", []),
        "resume_url": p.resume_url,
    }}

class StatusIn(BaseModel):
    status: str

@app.patch("/employer/applications/{candidate_id}/{job_id}")
def set_status(candidate_id: str, job_id: str, body: StatusIn, u: User = Depends(employer_user), db: Session = Depends(get_db)):
    a = db.query(Application).filter(Application.candidate_id == candidate_id, Application.job_id == job_id).first()
    if not a:
        raise HTTPException(404, "Application not found")
    a.status = body.status
    db.commit()
    return {"ok": True}

# ---------- messages ----------
class MsgIn(BaseModel):
    receiver_id: str = ""  # user id OR candidate profile id (resolved)
    job_id: Optional[str] = None
    body: str = ""
    candidate_id: Optional[str] = None

def resolve_receiver(db: Session, receiver_id: str, candidate_id: Optional[str]):
    if candidate_id:
        p = db.query(CandidateProfile).filter(CandidateProfile.id == candidate_id).first()
        if p:
            return p.user_id
    # receiver_id might be a profile id
    p = db.query(CandidateProfile).filter(CandidateProfile.id == receiver_id).first()
    if p:
        return p.user_id
    return receiver_id

@app.post("/messages")
def send_msg(body: MsgIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    if not body.body.strip():
        raise HTTPException(400, "Empty message")
    recv = resolve_receiver(db, body.receiver_id, body.candidate_id)
    m = Message(sender_id=u.id, receiver_id=recv, job_id=body.job_id, body=body.body.strip())
    db.add(m)
    db.commit()
    email_status = None
    # Back-and-forth over email, both directions:
    # employer -> candidate, and candidate replies -> employer.
    receiver = db.query(User).filter(User.id == recv).first()
    if u.role == "employer" and receiver and receiver.role == "candidate" and receiver.email:
        job = db.query(Job).filter(Job.id == body.job_id).first() if body.job_id else None
        prof = db.query(CandidateProfile).filter(CandidateProfile.user_id == recv).first()
        name = (prof.name if prof and prof.name else receiver.email.split("@")[0])
        context = f" about the {job.title} position at {job.company}" if job else ""
        subject = f"New message{context} — 10Apply" if job else "New message on 10Apply"
        text = (f"Hi {name},\n\n{u.email} wrote to you{context}:\n\n"
                f"\"{body.body.strip()}\"\n\n— Reply in 10Apply to continue the conversation.")
        try:
            email_status, _ = send_email(receiver.email, subject, text)
        except Exception as e:
            email_status = f"error: {e}"[:200]
    elif u.role == "candidate" and receiver and receiver.role == "employer" and receiver.email:
        job = db.query(Job).filter(Job.id == body.job_id).first() if body.job_id else None
        context = f" about the {job.title} position at {job.company}" if job else ""
        subject = f"Reply{context} — 10Apply"
        text = (f"Hi,\n\n{u.email} replied{context}:\n\n"
                f"\"{body.body.strip()}\"\n\n— Reply in 10Apply to continue the conversation.")
        try:
            email_status, _ = send_email(receiver.email, subject, text)
        except Exception as e:
            email_status = f"error: {e}"[:200]
    return {"ok": True, "email": email_status}

@app.get("/messages")
def list_messages(job_id: Optional[str] = None, with_user: Optional[str] = None,
                  u: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(Message).filter((Message.sender_id == u.id) | (Message.receiver_id == u.id))
    if job_id:
        q = q.filter(Message.job_id == job_id)
    msgs = q.order_by(Message.created_at.asc()).all()
    if with_user:
        # with_user may be profile id; resolve
        other = resolve_receiver(db, with_user, None)
        msgs = [m for m in msgs if m.sender_id == other or m.receiver_id == other]
    out = []
    jobs_cache: dict = {}
    users_cache: dict = {}
    for m in msgs:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        other_id = m.receiver_id if m.sender_id == u.id else m.sender_id
        if other_id not in users_cache:
            other = db.query(User).filter(User.id == other_id).first()
            users_cache[other_id] = other.email if other else ""
        if m.job_id and m.job_id not in jobs_cache:
            job = db.query(Job).filter(Job.id == m.job_id).first()
            jobs_cache[m.job_id] = (job.title if job else "", job.company if job else "")
        jt, jc = jobs_cache.get(m.job_id or "", ("", ""))
        out.append({"id": m.id, "sender_id": m.sender_id, "sender_email": sender.email if sender else "",
                    "receiver_id": m.receiver_id, "other_id": other_id,
                    "other_email": users_cache.get(other_id, ""),
                    "job_id": m.job_id, "job_title": jt, "job_company": jc,
                    "body": m.body,
                    "created_at": m.created_at.isoformat() if m.created_at else "", "mine": m.sender_id == u.id})
    return {"messages": out}

@app.post("/demo/seed")
def demo_seed(db: Session = Depends(get_db)):
    """Create demo employers, jobs, candidates, applications + messages. Idempotent."""
    out = seed_demo(db)
    # Seed data predates invites: give every demo user a code.
    ensure_invite_columns()
    return {"seeded": out, "password": "demo1234",
            "logins": ["ava@demo.acme.test", "ben@demo.bright.test", "cara@demo.insight.test",
                       "omar@demo.cloud.test", "pip@demo.pixel.test",
                       "dev-backend@demo.test", "front-react@demo.test", "data-ana@demo.test",
                       "ops-iva@demo.test", "des-ign@demo.test", "new-grad@demo.test"]}

@app.get("/demo/emails")
def demo_emails(limit: int = 20, db: Session = Depends(get_db)):
    """Recent employer->candidate emails (sent or logged to outbox)."""
    rows = db.query(EmailLog).order_by(EmailLog.created_at.desc()).limit(max(1, min(limit, 100))).all()
    return {"emails": [{"to": r.to_email, "subject": r.subject, "status": r.status,
                        "info": r.info, "created_at": r.created_at.isoformat() if r.created_at else ""} for r in rows]}

@app.post("/demo/auto-apply")
def demo_auto_apply(db: Session = Depends(get_db)):
    """Trigger the 10am auto-apply run on demand (same code the scheduler calls)."""
    from .autoapply import run_daily_auto_apply
    return run_daily_auto_apply(db)

@app.get("/")
def root():
    return {"ok": True, "service": "10Apply API", "docs": "/docs", "health": "/health"}

@app.get("/health")
def health():
    return {"ok": True}
