"""Fictional Demo Dataset for Resume-First Hiring Marketplace.

Strict standards (Section 6 & 8):
- All emails use reserved domain `@example.com`
- All company names are fictional (Apex Foundry, MetricPulse Analytics)
- No physical street addresses
- Real resume files written to private storage `backend/storage/resumes/`
- All records processed through actual `parse_resume` and `compute_match_score`
- Persistent records stored in users, resumes, resume_parses, candidate_projects,
  jobs, job_requirements, matches, conversations, messages, and email_outbox.
- Idempotent: safe to run multiple times without duplicates.
"""
import json
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from .auth import hash_password
from .models import (
    User,
    CandidateProfile,
    RecruiterProfile,
    Company,
    Resume,
    ResumeParse,
    CandidateProject,
    Job,
    JobRequirement,
    Match,
    Application,
    Conversation,
    Message,
    Invitation,
    EmailOutbox
)
from .parse import parse_resume
from .match import compute_match_score

DEMO_PASSWORD = "demo1234"
STORAGE_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "resumes"))


CANDIDATES_DATA = [
    {
        "email": "alex.backend@example.com",
        "name": "Alex Chen",
        "headline": "Senior Backend Systems Engineer",
        "location": "San Francisco, CA",
        "remote_preference": "Remote",
        "work_authorization": "Authorized to work in US",
        "min_salary": 160000,
        "resume_filename": "alex_chen_resume.txt",
        "resume_content": """Alex Chen
alex.backend@example.com | San Francisco, CA | https://github.com/example/alexchen
Senior Backend Systems Engineer

Professional Summary
Senior Backend Engineer with 5+ years of experience designing high-throughput distributed systems, asynchronous event-driven services, and relational databases. Specialized in Python, FastAPI, PostgreSQL, and containerized deployments.

Work Experience
Founding Backend Engineer | Fictional Core Systems (2022 - Present)
- Designed and built asynchronous distributed ingestion API handling 40,000 requests/minute using Python, FastAPI, and PostgreSQL.
- Implemented transactional outbox and worker pipeline using Redis, Celery, and Docker.
- Optimized slow SQL queries and PostgreSQL database indexes, reducing p99 latency from 450ms to 38ms.

Software Engineer | NextScale Technologies (2019 - 2022)
- Developed REST APIs and microservices in Python and Django with automated CI/CD pipelines.
- Containerized development and staging environments using Docker and Linux.

Education
University of California, Berkeley - B.S. Computer Science, 2019

Skills
Python, FastAPI, PostgreSQL, Redis, Docker, SQL, REST APIs, Microservices, Linux, Git, CI/CD

Projects
Distributed Queue Engine - https://github.com/example/async-queue-engine
Open source asynchronous task queue with PostgreSQL persistence, dead-letter queues, and Redis locking.
""",
        "projects": [
            {
                "label": "Distributed Queue Engine",
                "url": "https://github.com/example/async-queue-engine",
                "project_type": "github",
                "description": "High-throughput asynchronous task queue with PostgreSQL persistence and Redis locking.",
                "technologies": ["Python", "PostgreSQL", "Redis", "Docker"]
            },
            {
                "label": "Database Query Profiler",
                "url": "https://github.com/example/db-query-profiler",
                "project_type": "github",
                "description": "Automated index recommendation tool for PostgreSQL databases.",
                "technologies": ["Python", "PostgreSQL", "SQL"]
            }
        ]
    },
    {
        "email": "elena.datascience@example.com",
        "name": "Elena Rostova",
        "headline": "Lead Data Scientist & ML Engineer",
        "location": "New York, NY",
        "remote_preference": "Hybrid",
        "work_authorization": "Authorized to work in US",
        "min_salary": 155000,
        "resume_filename": "elena_rostova_resume.txt",
        "resume_content": """Elena Rostova
elena.datascience@example.com | New York, NY
Lead Data Scientist & ML Engineer

Professional Summary
Data scientist with 4+ years of industry experience developing statistical models, predictive machine learning pipelines, and experimentation frameworks. Expert in Python, SQL, Pandas, PyTorch, and A/B Testing.

Work Experience
Senior Data Scientist | DataPulse Analytics (2021 - Present)
- Built predictive customer retention models using Python, Scikit-Learn, and PyTorch, improving cohort retention by 14%.
- Designed randomized A/B testing infrastructure evaluating product feature launches with rigorous statistical confidence.
- Engineered complex SQL data pipelines in PostgreSQL and Pandas for executive telemetry.

Data Analyst | Insight Capital (2020 - 2021)
- Conducted exploratory data analysis, hypothesis testing, and statistical regression modeling using Python, SQL, and Excel.

Education
Columbia University - M.S. Data Science, 2020
New York University - B.A. Mathematics & Statistics, 2018

Skills
Python, Machine Learning, SQL, Statistics, PyTorch, Pandas, A/B Testing, Data Analysis, PostgreSQL, Git

Projects
Customer Churn Predictor - https://example.com/demo/churn-model
Interactive machine learning demo providing explainable churn predictions with SHAP values.
""",
        "projects": [
            {
                "label": "Customer Churn Predictor",
                "url": "https://example.com/demo/churn-model",
                "project_type": "demo",
                "description": "Live interactive ML classifier calculating customer retention probability with SHAP explanation plots.",
                "technologies": ["Python", "Machine Learning", "PyTorch", "SQL"]
            }
        ]
    },
    {
        "email": "marcus.fullstack@example.com",
        "name": "Marcus Taylor",
        "headline": "Full-Stack Software Engineer",
        "location": "Austin, TX",
        "remote_preference": "Remote",
        "work_authorization": "Authorized to work in US",
        "min_salary": 145000,
        "resume_filename": "marcus_taylor_resume.txt",
        "resume_content": """Marcus Taylor
marcus.fullstack@example.com | Austin, TX | https://github.com/example/marcustaylor
Full-Stack Software Engineer

Professional Summary
Full-stack engineer with 4 years of experience building modern web applications. Proficient across the entire stack with TypeScript, React, Next.js, Node.js, and PostgreSQL.

Work Experience
Full Stack Engineer | CloudCraft Labs (2022 - Present)
- Developed responsive, accessible frontend web applications using React, Next.js, TypeScript, and Tailwind CSS.
- Built backend GraphQL and REST APIs with Node.js and PostgreSQL.
- Implemented real-time collaborative editing features using WebSockets.

Frontend Developer | AppVelocity (2020 - 2022)
- Built interactive client interfaces with React, JavaScript, and CSS3.

Education
University of Texas at Austin - B.S. Computer Science, 2020

Skills
TypeScript, React, Next.js, Node.js, PostgreSQL, Tailwind CSS, JavaScript, REST APIs, Git, GraphQL

Projects
Collaborative Document Editor - https://github.com/example/collab-editor
Real-time multiplayer text and diagram editor built with React, Next.js, and WebSockets.
""",
        "projects": [
            {
                "label": "Collaborative Document Editor",
                "url": "https://github.com/example/collab-editor",
                "project_type": "github",
                "description": "Multiplayer real-time canvas and text editor built with Next.js, TypeScript, and WebSockets.",
                "technologies": ["TypeScript", "React", "Next.js", "Node.js"]
            }
        ]
    }
]


