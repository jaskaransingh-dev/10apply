"""Daily 10am auto-apply. No clicking: every candidate is applied automatically.

- `run_daily_auto_apply(db)` applies each candidate to their top-10 matches
  (or all matched jobs when fewer than 10 — backfill lives in rank_jobs_for).
  It pins the same DailyPick the app shows, so "Your 10" == what was applied.
- `start_scheduler()` runs it every day at 10:00 server-local time (stdlib
  thread, no extra deps). `catch_up(db)` runs it once at startup when today's
  10am was missed (e.g. dev server restarted at 11am).
"""
import json
import threading
import time
from datetime import date, datetime, timedelta

from .models import Application, AutoApplyLog, CandidateProfile, DailyPick, Job

AUTO_APPLY_HOUR = 10
AUTO_APPLY_LIMIT = 10


def seconds_until_next_run(now: datetime | None = None) -> float:
    now = now or datetime.now()
    target = now.replace(hour=AUTO_APPLY_HOUR, minute=0, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def run_daily_auto_apply(db, day: str | None = None) -> dict:
    # Lazy import: main imports this module at startup (circular otherwise).
    from .main import get_or_create_profile, rank_jobs_for

    day = day or date.today().isoformat()
    profiles = db.query(CandidateProfile).all()
    applied_total = 0
    for profile in profiles:
        get_or_create_profile(db, profile.user_id)  # ensure row shape
        scored, _ = rank_jobs_for(db, profile)
        targets = scored[:AUTO_APPLY_LIMIT]
        ids = [j.id for _, j, _, _ in targets]
        pick = db.query(DailyPick).filter(
            DailyPick.candidate_id == profile.id, DailyPick.day == day).first()
        if pick:
            try:
                ids = json.loads(pick.job_ids or "[]")
            except Exception:
                ids = [j.id for _, j, _, _ in targets]
        else:
            db.add(DailyPick(candidate_id=profile.id, day=day, job_ids=json.dumps(ids)))
            db.commit()
        for job_id in ids:
            job = db.query(Job).filter(Job.id == job_id, Job.status == "active").first()
            if not job:
                continue
            exists = db.query(Application).filter(
                Application.candidate_id == profile.id, Application.job_id == job_id).first()
            if exists:
                continue
            db.add(Application(candidate_id=profile.id, job_id=job_id,
                              status="Submitted", source="auto"))
            applied_total += 1
        db.commit()

    log = db.query(AutoApplyLog).filter(AutoApplyLog.day == day).first()
    if log:
        log.applied_count = (log.applied_count or 0) + applied_total
        log.candidate_count = len(profiles)
    else:
        db.add(AutoApplyLog(day=day, candidate_count=len(profiles),
                             applied_count=applied_total))
    db.commit()
    return {"day": day, "candidates": len(profiles), "applied": applied_total}


def catch_up(db) -> dict | None:
    """Run today's auto-apply immediately if 10am already passed without a run."""
    now = datetime.now()
    if now.hour < AUTO_APPLY_HOUR:
        return None
    day = date.today().isoformat()
    if db.query(AutoApplyLog).filter(AutoApplyLog.day == day).first():
        return None
    return run_daily_auto_apply(db, day)


def start_scheduler() -> None:
    t = threading.Thread(target=_loop, daemon=True, name="auto-apply-scheduler")
    t.start()


def _loop() -> None:
    from .database import SessionLocal
    while True:
        time.sleep(seconds_until_next_run())
        db = SessionLocal()
        try:
            run_daily_auto_apply(db)
        except Exception as e:
            print(f"[auto-apply] run failed: {e}")
        finally:
            db.close()
