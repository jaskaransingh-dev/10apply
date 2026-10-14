"""Comprehensive Tests for Resume Extraction, Canonical Taxonomy, 5-Component Matching, and 10 AM Auto-Dispatch."""

import json
import unittest
from datetime import datetime, timezone
from starlette.testclient import TestClient

from app.main import app, dispatch_candidate_10am
from app.database import SessionLocal
from app.models import (
    User,
    CandidateProfile,
    Resume,
    Job,
    Match,
    Application,
    Invitation,
    WaitlistEntry,
    EmailOutbox,
    RecruiterWaitlistEntry,
    CandidateWaitlistEntry,
    PasswordResetToken
)
from app.parse import (
    canonicalize_skill,
    find_skills,
    extract_experience_and_years,
    parse_resume,
    parse_jd,
    extract_text_from_upload
)
from app.match import (
    compute_match_score,
    hard_filter_ok,
    rank_candidates,
    rank_jobs
)
from app.seed_demo import seed_demo

client = TestClient(app)


class TestExtractionAndMatching(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        seed_demo(db)
        db.close()

    def test_01_canonical_skill_taxonomy_normalization(self):
        """Verifies skills are normalized to canonical standards."""
        mappings = [
            ("postgres", "PostgreSQL"),
            ("postgresql", "PostgreSQL"),
            ("react.js", "React"),
            ("reactjs", "React"),
            ("react", "React"),
            ("node.js", "Node.js"),
            ("nodejs", "Node.js"),
            ("k8s", "Kubernetes"),
            ("kubernetes", "Kubernetes"),
            ("golang", "Go"),
            ("py", "Python"),
            ("python", "Python"),
            ("aws", "AWS"),
        ]
        for raw, canonical in mappings:
            normalized = canonicalize_skill(raw)
            self.assertEqual(
                normalized,
                canonical,
                f"Expected {raw} to normalize to {canonical}, got {normalized}"
            )

    def test_02_resume_text_extraction_and_parsing(self):
        """Verifies text extraction identifies skills, experience, and contact data."""
        sample_resume = """
        Jordan Lee
        Email: jordan.lee@example.com | San Francisco, CA | Authorized to work in US
        
        Summary:
        Senior Distributed Systems Engineer with 6 years experience building microservices.
        
        Technical Skills:
        Languages: Python, Go, TypeScript, SQL
        Frameworks: FastAPI, React, Docker, Kubernetes, PostgreSQL, Redis, AWS
        
        Work Experience:
        Senior Software Engineer - CloudScale Systems (2021 - 2024)
        - Architected event-driven microservices handling 25,000 req/s using Python, FastAPI and Redis.
        - Managed PostgreSQL database clusters and migrated workloads to AWS Kubernetes.
        
        Software Engineer - HyperGrowth Labs (2018 - 2021)
        - Built backend APIs with Go and PostgreSQL.
        - Deployed containerized applications with Docker.
        
        Education:
        B.S. in Computer Science, University of California, Berkeley (2018)
        """
        parsed = parse_resume(sample_resume)
        self.assertIn("jordan.lee@example.com", parsed.get("email", "").lower())
        skills = [s.lower() for s in parsed.get("skills", [])]
        self.assertTrue(any("python" in s for s in skills), "Python should be detected")
        self.assertTrue(any("fastapi" in s for s in skills), "FastAPI should be detected")
        self.assertTrue(any("postgresql" in s for s in skills), "PostgreSQL should be detected")
        self.assertTrue(any("kubernetes" in s for s in skills), "Kubernetes should be detected")

        # Check experience years
        lines = [l.strip() for l in sample_resume.split("\n") if l.strip()]
        history, total_years = extract_experience_and_years(sample_resume, lines)
        self.assertGreaterEqual(total_years, 5.0, "Calculated experience should reflect ~6 years")
        self.assertGreaterEqual(len(history), 2, "Should parse at least 2 job positions")

    def test_03_job_description_parsing(self):
        """Verifies Job Description requirements extraction."""
        sample_jd = """
        Founding Backend Engineer
        Company: Apex Foundry | Remote | $160,000 - $190,000 USD
        
        We are seeking a Founding Backend Engineer with 4+ years of experience.
        Requirements:
        - Strong proficiency in Python, FastAPI, and PostgreSQL.
        - Experience with Docker, Redis, and high-throughput systems.
        - Nice to have: Kubernetes, AWS.
        """
        parsed_jd = parse_jd(sample_jd)
        self.assertGreater(len(parsed_jd["required_skills"]), 0)
        reqs = [r.lower() for r in parsed_jd["required_skills"]]
        self.assertTrue(any("python" in r for r in reqs), "Python should be in required skills")

    def test_04_deterministic_5_component_scoring(self):
        """Verifies S(c, j) = 0.35K + 0.25E + 0.20R + 0.10P + 0.10D."""
        score_res = compute_match_score(
            candidate_skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"],
            candidate_text="Senior Backend Engineer with Python, FastAPI, and PostgreSQL experience at TechCorp (2021-2024).",
            experience_list=[{"title": "Senior Backend Engineer", "company": "TechCorp", "end_year": 2024, "technologies": ["Python", "FastAPI"]}],
            total_exp_years=5.0,
            candidate_headline="Senior Distributed Systems Engineer",
            candidate_roles=["Senior Backend Engineer"],
            projects_list=[{"name": "Distributed Queue", "technologies": ["Python", "Redis"]}],
            job_title="Founding Backend Engineer",
            job_description="Apex Foundry seeks a Founding Backend Engineer with Python and PostgreSQL.",
            required_skills=["Python", "FastAPI", "PostgreSQL"],
            preferred_skills=["Docker", "Redis", "AWS"],
            job_min_exp_years=3.0,
        )
        self.assertIn("score", score_res)
        self.assertIn("breakdown", score_res)
        self.assertIn("explanation", score_res)

        b = score_res["breakdown"]
        # Mathematical verification of weights: S = 0.35K + 0.25E + 0.20R + 0.10P + 0.10D
        expected_score = (
            0.35 * b["K"]
            + 0.25 * b["E"]
            + 0.20 * b["R"]
            + 0.10 * b["P"]
            + 0.10 * b["D"]
        )
        self.assertAlmostEqual(score_res["score"], round(expected_score, 4), places=3)
        self.assertGreaterEqual(score_res["score"], 0.70, "Strong candidate should score >= 70%")
        self.assertTrue(len(score_res["explanation"]) > 20, "Explanation must provide evidence")

    def test_05_hard_constraint_filtering(self):
        """Verifies candidates who fail hard constraints are disqualified."""
        candidate = {
            "work_authorization": "Requires Visa Sponsorship",
            "remote_preference": "On-site",
            "min_salary": 200000,
        }
        job = {
            "requires_sponsorship": False,
            "remote_policy": "Remote",
            "salary_max": 150000,  # Below candidate floor
        }
        # Hard constraints fail
        ok, reason = hard_filter_ok(candidate, job)
        self.assertFalse(ok)
        self.assertTrue(len(reason) > 0)

    def test_06_automated_10am_candidate_dispatch(self):
        """Verifies candidate receives up to 10 automated applications without manual apply."""
        db = SessionLocal()
        candidate = db.query(CandidateProfile).first()
        self.assertIsNotNone(candidate)

        # Trigger dispatch
        apps = dispatch_candidate_10am(db, candidate)
        self.assertGreater(len(apps), 0, "Should dispatch qualifying applications")
        self.assertLessEqual(len(apps), 10, "Strict limit of up to 10 dispatches per day")

        for app in apps:
            self.assertIn(app.source, ["auto", "auto_10am"], "Application source must be auto or auto_10am")
            self.assertIn(app.status.lower(), ["submitted", "in_review", "interview", "interviewing", "recruiter_contacted"])

        # Deduplication test: re-dispatching must not duplicate applications
        count_before = db.query(Application).filter(Application.candidate_id == candidate.id).count()
        dispatch_candidate_10am(db, candidate)
        count_after = db.query(Application).filter(Application.candidate_id == candidate.id).count()
        self.assertEqual(count_before, count_after, "Re-running 10 AM dispatch must be idempotent")
        db.close()

    def test_07_candidate_jobs_endpoint_returns_10am_dispatches_and_invites(self):
        """Verifies GET /api/candidate/jobs returns dispatches and invite balance."""
        # Log in as Alex Chen
        login_res = client.post("/auth/login", json={"email": "alex.backend@example.com", "password": "demo1234"})
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["token"]

        res = client.get("/api/candidate/jobs", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("jobs", data)
        self.assertIn("daily_dispatch", data)
        self.assertIn("invite_stats", data)
        self.assertEqual(data["daily_dispatch"]["hour"], 10)
        self.assertLessEqual(len(data["jobs"]), 10)

        # Dispatched jobs must have transparent explanations
        for job in data["jobs"]:
            self.assertIn("match_score", job)
            self.assertIn("explanation", job)
            self.assertTrue(len(job["explanation"]) > 0)

    def test_08_candidate_registration_blocks_without_code_and_succeeds_with_valid_code(self):
        """Verifies candidate registrations are blocked without invite code and succeed with valid code."""
        # 1. Attempting candidate registration/waitlist without code must fail with 400
        res = client.post("/api/waitlist", json={"email": "uninvited@example.com", "name": "No Code Candidate"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("invite code", res.json()["detail"].lower())

        # 2. Candidate registration with valid single-use code succeeds
        db = SessionLocal()
        inv = db.query(Invitation).filter(Invitation.status == "pending").first()
        self.assertIsNotNone(inv, "A pending invitation must exist")
        valid_code = inv.token
        db.close()

        import secrets
        cand_email = f"jordan.lee.{secrets.token_hex(4)}@example.com"
        onboard_payload = {
            "invite_code": valid_code,
            "name": "Jordan Lee",
            "email": cand_email,
            "password": "securepassword123",
            "work_authorization": "US Citizen / Permanent Resident",
            "target_role": "Staff Platform Engineer",
            "work_preference": "Remote",
            "primary_location": "San Francisco, CA",
            "min_salary": 185000,
            "resume_text": "Staff Platform Engineer with 8 years experience building Kubernetes, Go, Python microservices and PostgreSQL systems."
        }
        onboard_res = client.post("/api/candidate/onboard", json=onboard_payload)
        self.assertEqual(onboard_res.status_code, 200)
        data = onboard_res.json()
        self.assertTrue(data.get("ok"))
        self.assertIn("token", data)
        self.assertIn("verified", data.get("message", "").lower())

        # Verify profile and invites in DB
        db = SessionLocal()
        u = db.query(User).filter(User.email == cand_email).first()
        self.assertIsNotNone(u)
        prof = db.query(CandidateProfile).filter(CandidateProfile.user_id == u.id).first()
        self.assertIsNotNone(prof)
        self.assertEqual(prof.work_authorization, "US Citizen / Permanent Resident")
        self.assertEqual(prof.headline, "Staff Platform Engineer")
        # Ensure 5 invitations were seeded
        user_invs = db.query(Invitation).filter(Invitation.inviter_id == u.id).count()
        self.assertEqual(user_invs, 5)
        db.close()

    def test_09_recruiter_waitlist_with_company_and_transactional_email(self):
        """Verifies recruiters can waitlist the platform with email, name, and company."""
        import secrets
        test_email = f"talent.{secrets.token_hex(4)}@futureventures.example.com"
        rec_payload = {
            "name": "Sarah Jenkins",
            "email": test_email,
            "company_name": "Future Ventures Labs",
            "company_website": "https://futureventures.example.com",
            "hiring_needs": "Hiring 3 Backend Engineers and 2 Machine Learning Researchers."
        }
        res = client.post("/api/recruiter-waitlist", json=rec_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("ok"))
        self.assertEqual(data.get("status"), "waitlisted")

        db = SessionLocal()
        entry = db.query(RecruiterWaitlistEntry).filter(RecruiterWaitlistEntry.email == test_email).first()
        self.assertIsNotNone(entry, "Recruiter waitlist entry must be persisted in DB")
        self.assertEqual(entry.company_name, "Future Ventures Labs")

        outbox = db.query(EmailOutbox).filter(EmailOutbox.recipient_email == test_email).first()
        self.assertIsNotNone(outbox, "Confirmation email must be queued in outbox for recruiter waitlist")
        db.close()

    def test_09b_candidate_waitlist_and_transactional_email(self):
        """Verifies candidates can request an invite via waitlist and receive transactional confirmation."""
        import secrets
        test_email = f"candidate.{secrets.token_hex(4)}@engineers.example.com"
        cand_payload = {
            "name": "Devin Rivera",
            "email": test_email,
            "role_interest": "Distributed Systems Engineer",
            "current_company": "MegaCorp Inc",
            "linkedin_url": "https://linkedin.com/in/example-devin",
            "notes": "Looking for Series A startup roles in distributed databases."
        }
        res = client.post("/api/candidate-waitlist", json=cand_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("ok"))
        self.assertEqual(data.get("status"), "waitlisted")

        db = SessionLocal()
        entry = db.query(CandidateWaitlistEntry).filter(CandidateWaitlistEntry.email == test_email).first()
        self.assertIsNotNone(entry, "Candidate waitlist entry must be persisted in DB")
        self.assertEqual(entry.role_interest, "Distributed Systems Engineer")
        self.assertEqual(entry.current_company, "MegaCorp Inc")

        outbox = db.query(EmailOutbox).filter(EmailOutbox.recipient_email == test_email).first()
        self.assertIsNotNone(outbox, "Confirmation email must be queued in outbox for candidate waitlist")
        self.assertEqual(outbox.template, "candidate_waitlist")
        db.close()

    def test_10_forgot_password_and_reset_flow(self):
        """Verifies forgot-password generates reset token and reset-password updates credentials."""
        import secrets
        from app.auth import hash_password
        db = SessionLocal()
        test_user_email = f"reset.user.{secrets.token_hex(4)}@example.com"
        test_u = User(email=test_user_email, password_hash=hash_password("initialpwd123"), role="candidate")
        db.add(test_u)
        db.commit()
        db.close()

        # 1. Request forgot password for test user
        res = client.post("/auth/forgot-password", json={"email": test_user_email})
        self.assertEqual(res.status_code, 200)
        reset_token = res.json().get("reset_token")
        self.assertTrue(reset_token, "Reset token must be returned or queued")

        # 2. Reset password using token
        new_pwd = "brandnewpassword456"
        reset_res = client.post("/auth/reset-password", json={"token": reset_token, "new_password": new_pwd})
        self.assertEqual(reset_res.status_code, 200)

        # 3. Verify user can log in with new password
        login_res = client.post("/auth/login", json={"email": test_user_email, "password": new_pwd})
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.json().get("ok"))



    def test_11_manual_10am_dispatch_trigger_endpoint(self):
        """Verifies candidate can manually simulate 10 AM dispatch via POST /api/candidate/run-10am."""
        login_res = client.post("/auth/login", json={"email": "elena.datascience@example.com", "password": "demo1234"})
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["token"]

        trigger_res = client.post("/api/candidate/run-10am", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(trigger_res.status_code, 200)
        self.assertTrue(trigger_res.json().get("ok"))


if __name__ == "__main__":
    unittest.main()