RECRUITERS_DATA = [
    {
        "email": "founder@apexfoundry.example.com",
        "company_name": "Apex Foundry",
        "company_website": "https://apexfoundry.example.com",
        "role_title": "Co-founder & CTO",
        "job": {
            "title": "Founding Backend Engineer",
            "function": "Engineering",
            "seniority": "Senior / Founding",
            "employment_type": "Full-time",
            "remote_policy": "Remote",
            "location": "Remote",
            "min_salary": 165000,
            "max_salary": 215000,
            "currency": "USD",
            "description": "Apex Foundry is building resilient autonomous workflow infrastructure for developers. We are seeking our Founding Backend Engineer to lead backend architecture, design high-performance asynchronous APIs, and own our core data pipelines from day one.",
            "responsibilities": "- Architect high-throughput distributed microservices with Python and FastAPI.\n- Design robust database schemas and write optimized PostgreSQL queries.\n- Implement asynchronous task processing with Redis and Docker.\n- Work directly with the founding team on product direction and engineering culture.",
            "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "preferred_skills": ["Redis", "Kubernetes", "Microservices"],
            "min_experience_years": 3.0
        }
    },
    {
        "email": "hiring@metricpulse.example.com",
        "company_name": "MetricPulse Analytics",
        "company_website": "https://metricpulse.example.com",
        "role_title": "Head of People & Talent",
        "job": {
            "title": "Lead Data Scientist",
            "function": "AI & Data",
            "seniority": "Lead / Staff",
            "employment_type": "Full-time",
            "remote_policy": "Hybrid",
            "location": "New York, NY",
            "min_salary": 155000,
            "max_salary": 195000,
            "currency": "USD",
            "description": "MetricPulse Analytics provides predictive intelligence and statistical modeling for modern subscription companies. We are seeking a Lead Data Scientist to build rigorous experimentation frameworks, develop predictive machine learning models, and analyze telemetry.",
            "responsibilities": "- Develop production machine learning models and predictive classifiers using Python and PyTorch.\n- Design rigorous A/B testing methodologies and analyze experiment results.\n- Write performant SQL queries across large-scale analytics warehouses.\n- Partner with product engineering to deploy models into production.",
            "required_skills": ["Python", "Machine Learning", "SQL", "Statistics"],
            "preferred_skills": ["PyTorch", "A/B Testing", "Pandas"],
            "min_experience_years": 3.0
        }
    }
]


