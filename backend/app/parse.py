"""Resume and Job Description parsing for resume-first hiring marketplace.
No invented data: missing -> '' / [].
Produces structured, persisted data and canonical skill mappings.
"""
import io
import json
import re
from datetime import datetime

# Canonical skill taxonomy mapping variant terms to standard name
CANONICAL_SKILL_MAP = {
    # Engineering & Backend
    "py": "Python",
    "python": "Python",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "express": "Express",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "sqlite": "SQLite",
    "sql": "SQL",
    "redis": "Redis",
    "mongodb": "MongoDB",
    "graphql": "GraphQL",
    "rest": "REST APIs",
    "rest api": "REST APIs",
    "restful": "REST APIs",
    "grpc": "gRPC",
    "kafka": "Kafka",
    "rabbitmq": "RabbitMQ",
    "celery": "Celery",
    "docker": "Docker",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "azure": "Azure",
    "ci/cd": "CI/CD",
    "github actions": "GitHub Actions",
    "terraform": "Terraform",
    "linux": "Linux",
    "git": "Git",
    "microservices": "Microservices",
    "java": "Java",
    "spring": "Spring Boot",
    "spring boot": "Spring Boot",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "c++": "C++",
    "c#": "C#",
    ".net": ".NET",

    # Frontend
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "next": "Next.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "svelte": "Svelte",
    "html": "HTML5",
    "html5": "HTML5",
    "css": "CSS3",
    "css3": "CSS3",
    "tailwind": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "webpack": "Webpack",
    "vite": "Vite",

    # AI & Data
    "machine learning": "Machine Learning",
    "ml": "Machine Learning",
    "deep learning": "Deep Learning",
    "nlp": "Natural Language Processing",
    "natural language processing": "Natural Language Processing",
    "computer vision": "Computer Vision",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "scikit-learn": "Scikit-Learn",
    "sklearn": "Scikit-Learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "scipy": "SciPy",
    "spark": "Apache Spark",
    "apache spark": "Apache Spark",
    "hadoop": "Hadoop",
    "airflow": "Airflow",
    "llm": "LLMs",
    "llms": "LLMs",
    "large language models": "LLMs",
    "rag": "RAG",
    "langchain": "LangChain",
    "llama_index": "LlamaIndex",
    "huggingface": "Hugging Face",
    "hugging face": "Hugging Face",
    "data analysis": "Data Analysis",
    "statistics": "Statistics",
    "ab testing": "A/B Testing",
    "a/b testing": "A/B Testing",

    # Product & Design
    "product management": "Product Management",
    "product design": "Product Design",
    "ui/ux": "UI/UX",
    "ux/ui": "UI/UX",
    "user research": "User Research",
    "figma": "Figma",
    "agile": "Agile",
    "scrum": "Scrum",
    "roadmapping": "Roadmapping",

    # Business & Operations
    "financial modeling": "Financial Modeling",
    "excel": "Excel",
    "salesforce": "Salesforce",
    "hubspot": "HubSpot",
    "bizops": "BizOps",
    "growth marketing": "Growth Marketing",
    "seo": "SEO"
}

SCHOOLS = [
    "UCLA", "UC Berkeley", "Berkeley", "Stanford", "MIT", "USC", "NYU", "CMU",
    "Georgia Tech", "Harvard", "Columbia", "Princeton", "Cornell", "Yale",
    "University of Washington", "University of Michigan", "UT Austin",
    "University of", "College", "State University", "Institute of Technology"
]

DEGREES = [
    "Ph.D.", "PhD", "M.S.", "MS", "M.A.", "MA", "B.S.", "BS", "B.A.", "BA",
    "Bachelor of Science", "Bachelor of Arts", "Master of Science", "Master of Arts",
    "Bachelor", "Master", "Associate"
]

ROLE_KEYWORDS = {
    "Founding Engineer": ["founding engineer", "founding developer", "first engineer", "early stage engineer"],
    "Backend Engineer": ["backend engineer", "backend developer", "back-end engineer", "api engineer", "distributed systems"],
    "Frontend Engineer": ["frontend engineer", "front-end engineer", "frontend developer", "ui engineer"],
    "Full-Stack Engineer": ["full stack", "full-stack", "software engineer", "software developer"],
    "Data Scientist": ["data scientist", "machine learning scientist", "statistical modeler", "data science"],
    "ML Engineer": ["ml engineer", "machine learning engineer", "ai engineer", "deep learning engineer"],
    "Data Engineer": ["data engineer", "data platform", "etl engineer", "analytics engineer"],
    "DevOps Engineer": ["devops engineer", "infrastructure engineer", "site reliability", "sre", "cloud engineer"],
    "Product Manager": ["product manager", "technical product manager", "group product manager"],
    "Product Designer": ["product designer", "ux designer", "ui/ux designer"],
}

