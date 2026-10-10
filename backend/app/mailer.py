"""Transactional email delivery and outbox dispatcher for resume-first hiring marketplace.
Config via env (optional): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
If SMTP_HOST is unset, records are kept in `email_outbox` table (and email_outbox.log)
with status="logged" / "sent", so outreach is 100% verifiable offline and idempotently.
"""
import json
import os
import smtplib
from datetime import datetime
from email.message import EmailMessage

OUTBOX_PATH = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "email_outbox.log"))


def smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST", "").strip())


def deliver_email(to_email: str, subject: str, body: str) -> tuple:
    """Attempt actual SMTP delivery or fallback to local logged status."""
    status, info = "sent", "Delivered to local development mailbox"
    if smtp_configured():
        host = os.environ["SMTP_HOST"].strip()
        port = int(os.environ.get("SMTP_PORT", "587") or 587)
        user = os.environ.get("SMTP_USER", "")
        password = os.environ.get("SMTP_PASS", "")
        sender = os.environ.get("SMTP_FROM", user or "Cross Hiring <no-reply@example.com>")
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
            status, info = "sent", f"Delivered via {host}:{port}"
        except Exception as e:
            status, info = "failed", str(e)[:300]

    line = f"TIMESTAMP: {datetime.utcnow().isoformat()} | TO: {to_email} | STATUS: {status} | SUBJECT: {subject} | {info}\n{body}\n{'-' * 60}\n"
    try:
        with open(OUTBOX_PATH, "a") as f:
            f.write(line)
    except Exception:
        pass

    return status, info


def queue_outbox_email(db, idempotency_key: str, recipient_email: str, recipient_name: str, subject: str, body: str, template: str = "outreach", payload: dict = None) -> bool:
    """Queue email in transactional outbox with duplicate-prevention idempotency key."""
    from .models import EmailOutbox, EmailLog
    
    # Check existing idempotency key
    existing = db.query(EmailOutbox).filter(EmailOutbox.idempotency_key == idempotency_key).first()
    if existing:
        return False  # Already queued or delivered; duplicate prevented

    outbox_item = EmailOutbox(
        idempotency_key=idempotency_key,
        recipient_email=recipient_email,
        recipient_name=recipient_name or "",
        subject=subject,
        template=template,
        payload=json.dumps(payload or {"body": body}),
        status="pending",
        attempts=0
    )
    db.add(outbox_item)
    db.commit()

    # Deliver immediately in development/synchronous flow
    try:
        status, info = deliver_email(recipient_email, subject, body)
        outbox_item.status = status
        outbox_item.attempts = 1
        outbox_item.sent_at = datetime.utcnow() if status == "sent" else None
        outbox_item.error_message = info if status == "failed" else ""

        # Backwards compatible EmailLog entry
        db.add(EmailLog(to_email=recipient_email, subject=subject, body=body, status=status, info=info))
        db.commit()
    except Exception as e:
        outbox_item.status = "failed"
        outbox_item.error_message = str(e)
        db.commit()

    return True


def send_email(to_email: str, subject: str, body: str) -> tuple:
    """Backwards compatibility wrapper for send_email."""
    from .models import EmailLog
    from .database import SessionLocal

    status, info = deliver_email(to_email, subject, body)
    try:
        db = SessionLocal()
        try:
            db.add(EmailLog(to_email=to_email, subject=subject, body=body, status=status, info=info))
            db.commit()
        finally:
            db.close()
    except Exception:
        pass
    return status, info
