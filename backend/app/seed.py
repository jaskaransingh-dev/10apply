import json
from .models import Job

SEED_JOBS = [
    ("Software Engineer", "Acme AI", "San Francisco, CA", "Hybrid", 130000, 170000, "Full-time", "0-3 years",
     ["Python","FastAPI","AWS","PostgreSQL"], ["Docker","Redis"],
     "We are looking for a backend-leaning software engineer to build AI APIs with Python and FastAPI on AWS. You'll ship Postgres-backed services, work at a startup pace, and own features end to end."),
    ("Backend Engineer", "StartupCo", "San Francisco, CA", "Hybrid", 140000, 180000, "Full-time", "1-3 years",
     ["Python","FastAPI","PostgreSQL","Docker"], ["Kubernetes","Redis"],
     "Backend engineer to scale our API platform. FastAPI, Postgres, Docker. Startup experience a plus."),
    ("Software Engineer", "XYZ", "Los Angeles, CA", "On-site", 120000, 160000, "Full-time", "0-2 years",
     ["Python","React","AWS"], ["GraphQL"],
     "Full-stack software engineer. React frontend, Python backend, deployed on AWS."),
    ("Data Engineer", "ABC Data", "Remote", "Remote", 125000, 165000, "Full-time", "1-3 years",
     ["Python","Spark","Kafka","SQL"], ["AWS","Terraform"],
     "Data engineer to build ETL pipelines with Spark and Kafka. Remote-first team."),
    ("ML Engineer", "DEF Robotics", "San Francisco, CA", "On-site", 150000, 200000, "Full-time", "2-5 years",
     ["Python","PyTorch","Machine Learning","AWS"], ["Kubernetes"],
     "ML engineer to train and deploy PyTorch models for robotics. MLOps on AWS."),
    ("Frontend Engineer", "Glow", "Los Angeles, CA", "Hybrid", 110000, 150000, "Full-time", "0-3 years",
     ["React","TypeScript","Next.js","Tailwind"], ["GraphQL"],
     "Frontend engineer to build delightful React/Next.js experiences with Tailwind."),
    ("Backend Engineer", "Northwind", "Remote", "Remote", 135000, 175000, "Full-time", "2-5 years",
     ["Python","Django","PostgreSQL","Redis"], ["Docker","AWS"],
     "Remote backend engineer. Django + Postgres + Redis. Async-friendly culture."),
    ("Software Engineering Intern", "Acme AI", "San Francisco, CA", "Hybrid", 40000, 60000, "Internship", "0-1 years",
     ["Python","React"], ["FastAPI","AWS"],
     "Summer software engineering internship. Ship real features with mentorship."),
    ("Data Scientist", "Insightly", "San Francisco, CA", "Hybrid", 130000, 170000, "Full-time", "1-3 years",
     ["Python","Machine Learning","Pandas","SQL"], ["TensorFlow"],
     "Data scientist for product analytics and ML prototypes. Pandas, SQL, experimentation."),
    ("DevOps Engineer", "CloudNine", "Remote", "Remote", 140000, 180000, "Full-time", "2-5 years",
     ["AWS","Docker","Kubernetes","Terraform"], ["Python","CI/CD"],
     "DevOps engineer to own AWS, Kubernetes, Terraform and CI/CD pipelines."),
    ("Full-Stack Engineer", "Brightline", "Los Angeles, CA", "Hybrid", 125000, 165000, "Full-time", "1-3 years",
     ["Python","React","PostgreSQL","AWS"], ["Docker"],
     "Full-stack engineer across FastAPI backend and React frontend, Postgres on AWS."),
    ("Backend Engineer", "Kernel Labs", "San Francisco, CA", "On-site", 150000, 190000, "Full-time", "2-5 years",
     ["Go","PostgreSQL","Redis","Docker"], ["Python","Kubernetes"],
     "Backend engineer for high-throughput Go services with Postgres and Redis."),
]

def seed_jobs(db, employer_id: str):
    if db.query(Job).filter(Job.status == "active").count() >= 10:
        return
    for t, co, loc, wa, smin, smax, et, exp, req, pref, desc in SEED_JOBS:
        db.add(Job(
            employer_id=employer_id, title=t, company=co, description=desc,
            location=loc, work_arrangement=wa, salary_min=smin, salary_max=smax,
            employment_type=et, experience=exp,
            required_skills=json.dumps(req), preferred_skills=json.dumps(pref),
            status="active", structured_data=json.dumps({"seed": True}),
        ))
    db.commit()