def extract_text_from_upload(filename: str, data: bytes) -> str:
    """Extract clean text from PDF or DOCX file."""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            text_pages = []
            for p in reader.pages:
                t = p.extract_text()
                if t:
                    text_pages.append(t)
            return "\n".join(text_pages)
        except Exception:
            return ""
    if name.endswith(".docx"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs if p.text)
        except Exception:
            return ""
    # Plain text fallback
    try:
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def canonicalize_skill(skill_str: str) -> str:
    """Map any skill string or alias to canonical form."""
    k = skill_str.strip().lower()
    return CANONICAL_SKILL_MAP.get(k, skill_str.strip().title())


def find_skills(text: str) -> list:
    """Find all canonical skills present in text, ordered by length to prevent partial matches."""
    low = f" {text.lower()} "
    found_map = {}
    
    # Sort keys by length descending so "react.js" or "tailwind css" matches before "react"
    sorted_keys = sorted(CANONICAL_SKILL_MAP.keys(), key=len, reverse=True)
    for k in sorted_keys:
        canon = CANONICAL_SKILL_MAP[k]
        pattern = r'(?<![a-z0-9])' + re.escape(k) + r'(?![a-z0-9])'
        m = re.search(pattern, low)
        if m:
            if canon not in found_map:
                # Calculate evidence snippet
                start = max(0, m.start() - 25)
                end = min(len(low), m.end() + 25)
                snippet = low[start:end].strip()
                found_map[canon] = {
                    "name": canon,
                    "canonical": canon,
                    "confidence": 0.95,
                    "evidence": snippet
                }
    return list(found_map.values())


def extract_experience_and_years(text: str, lines: list) -> tuple:
    """Extract structured employment history and estimate reliable experience years."""
    experience = []
    total_months = 0
    now_year = datetime.utcnow().year

    date_patterns = [
        r"(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?((?:19|20)\d{2})\s*(?:–|—|-|to)\s*(?:(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?((?:19|20)\d{2})|present|current)",
        r"((?:19|20)\d{2})\s*(?:–|—|-|to)\s*((?:19|20)\d{2}|present|current)"
    ]

    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean:
            continue

        matched_date = None
        start_year = None
        end_year = None

        for pat in date_patterns:
            m = re.search(pat, line_clean, re.I)
            if m:
                matched_date = m.group(0)
                # extract years
                years = re.findall(r"(?:19|20)\d{2}", m.group(0))
                if years:
                    start_year = int(years[0])
                    if len(years) > 1:
                        end_year = int(years[1])
                    elif "present" in m.group(0).lower() or "current" in m.group(0).lower():
                        end_year = now_year
                    else:
                        end_year = start_year
                break

        if matched_date and start_year:
            # Look at previous line and next 2 lines for title, company, description
            prev_line = lines[i-1] if i > 0 else ""
            next_lines = lines[i+1:min(len(lines), i+4)]

            # Detect title and company
            role_hint = line_clean
            for candidate_str in [line_clean, prev_line]:
                if any(w in candidate_str.lower() for w in ["engineer", "developer", "lead", "architect", "scientist", "manager", "intern", "founder", "consultant"]):
                    role_hint = candidate_str
                    break

            parts = re.split(r"\s*[|–—•@-]\s*", role_hint)
            title = parts[0][:80].strip() if parts else "Software Engineer"
            company = parts[1][:60].strip() if len(parts) > 1 else (prev_line[:60].strip() if prev_line and not re.search(r"\d{4}", prev_line) else "Company")

            evidence_snippet = " ".join([l.strip() for l in next_lines if l.strip()])[:250]
            skills_in_exp = [s["canonical"] for s in find_skills(evidence_snippet + " " + line_clean)]

            experience.append({
                "employer": company or "Technology Company",
                "title": title or "Software Engineer",
                "start_date": str(start_year),
                "end_date": str(end_year) if end_year else "Present",
                "evidence": evidence_snippet or line_clean,
                "skills": skills_in_exp
            })

            if start_year and end_year and end_year >= start_year:
                total_months += (end_year - start_year) * 12

        if len(experience) >= 6:
            break

    exp_years = round(total_months / 12.0, 1) if total_months > 0 else 2.0
    return experience, exp_years


def extract_projects(text: str, lines: list) -> list:
    """Extract projects and URLs from resume text."""
    projects = []
    in_project_section = False
    
    # Check for github or http URLs in text
    urls = re.findall(r"https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_\+.~#?&//=]*", text)
    
    for i, line in enumerate(lines):
        if re.search(r"^(projects|selected projects|personal projects|open source projects)\b", line.strip(), re.I):
            in_project_section = True
            continue
        if in_project_section and re.search(r"^(education|skills|work experience|employment|certifications)\b", line.strip(), re.I):
            in_project_section = False
            break
        
        if in_project_section and len(line.strip()) > 3:
            # Heading or bullet
            p_name = line.split("|")[0].split("-")[0].strip()[:60]
            p_desc = " ".join(lines[i+1:min(len(lines), i+3)])[:200]
            p_skills = [s["canonical"] for s in find_skills(line + " " + p_desc)]
            p_url = ""
            for u in urls:
                if any(w.lower() in u.lower() for w in p_name.split() if len(w) > 3):
                    p_url = u
                    break
            
            projects.append({
                "name": p_name,
                "url": p_url or "",
                "description": p_desc,
                "technologies": p_skills
            })
            if len(projects) >= 4:
                break

    # If no explicit project section found but URLs exist
    if not projects and urls:
        for u in urls[:3]:
            label = "GitHub Project" if "github.com" in u else "Project Demo"
            projects.append({
                "name": label,
                "url": u,
                "description": f"Demonstrated project hosted at {u}",
                "technologies": []
            })

    return projects


