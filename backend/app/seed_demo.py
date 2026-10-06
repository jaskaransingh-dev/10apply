"""Demo dataset: employers who post jobs + candidates who apply. Idempotent.

Run:  python -m app.seed_demo        (from backend/)
  or: POST /demo/seed

Everything is keyed on fixed emails / (employer, title), so re-running only
fills gaps and never duplicates. Password for every demo account: demo1234.
"""
import json
from sqlalchemy.orm import Session

from .auth import hash_password
from .models import User, CandidateProfile, Job, Application, Message

PASSWORD = "demo1234"

EMPLOYERS = [
    {"email": "ava@demo.acme.test", "company": "Acme AI", "location": "San Francisco, CA",
     "jobs": [
         {"title": "Backend Engineer",
          "description": "Backend engineer to build AI APIs with Python and FastAPI on AWS. Postgres-backed services, startup pace, own features end to end.",
          "work_arrangement": "Hybrid", "salary_min": 140000, "salary_max": 180000,
          "employment_type": "Full-time", "experience": "1-3 years",
          "required_skills": ["Python", "FastAPI", "PostgreSQL"], "preferred_skills": ["AWS", "Docker"]},
         {"title": "Frontend Engineer",
          "description": "Frontend engineer to build delightful React and Next.js experiences with Tailwind. Work closely with design, ship weekly.",
          "work_arrangement": "Hybrid", "salary_min": 120000, "salary_max": 160000,
          "employment_type": "Full-time", "experience": "0-3 years",
          "required_skills": ["React", "TypeScript", "Next.js"], "preferred_skills": ["Tailwind", "GraphQL"]},
         {"title": "iOS Engineer",
          "description": "iOS engineer for our companion app. Swift, SwiftUI, ship to the App Store.",
          "work_arrangement": "Hybrid", "salary_min": 130000, "salary_max": 170000,
          "employment_type": "Full-time", "experience": "1-3 years",
          "required_skills": ["Swift"], "preferred_skills": ["Figma"],
          "status": "draft"},
     ]},
    {"email": "ben@demo.bright.test", "company": "Brightline", "location": "Los Angeles, CA",
     "jobs": [
         {"title": "Full-Stack Engineer",
          "description": "Full-stack engineer across a FastAPI backend and React frontend, Postgres on AWS. Small team, big ownership.",
          "work_arrangement": "Hybrid", "salary_min": 125000, "salary_max": 165000,
          "employment_type": "Full-time", "experience": "1-3 years",
          "required_skills": ["Python", "React", "PostgreSQL", "AWS"], "preferred_skills": ["Docker"]},
         {"title": "Data Engineer",
          "description": "Data engineer to build ETL pipelines with Spark and Kafka. SQL-heavy, remote-first team, Terraform on AWS.",
          "work_arrangement": "Remote", "salary_min": 125000, "salary_max": 165000,
          "employment_type": "Full-time", "experience": "1-3 years",
          "required_skills": ["Python", "Spark", "Kafka", "SQL"], "preferred_skills": ["AWS", "Terraform"]},
     ]},
    {"email": "cara@demo.insight.test", "company": "Insightly", "location": "San Francisco, CA",
     "jobs": [
         {"title": "Data Scientist",
          "description": "Data scientist for product analytics and ML prototypes. Pandas, SQL, experimentation, dashboards that drive decisions.",
          "work_arrangement": "Hybrid", "salary_min": 130000, "salary_max": 170000,
          "employment_type": "Full-time", "experience": "1-3 years",
          "required_skills": ["Python", "Machine Learning", "Pandas", "SQL"], "preferred_skills": ["TensorFlow"]},
         {"title": "ML Engineer",
          "description": "ML engineer to train and deploy PyTorch models. MLOps on AWS, Kubernetes serving, Python services in production.",
          "work_arrangement": "On-site", "salary_min": 150000, "salary_max": 200000,
          "employment_type": "Full-time", "experience": "2-5 years",
          "required_skills": ["Python", "PyTorch", "Machine Learning", "AWS"], "preferred_skills": ["Kubernetes"]},
     ]},
    {"email": "omar@demo.cloud.test", "company": "CloudNine", "location": "Remote",
     "jobs": [
         {"title": "DevOps Engineer",
          "description": "DevOps engineer to own AWS, Kubernetes, Terraform and CI/CD pipelines. On-call rotation, infrastructure as code.",
          "work_arrangement": "Remote", "salary_min": 140000, "salary_max": 180000,
          "employment_type": "Full-time", "experience": "2-5 years",
          "required_skills": ["AWS", "Docker", "Kubernetes", "Terraform"], "preferred_skills": ["Python", "CI/CD"]},
         {"title": "Backend Engineer",
          "description": "Backend engineer for high-throughput Go services with Postgres and Redis. Low-latency APIs, Kubernetes deploys.",
          "work_arrangement": "Remote", "salary_min": 150000, "salary_max": 190000,
          "employment_type": "Full-time", "experience": "2-5 years",
          "required_skills": ["Go", "PostgreSQL", "Redis", "Docker"], "preferred_skills": ["Python", "Kubernetes"]},
     ]},
    {"email": "pip@demo.pixel.test", "company": "Pixelworks", "location": "Los Angeles, CA",
     "jobs": [
         {"title": "Frontend Engineer",
          "description": "Frontend engineer crafting pixel-perfect React interfaces with designers in Figma. Tailwind, Next.js, motion.",
          "work_arrangement": "Hybrid", "salary_min": 115000, "salary_max": 155000,
          "employment_type": "Full-time", "experience": "0-3 years",
          "required_skills": ["React", "TypeScript", "Tailwind"], "preferred_skills": ["Figma", "Next.js"]},
         {"title": "Product Designer",
          "description": "Product designer owning end-to-end flows in Figma, from wireframes to prototypes. Works embedded with frontend engineers.",
          "work_arrangement": "Hybrid", "salary_min": 105000, "salary_max": 145000,
          "employment_type": "Full-time", "experience": "1-3 years",
          "required_skills": ["Figma", "React", "Tailwind"], "preferred_skills": ["TypeScript"]},
     ]},
]

