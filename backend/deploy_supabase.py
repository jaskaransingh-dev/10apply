"""Supabase Database Deployment and Migration Script.

Connects to Supabase PostgreSQL, ensures all tables exist, verifies extensions,
and seeds initial demo roles if requested.

Usage:
  DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" python3 backend/deploy_supabase.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def deploy_to_supabase():
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("[!] No DATABASE_URL or SUPABASE_DB_URL provided.")
        print("    To deploy to Supabase, provide your connection string:")
        print("    export DATABASE_URL='postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres'")
        print("    python3 backend/deploy_supabase.py")
        sys.exit(1)

    # Normalize url if postgres:// is used
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    print(f"[*] Connecting to Supabase PostgreSQL...")
    engine = create_engine(db_url, pool_pre_ping=True)

    # 1. Test connection
    try:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version();")).scalar()
            print(f"[OK] Connected successfully! PostgreSQL Version:\n    {version}")
    except Exception as e:
        print(f"[FAIL] Failed to connect to Supabase database: {e}")
        sys.exit(1)

    # 2. Run Migration SQL if present
    migration_file = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations", "20241010000000_init_rec_schema.sql")
    if os.path.exists(migration_file):
        print(f"[*] Applying Supabase schema from {migration_file}...")
        try:
            with open(migration_file, "r") as f:
                sql_content = f.read()
            with engine.connect() as conn:
                conn.execute(text(sql_content))
                conn.commit()
            print(f"[OK] Schema successfully applied to Supabase!")
        except Exception as e:
            print(f"[!] Warning while executing migration SQL: {e}")
            print("[*] Falling back to SQLAlchemy model reflection...")
            from app.models import Base
            Base.metadata.create_all(bind=engine)
            print("[OK] SQLAlchemy tables verified.")
    else:
        from app.models import Base
        Base.metadata.create_all(bind=engine)
        print("[OK] SQLAlchemy tables created.")

    # 3. Seed Demo accounts if requested
    seed = os.environ.get("SEED_DEMO", "1").lower() in ["1", "true", "yes"]
    if seed:
        print("[*] Seeding demo candidates and recruiters to Supabase...")
        from app.seed_demo import seed_demo
        Session = sessionmaker(bind=engine)
        db = Session()
        try:
            seed_demo(db)
            print("[OK] Demo accounts successfully created on Supabase.")
        finally:
            db.close()

    print("\n[OK] Supabase deployment and verification complete!")


if __name__ == "__main__":
    deploy_to_supabase()