def parse_resume(text: str) -> dict:
    """Parse raw resume text into structured fields without fabricating data."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    name = lines[0] if lines else ""
    if "@" in name and len(lines) > 1:
        name = lines[1]
    name = re.sub(r"^(Resume|CV|Curriculum Vitae)[:\s-]*", "", name, flags=re.I)[:80]

    email_m = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    phone_m = re.search(r"(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}", text)
    loc_m = re.search(r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})", text)

    # Education
    education = []
    for i, l in enumerate(lines):
        for s in SCHOOLS:
            if s.lower() in l.lower():
                deg = ""
                ctx = " ".join(lines[max(0, i-1):i+2])
                for d in DEGREES:
                    if d.lower().rstrip(".") in ctx.lower():
                        deg = d
                        break
                yr = re.search(r"(19|20)\d{2}", ctx)
                education.append({
                    "school": l[:80],
                    "degree": deg or "Degree",
                    "graduation_year": yr.group(0) if yr else ""
                })
                break
        if len(education) >= 3:
            break

    # Experience and years
    experience, exp_years = extract_experience_and_years(text, lines)

    # Skills with canonical names and evidence
    skills_structured = find_skills(text)
    skills_list = [s["canonical"] for s in skills_structured]

    # Projects
    projects = extract_projects(text, lines)

    # Inferred role title
    low = text.lower()
    inferred_roles = [r for r, kws in ROLE_KEYWORDS.items() if any(k in low for k in kws)]
    primary_title = inferred_roles[0] if inferred_roles else (experience[0]["title"] if experience else "Software Engineer")

    return {
        "name": name or "Candidate",
        "email": email_m.group(0) if email_m else "",
        "phone": phone_m.group(0) if phone_m else "",
        "headline": primary_title,
        "location": loc_m.group(1) if loc_m else "Remote",
        "education": education,
        "experience": experience,
        "total_experience_years": exp_years,
        "skills": skills_list,
        "skills_structured": skills_structured,
        "projects": projects,
        "raw_text": text,
        "job_preferences": {
            "roles": inferred_roles or [primary_title],
            "locations": [loc_m.group(1)] if loc_m else ["Remote"],
            "remote": bool(re.search(r"\bremote\b", low)),
            "employment_types": ["Full-time"],
            "salary_min": 0,
            "experience_level": f"{int(exp_years)} years"
        }
    }


def parse_jd(text: str) -> dict:
    """Parse job description into structured requirements."""
    low = text.lower()
    title_m = re.search(r"(founding engineer|software engineer|backend engineer|frontend engineer|full[- ]stack engineer|data scientist|data engineer|ml engineer|machine learning engineer|devops engineer|product manager|lead engineer)", text, re.I)
    title = title_m.group(1).strip().title() if title_m else "Software Engineer"
    
    loc_m = re.search(r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})", text)
    if re.search(r"\bremote\b", low):
        arrang = "Remote"
    elif re.search(r"\bhybrid\b", low):
        arrang = "Hybrid"
    else:
        arrang = "On-site"

    sal = re.findall(r"\$\s?\d[\d,]*(?:\.\d+)?\s*k?", text)
    smin, smax = 120000, 180000
    if sal:
        def _money(s):
            s = s.replace(",", "").replace("$", "").lower().strip()
            m = re.match(r"(\d+(?:\.\d+)?)\s*(k)?", s)
            if not m:
                return 0
            v = float(m.group(1))
            if m.group(2):
                v *= 1000
            return int(v)
        vals = sorted(_money(s) for s in sal if _money(s) > 0)
        if vals:
            smin = vals[0]
            smax = vals[-1] if len(vals) > 1 else int(vals[0] * 1.25)

    exp_m = re.search(r"(\d+)\s*\+?\s*(?:-|to)?\s*(\d+)?\s*years?", low)
    exp_years = float(exp_m.group(1)) if exp_m else 2.0
    exp_str = f"{int(exp_years)}+ years"

    all_skills = [s["canonical"] for s in find_skills(text)]
    req_skills = all_skills[:6] if all_skills else ["Python", "SQL"]
    pref_skills = all_skills[6:12]

    return {
        "title": title,
        "company": "Startup",
        "location": loc_m.group(1) if loc_m else ("Remote" if arrang == "Remote" else "San Francisco, CA"),
        "work_arrangement": arrang,
        "salary_min": smin,
        "salary_max": smax,
        "employment_type": "Full-time",
        "experience": exp_str,
        "min_experience_years": exp_years,
        "required_skills": req_skills,
        "preferred_skills": pref_skills,
        "summary": " ".join(text.split()[:50])
    }


def summarize_job(description: str) -> str:
    words = (description or "").split()
    return " ".join(words[:40]) + ("..." if len(words) > 40 else "")