CANDIDATES = [
    {"email": "dev-backend@demo.test", "name": "Dev Backend", "location": "San Francisco, CA",
     "skills": ["Python", "FastAPI", "PostgreSQL", "AWS", "Docker"],
     "roles": ["Backend Engineer"], "experience_level": "1-2 years",
     "resume_text": ("Dev Backend, San Francisco, CA. Backend Engineering Intern at Acme (2025): built REST APIs "
                     "with Python and FastAPI, Postgres queries, Docker containers on AWS. Projects: task API with "
                     "FastAPI + PostgreSQL, Redis caching. Skills: Python, FastAPI, PostgreSQL, AWS, Docker.")},
    {"email": "front-react@demo.test", "name": "Rae Frontend", "location": "Los Angeles, CA",
     "skills": ["React", "TypeScript", "Next.js", "Tailwind", "GraphQL"],
     "roles": ["Frontend Engineer"], "experience_level": "1-2 years",
     "resume_text": ("Rae Frontend, Los Angeles, CA. Frontend Intern at Glow (2025): shipped React and Next.js pages "
                     "with TypeScript and Tailwind, GraphQL data fetching, Lighthouse 95+. Projects: portfolio site "
                     "in Next.js, component library. Skills: React, TypeScript, Next.js, Tailwind.")},
    {"email": "data-ana@demo.test", "name": "Dana Analyst", "location": "Remote",
     "skills": ["Python", "Pandas", "SQL", "Machine Learning", "Tableau"],
     "roles": ["Data Scientist"], "experience_level": "1-2 years",
     "resume_text": ("Dana Analyst, Remote. Data Analyst Intern at Insightly (2025): product analytics with Pandas "
                     "and SQL, A/B test analysis, Tableau dashboards. ML coursework: regression, clustering. "
                     "Skills: Python, Pandas, SQL, Machine Learning.")},
    {"email": "new-grad@demo.test", "name": "Gus Grad", "location": "San Francisco, CA",
     "skills": ["Python", "React"],
     "roles": ["Software Engineer"], "experience_level": "New Grad",
     "resume_text": ("Gus Grad, San Francisco, CA. Recent CS grad. Coursework: web dev with Python and React, "
                     "databases, algorithms. Projects: notes app (React + Flask). Looking for a first role.")},
    {"email": "ops-iva@demo.test", "name": "Ivy Ops", "location": "Remote",
     "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Python"],
     "roles": ["DevOps Engineer"], "experience_level": "2-5 years",
     "resume_text": ("Ivy Ops, Remote. DevOps Intern at CloudNine (2025): Terraform modules for AWS, Kubernetes "
                     "deploys, CI/CD pipelines, Docker images, on-call shadowing. Python scripting for automation. "
                     "Skills: AWS, Docker, Kubernetes, Terraform, Python.")},
    {"email": "des-ign@demo.test", "name": "Des Ign", "location": "Los Angeles, CA",
     "skills": ["Figma", "React", "Tailwind", "TypeScript"],
     "roles": ["Product Designer", "Frontend Engineer"], "experience_level": "1-2 years",
     "resume_text": ("Des Ign, Los Angeles, CA. Design Engineer Intern at Pixelworks (2025): Figma prototypes, "
                     "React + Tailwind implementation, design systems, motion. Portfolio of shipped flows. "
                     "Skills: Figma, React, Tailwind, TypeScript.")},
]

# (candidate_email, employer_email, job_title, status)
APPLICATIONS = [
    ("dev-backend@demo.test", "ava@demo.acme.test", "Backend Engineer", "Submitted"),
    ("dev-backend@demo.test", "ben@demo.bright.test", "Full-Stack Engineer", "Submitted"),
    ("dev-backend@demo.test", "cara@demo.insight.test", "ML Engineer", "Interview"),
    ("front-react@demo.test", "ava@demo.acme.test", "Frontend Engineer", "Submitted"),
    ("front-react@demo.test", "ben@demo.bright.test", "Full-Stack Engineer", "Submitted"),
    ("data-ana@demo.test", "cara@demo.insight.test", "Data Scientist", "Submitted"),
    ("data-ana@demo.test", "ben@demo.bright.test", "Data Engineer", "Submitted"),
    ("ops-iva@demo.test", "omar@demo.cloud.test", "DevOps Engineer", "Submitted"),
    ("ops-iva@demo.test", "omar@demo.cloud.test", "Backend Engineer", "Submitted"),
    ("des-ign@demo.test", "pip@demo.pixel.test", "Frontend Engineer", "Submitted"),
    ("des-ign@demo.test", "pip@demo.pixel.test", "Product Designer", "Interview"),
]