def seed_demo(db: Session):
    """Seed or reseed the isolated fictional demo dataset idempotently."""
    os.makedirs(STORAGE_DIR, exist_ok=True)
    created_candidates = []
    created_jobs = []

    # 1. Seed Candidates
    for cdata in CANDIDATES_DATA:
        user = db.query(User).filter(User.email == cdata["email"]).first()
        if not user:
            user = User(
                email=cdata["email"],
                password_hash=hash_password(DEMO_PASSWORD),
                role="candidate",
                account_status="active",
                invite_code=f"DEMO-{cdata['name'].split()[0].upper()}",
                is_demo=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
        if not profile:
            profile = CandidateProfile(
                user_id=user.id,
                name=cdata["name"],
                email=cdata["email"],
                headline=cdata["headline"],
                location=cdata["location"],
                remote_preference=cdata["remote_preference"],
                work_arrangement=cdata["remote_preference"],
                work_authorization=cdata["work_authorization"],
                min_salary=cdata["min_salary"],
                salary_min=cdata["min_salary"],
                is_demo=True
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

        # Write actual resume file to private storage
        storage_filename = f"{profile.id}_{cdata['resume_filename']}"
        file_path = os.path.join(STORAGE_DIR, storage_filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(cdata["resume_content"])

        # Create or update Resume record
        resume = db.query(Resume).filter(Resume.candidate_id == profile.id, Resume.is_active == True).first()
        if not resume:
            resume = Resume(
                candidate_id=profile.id,
                filename=cdata["resume_filename"],
                file_path=file_path,
                storage_key=storage_filename,
                mime_type="text/plain",
                file_size=len(cdata["resume_content"]),
                version=1,
                is_active=True,
                status="parsed"
            )
            db.add(resume)
            db.commit()
            db.refresh(resume)

        # Run actual parsing pipeline
        parsed = parse_resume(cdata["resume_content"])
        parse_record = db.query(ResumeParse).filter(ResumeParse.resume_id == resume.id).first()
        if not parse_record:
            parse_record = ResumeParse(
                resume_id=resume.id,
                candidate_id=profile.id,
                raw_text=cdata["resume_content"],
                parsed_name=cdata["name"],
                parsed_email=cdata["email"],
                parsed_title=cdata["headline"],
                parsed_skills=json.dumps(parsed.get("skills_structured", [])),
                parsed_experience=json.dumps(parsed.get("experience", [])),
                parsed_education=json.dumps(parsed.get("education", [])),
                parsed_projects=json.dumps(parsed.get("projects", [])),
                total_experience_years=parsed.get("total_experience_years", 3.0),
                status="parsed"
            )
            db.add(parse_record)
            db.commit()

        # Update CandidateProfile with parsed fields
        profile.skills = json.dumps(parsed.get("skills", []))
        profile.headline = cdata["headline"]
        profile.resume_text = cdata["resume_content"]
        profile.profile_data = json.dumps(parsed)
        db.commit()

        # Seed projects
        for pinfo in cdata["projects"]:
            proj = db.query(CandidateProject).filter(
                CandidateProject.candidate_id == profile.id,
                CandidateProject.label == pinfo["label"]
            ).first()
            if not proj:
                proj = CandidateProject(
                    candidate_id=profile.id,
                    label=pinfo["label"],
                    title=pinfo["label"],
                    url=pinfo["url"],
                    repo_url=pinfo["url"] if pinfo["project_type"] == "github" else "",
                    demo_url=pinfo["url"] if pinfo["project_type"] == "demo" else "",
                    project_type=pinfo["project_type"],
                    description=pinfo["description"],
                    technologies=json.dumps(pinfo["technologies"])
                )
                db.add(proj)
        db.commit()

        # Ensure single-use invitation exists for candidate
        inv = db.query(Invitation).filter(Invitation.inviter_id == user.id).first()
        if not inv:
            inv = Invitation(
                inviter_id=user.id,
                token=f"INVITE-{user.id[:6].upper()}",
                recipient_email=f"friend.{cdata['name'].split()[0].lower()}@example.com",
                status="pending",
                expires_at=datetime.utcnow() + timedelta(days=30)
            )
            db.add(inv)
            db.commit()

        created_candidates.append((user, profile, parsed))

    # 2. Seed Recruiters & Published Jobs
    for rdata in RECRUITERS_DATA:
        rec_user = db.query(User).filter(User.email == rdata["email"]).first()
        if not rec_user:
            rec_user = User(
                email=rdata["email"],
                password_hash=hash_password(DEMO_PASSWORD),
                role="recruiter",
                account_status="active",
                is_demo=True
            )
            db.add(rec_user)
            db.commit()
            db.refresh(rec_user)

        company = db.query(Company).filter(Company.employer_id == rec_user.id).first()
        if not company:
            company = Company(
                employer_id=rec_user.id,
                name=rdata["company_name"],
                website=rdata["company_website"],
                work_email=rdata["email"],
                verified=1
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        rec_profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == rec_user.id).first()
        if not rec_profile:
            rec_profile = RecruiterProfile(
                user_id=rec_user.id,
                company_name=rdata["company_name"],
                company_website=rdata["company_website"],
                role_title=rdata["role_title"]
            )
            db.add(rec_profile)
            db.commit()

        jinfo = rdata["job"]
        job = db.query(Job).filter(Job.employer_id == rec_user.id, Job.title == jinfo["title"]).first()
        if not job:
            job = Job(
                employer_id=rec_user.id,
                recruiter_id=rec_user.id,
                company_id=company.id,
                company=rdata["company_name"],
                company_name=rdata["company_name"],
                company_website=rdata["company_website"],
                title=jinfo["title"],
                function=jinfo["function"],
                seniority=jinfo["seniority"],
                employment_type=jinfo["employment_type"],
                work_arrangement=jinfo["remote_policy"],
                remote_policy=jinfo["remote_policy"],
                location=jinfo["location"],
                salary_min=jinfo["min_salary"],
                salary_max=jinfo["max_salary"],
                currency=jinfo["currency"],
                description=jinfo["description"],
                responsibilities=jinfo["responsibilities"],
                required_skills=json.dumps(jinfo["required_skills"]),
                preferred_skills=json.dumps(jinfo["preferred_skills"]),
                status="published",
                is_demo=True
            )
            db.add(job)
            db.commit()
            db.refresh(job)

        req = db.query(JobRequirement).filter(JobRequirement.job_id == job.id).first()
        if not req:
            req = JobRequirement(
                job_id=job.id,
                required_skills=json.dumps(jinfo["required_skills"]),
                preferred_skills=json.dumps(jinfo["preferred_skills"]),
                min_experience_years=jinfo["min_experience_years"],
                hard_constraints=json.dumps({"remote": jinfo["remote_policy"]})
            )
            db.add(req)
            db.commit()

        created_jobs.append((rec_user, job, jinfo))

    # 3. Run Matching Pipeline and Save Matches
    for user, profile, parsed in created_candidates:
        projs = db.query(CandidateProject).filter(CandidateProject.candidate_id == profile.id).all()
        proj_dicts = [
            {
                "name": p.label or p.title,
                "description": p.description,
                "technologies": json.loads(p.technologies or "[]")
            }
            for p in projs
        ]
        
        for rec_user, job, jinfo in created_jobs:
            score_data = compute_match_score(
                candidate_skills=parsed.get("skills", []),
                candidate_text=profile.resume_text,
                experience_list=parsed.get("experience", []),
                total_exp_years=parsed.get("total_experience_years", 3.0),
                candidate_headline=profile.headline,
                candidate_roles=[profile.headline],
                projects_list=proj_dicts,
                job_title=job.title,
                job_description=job.description,
                required_skills=jinfo["required_skills"],
                preferred_skills=jinfo["preferred_skills"],
                job_min_exp_years=jinfo["min_experience_years"]
            )

            match = db.query(Match).filter(Match.candidate_id == profile.id, Match.job_id == job.id).first()
            if not match:
                match = Match(
                    candidate_id=profile.id,
                    job_id=job.id,
                    score=score_data["score"],
                    score_breakdown=json.dumps(score_data["breakdown"]),
                    explanation=score_data["explanation"],
                    matched_skills=json.dumps(score_data["matched_skills"]),
                    missing_skills=json.dumps(score_data["missing_skills"]),
                    strengths=json.dumps(score_data["strengths"]),
                    match_version="2.0.0"
                )
                db.add(match)
            else:
                match.score = score_data["score"]
                match.score_breakdown = json.dumps(score_data["breakdown"])
                match.explanation = score_data["explanation"]
                match.matched_skills = json.dumps(score_data["matched_skills"])
                match.missing_skills = json.dumps(score_data["missing_skills"])
                match.strengths = json.dumps(score_data["strengths"])
            db.commit()

    # 4. Seed an initial persistent conversation & email notification from Apex Foundry to Alex Chen
    alex_user, alex_profile, _ = created_candidates[0]
    apex_recruiter, apex_job, _ = created_jobs[0]

    conv = db.query(Conversation).filter(
        Conversation.candidate_id == alex_profile.id,
        Conversation.recruiter_id == apex_recruiter.id
    ).first()

    if not conv:
        conv = Conversation(
            candidate_id=alex_profile.id,
            recruiter_id=apex_recruiter.id,
            job_id=apex_job.id,
            candidate_unread_count=1,
            recruiter_unread_count=0,
            last_message_at=datetime.utcnow()
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        msg_body = f"Hi Alex, I came across your resume and project on GitHub (Distributed Queue Engine). Your work with Python, FastAPI, and PostgreSQL is an exact fit for what we are building at {apex_job.company}. Would you be open to connecting this week?"
        msg = Message(
            conversation_id=conv.id,
            sender_id=apex_recruiter.id,
            recipient_id=alex_user.id,
            receiver_id=alex_user.id,
            job_id=apex_job.id,
            content=msg_body,
            body=msg_body,
            is_read=False
        )
        db.add(msg)

        # Set application status to recruiter_contacted
        app = db.query(Application).filter(Application.candidate_id == alex_profile.id, Application.job_id == apex_job.id).first()
        if not app:
            app = Application(
                candidate_id=alex_profile.id,
                job_id=apex_job.id,
                status="recruiter_contacted",
                source="recruiter_outreach",
                last_activity_at=datetime.utcnow()
            )
            db.add(app)
        else:
            app.status = "recruiter_contacted"
            app.last_activity_at = datetime.utcnow()

        # Transactional email outbox
        idemp_key = f"demo_msg_{alex_user.id}_{apex_recruiter.id}"
        outbox_entry = db.query(EmailOutbox).filter(EmailOutbox.idempotency_key == idemp_key).first()
        if not outbox_entry:
            outbox_entry = EmailOutbox(
                idempotency_key=idemp_key,
                recipient_email=alex_user.email,
                recipient_name=alex_profile.name,
                subject=f"Apex Foundry reached out regarding {apex_job.title}",
                template="recruiter_outreach",
                payload=json.dumps({"conversation_id": conv.id, "body": msg_body}),
                status="sent",
                attempts=1,
                sent_at=datetime.utcnow()
            )
            db.add(outbox_entry)

        db.commit()

    print("Demo dataset seeded successfully with 3 candidates and 2 recruiters.")
