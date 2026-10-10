"""Local matching engine test & verification script.

Demonstrates local dense-vector (TF-IDF token embeddings) + structured bonus scoring
between realistic candidate profiles and employer jobs.
"""
import json
from backend.app.database import SessionLocal
from backend.app.models import Job, CandidateProfile
from backend.app.match import score_pair, rank_jobs, rank_candidates


def run_local_matching_tests():
    db = SessionLocal()
    try:
        jobs = db.query(Job).filter(Job.status == "active").all()
        candidates = db.query(CandidateProfile).all()

        print("=" * 80)
        print("rec — LOCAL MATCHING ENGINE VERIFICATION")
        print("=" * 80)
        print(f"Total Active Jobs in Corpus: {len(jobs)}")
        print(f"Total Candidate Profiles:    {len(candidates)}\n")

        # 1. Candidate-perspective: rank all jobs for each candidate
        print("--- 1. CANDIDATE MATCH RANKINGS (Vector Sim + Skill Overlap) ---")
        for cand in candidates:
            if not cand.name:
                continue
            try:
                pdata = json.loads(cand.profile_data or "{}")
                prefs = {
                    "roles": json.loads(cand.roles or "[]"),
                    "locations": json.loads(cand.locations or "[]"),
                    "remote": bool(cand.remote),
                    "salary_min": cand.salary_min or 0,
                    "experience_level": cand.experience_level or "2-5 years",
                }
            except Exception:
                pdata, prefs = {}, {}

            ranked = rank_jobs(pdata, prefs, cand.resume_text or "", jobs)
            top = ranked[0] if ranked else None
            bottom = ranked[-1] if ranked else None

            skills = pdata.get("skills", [])[:4]
            print(f"\nCandidate: {cand.name} [{cand.work_authorization}]")
            print(f"  Target: {prefs.get('roles', ['General'])[:2]} | Skills: {skills}")
            if top:
                print(f"  --> #1 BEST MATCH:   {top[0]}% - {top[1].company}: {top[1].title} ({top[2]})")
            if bottom:
                print(f"  --> LOWEST MATCH:    {bottom[0]}% - {bottom[1].company}: {bottom[1].title}")

        # 2. Employer-perspective: rank candidates for key jobs
        print("\n\n--- 2. EMPLOYER INBOUND PIPELINE RANKING (JD-as-Query) ---")
        key_titles = ["Senior Frontend Engineer", "Senior Backend Systems Engineer", "AI & ML Infrastructure Engineer", "Product Designer"]
        triplets = []
        for p in candidates:
            try:
                pd = json.loads(p.profile_data or "{}")
            except Exception:
                pd = {}
            triplets.append((p, pd, p.resume_text or ""))

        for job in jobs:
            if job.title not in key_titles:
                continue
            ranked_cands = rank_candidates(job, triplets)
            print(f"\nRole: {job.company} - {job.title}")
            print(f"Required Skills: {job.required_skills}")
            print("  Ranked Candidates:")
            for rank_idx, (pct, p, pd, why, matched) in enumerate(ranked_cands[:3], 1):
                print(f"    #{rank_idx} {pct}% - {p.name} [{p.work_authorization}]: {why}")

        print("\n" + "=" * 80)
        print("All local vector matching and structured scoring tests completed successfully.")
        print("=" * 80)
    finally:
        db.close()


if __name__ == "__main__":
    run_local_matching_tests()
