import hashlib, hmac, os, re, secrets
from datetime import datetime, timedelta
import jwt

SECRET = os.environ.get("JWT_SECRET", "10apply-dev-secret")
ALGO = "HS256"

def hash_password(pw: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${dk}"

def verify_password(pw: str, h: str) -> bool:
    try:
        salt, dk = h.split("$")
        chk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()
        return hmac.compare_digest(chk, dk)
    except Exception:
        return False

def make_token(user_id: str, role: str, days: int = 7) -> str:
    payload = {"sub": user_id, "role": role, "exp": datetime.utcnow() + timedelta(days=days)}
    return jwt.encode(payload, SECRET, algorithm=ALGO)

ACCESS_DAYS = 7
REFRESH_DAYS = 90

def new_refresh_token() -> tuple:
    """Returns (opaque token, sha256 hash). Only the hash is stored."""
    t = secrets.token_urlsafe(48)
    return t, hashlib.sha256(t.encode()).hexdigest()

def decode_token(token: str):
    return jwt.decode(token, SECRET, algorithms=[ALGO])