def get_or_create_user(db: Session, email: str, role: str) -> tuple:
    u = db.query(User).filter(User.email == email).first()
    if u:
        return u, False
    u = User(email=email, password_hash=hash_password(PASSWORD), role=role)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u, True


def seed_demo(db: Session) -> dict:
    counts = {"employers": 0, "jobs": 0, "candidates": 0, "applications": 0, "messages": 0}
    job_map: dict = {}

    for emp in EMPLOYERS:
        u, created = get_or_create_user(db, emp["email"], "employer")
        counts["employers"] += created
        for spec in emp["jobs"]:
            j = db.query(Job).filter(Job.employer_id == u.id, Job.title == spec["title"]).first()
            if not j:
                j = Job(employer_id=u.id, title=spec["title"], company=emp["company"], location=emp["location"],
                        description=spec["description"], work_arrangement=spec["work_arrangement"],
                        salary_min=spec["salary_min"], salary_max=spec["salary_max"],
                        employment_type=spec["employment_type"], experience=spec["experience"],
                        required_skills=json.dumps(spec["required_skills"]),
                        preferred_skills=json.dumps(spec["preferred_skills"]),
                        status=spec.get("status", "active"), structured_data=json.dumps({"demo": True}))
                db.add(j)
                db.commit()
                db.refresh(j)
                counts["jobs"] += 1
            job_map[(emp["email"], spec["title"])] = j

    profiles: dict = {}
    for cand in CANDIDATES:
        u, created = get_or_create_user(db, cand["email"], "candidate")
        counts["candidates"] += created
        p = db.query(CandidateProfile).filter(CandidateProfile.user_id == u.id).first()
        pdata = {
            "name": cand["name"], "location": cand["location"], "skills": cand["skills"],
            "experience": [{"company": "Demo Internship", "title": f"{cand['roles'][0]} Intern",
                            "start": "2025", "end": "2025", "skills": cand["skills"][:3]}],
            "education": [{"school": "State University", "degree": "B.S.", "graduation_year": 2025}],
            "job_preferences": {"roles": cand["roles"], "locations": [],
                                "remote": True, "employment_types": ["Full-time"],
                                "salary_min": 0, "experience_level": cand["experience_level"]},
        }
        if not p:
            p = CandidateProfile(user_id=u.id)
            db.add(p)
        p.name = cand["name"]
        p.location = cand["location"]
        p.resume_text = cand["resume_text"]
        p.profile_data = json.dumps(pdata)
        p.roles = json.dumps(cand["roles"])
        p.locations = json.dumps([])
        p.remote = 1
        p.experience_level = cand["experience_level"]
        db.commit()
        profiles[cand["email"]] = p

    for cand_email, emp_email, title, status in APPLICATIONS:
        p = profiles.get(cand_email)
        j = job_map.get((emp_email, title))
        if not p or not j:
            continue
        a = db.query(Application).filter(
            Application.candidate_id == p.id, Application.job_id == j.id).first()
        if not a:
            db.add(Application(candidate_id=p.id, job_id=j.id, status=status))
            counts["applications"] += 1
    db.commit()

    # A short thread: employer reaches out, candidate replies.
    thread = [
        ("ava@demo.acme.test", "dev-backend@demo.test", "Backend Engineer",
         "Hi Dev, loved your FastAPI + Postgres work — are you free for a chat this week?"),
        ("dev-backend@demo.test", "ava@demo.acme.test", "Backend Engineer",
         "Hi Ava! Thanks for reaching out — Thursday afternoon works for me."),
        ("cara@demo.insight.test", "data-ana@demo.test", "Data Scientist",
         "Hi Dana, your experimentation write-up caught my eye — want to discuss the Data Scientist role?"),
    ]
    emails = {s for s, _, _, _ in thread} | {r for _, r, _, _ in thread}
    users = {e: db.query(User).filter(User.email == e).first() for e in emails}
    for sender_email, recv_email, title, body in thread:
        s, r = users[sender_email], users[recv_email]
        j = next((jj for (ee, tt), jj in job_map.items() if tt == title and ee == sender_email),
                 next((jj for (_, tt), jj in job_map.items() if tt == title), None))
        exists = db.query(Message).filter(
            Message.sender_id == s.id, Message.receiver_id == r.id, Message.body == body).first()
        if not exists:
            db.add(Message(sender_id=s.id, receiver_id=r.id,
                           job_id=j.id if j else None, body=body))
            counts["messages"] += 1
    db.commit()
    return counts


if __name__ == "__main__":
    from .database import SessionLocal, engine, Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print(seed_demo(db))
    finally:
        db.close()
