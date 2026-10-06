"""Email delivery for employer -> candidate messages.

Config via env (all optional):
  SMTP_HOST, SMTP_PORT (default 587; 465 => SSL), SMTP_USER, SMTP_PASS,
  SMTP_FROM (default: SMTP_USER or "10Apply <no-reply@10apply.local>"),
  SMTP_USE_TLS (default true unless port 465).

If SMTP_HOST is unset, emails are NOT sent but are recorded in the DB
(EmailLog, status "logged") and appended to backend/email_outbox.log, so the
flow is fully verifiable without credentials. Sending never raises.
"""
import os
import smtplib
from email.message import EmailMessage

OUTBOX_PATH = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "email_outbox.log"))


def smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST", "").strip())


def send_email(to_email: str, subject: str, body: str) -> tuple:
    """Returns (status, info). status: sent | logged | failed."""
    from .models import EmailLog  # local import: mailer is imported by main
    from .database import SessionLocal

    status, info = "logged", "SMTP not configured; recorded to outbox log"
    if smtp_configured():
        host = os.environ["SMTP_HOST"].strip()
        port = int(os.environ.get("SMTP_PORT", "587") or 587)
        user = os.environ.get("SMTP_USER", "")
        password = os.environ.get("SMTP_PASS", "")
        sender = os.environ.get("SMTP_FROM", user or "10Apply <no-reply@10apply.local>")
        use_tls = os.environ.get("SMTP_USE_TLS", "true" if port != 465 else "false").lower() == "true"
        try:
            msg = EmailMessage()
            msg["From"] = sender
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.set_content(body)
            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=10) as s:
                    if user:
                        s.login(user, password)
                    s.send_message(msg)
            else:
                with smtplib.SMTP(host, port, timeout=10) as s:
                    if use_tls:
                        s.starttls()
                    if user:
                        s.login(user, password)
                    s.send_message(msg)
            status, info = "sent", f"via {host}:{port}"
        except Exception as e:
            status, info = "failed", str(e)[:300]

    line = f"TO: {to_email} | STATUS: {status} | SUBJECT: {subject} | {info}\n{body}\n{'-' * 60}\n"
    try:
        with open(OUTBOX_PATH, "a") as f:
            f.write(line)
    except Exception:
        pass
    try:
        db = SessionLocal()
        try:
            db.add(EmailLog(to_email=to_email, subject=subject, body=body,
                            status=status, info=info))
            db.commit()
        finally:
            db.close()
    except Exception:
        pass
    return status, info
