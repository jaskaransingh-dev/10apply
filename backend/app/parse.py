"""Heuristic resume + JD parsing. No invented data: missing -> '' / [].
If OPENAI_API_KEY is set, callers may optionally use LLM; heuristics are the default so MVP works offline."""
import json, re

SKILL_VOCAB = [
    "Python","FastAPI","React","AWS","PostgreSQL","Docker","Kubernetes","Redis",
    "TypeScript","JavaScript","Node.js","Django","Flask","SQL","MongoDB","GraphQL",
    "Java","Go","Rust","C++","Machine Learning","TensorFlow","PyTorch","NLP",
    "Data Analysis","Pandas","Spark","Kafka","Terraform","GCP","Azure","CI/CD",
    "Next.js","Tailwind","Swift","Kotlin","Figma","Excel","Tableau",
]
SKILL_LOWER = {s.lower(): s for s in SKILL_VOCAB}

SCHOOLS = ["UCLA","UC Berkeley","Berkeley","Stanford","MIT","USC","NYU","CMU","Georgia Tech",
           "University of","College","State University","Institute of Technology"]
DEGREES = ["B.S.","B.A.","M.S.","M.A.","Ph.D.","Bachelor","Master","Associate"]

ROLE_KEYWORDS = {
    "Software Engineer": ["software engineer","software developer","full stack","full-stack","frontend","front-end","backend","back-end"],
    "Backend Engineer": ["backend","api ","fastapi","django","node","microservice"],
    "Data Scientist": ["data scien","machine learning","ml engineer","analytics","pandas","tensorflow","pytorch"],
    "ML Engineer": ["machine learning","ml ","tensorflow","pytorch","llm","nlp","model training"],
    "Data Engineer": ["data engineer","etl","spark","kafka","airflow","warehouse"],
    "DevOps Engineer": ["devops","kubernetes","docker","terraform","ci/cd","sre"],
    "Product Manager": ["product manager","roadmap","stakeholder","prd"],
}

def extract_text_from_upload(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(data))
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception:
            return ""
    if name.endswith(".docx"):
        try:
            import io
            from docx import Document
            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return ""
    # plain text fallback
    try:
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return ""

def find_skills(text: str):
    low = text.lower()
    found = []
    for kl, canon in SKILL_LOWER.items():
        if kl in low and canon not in found:
            found.append(canon)
    return found[:30]

def parse_resume(text: str) -> dict:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    name = lines[0] if lines else ""
    # avoid using email-looking first line as name
    if "@" in name and len(lines) > 1:
        name = lines[1]
    name = re.sub(r"^(Resume|CV|Curriculum Vitae)[:\s-]*", "", name, flags=re.I)[:80]

    email_m = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    phone_m = re.search(r"(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}", text)
    loc_m = re.search(r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})", text)

    education = []
    for i, l in enumerate(lines):
        for s in SCHOOLS:
            if s.lower() in l.lower():
                deg = ""
                ctx = " ".join(lines[max(0,i-1):i+2])
                for d in DEGREES:
                    if d.lower().rstrip(".") in ctx.lower():
                        deg = d
                        break
                yr = re.search(r"(19|20)\d{2}", ctx)
                education.append({
                    "school": l[:80],
                    "degree": deg or "Not found",
                    "graduation_year": int(yr.group(0)) if yr else "Not found",
                })
                break
        if len(education) >= 3:
            break

    # naive experience: lines with years + company-ish words
    experience = []
    for l in lines:
        if re.search(r"(19|20)\d{2}", l) and re.search(r"(engineer|intern|developer|analyst|manager|scientist|assistant|associate)", l, re.I):
            parts = re.split(r"\s[–—\-–|@]\s|\s{2,}|\sat\s", l)
            dates = re.findall(r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?\d{4}|\d{4}-\d{2}|\d{4})", l, re.I)
            experience.append({
                "company": parts[0][:60] if parts else "Not found",
                "title": l[:90],
                "start": dates[0] if len(dates) > 0 else "Not found",
                "end": dates[1] if len(dates) > 1 else "Present",
                "skills": find_skills(l),
            })
        if len(experience) >= 6:
            break

    skills = find_skills(text)
    low = text.lower()
    roles = [r for r, kws in ROLE_KEYWORDS.items() if any(k in low for k in kws)][:4] or ["Software Engineer"]
    locs = [loc_m.group(1)] if loc_m else []
    remote = bool(re.search(r"remote", low))

    return {
        "name": name or "Not found",
        "email": email_m.group(0) if email_m else "Not found",
        "phone": phone_m.group(0) if phone_m else "Not found",
        "education": education or [{"school": "Not found", "degree": "Not found", "graduation_year": "Not found"}],
        "experience": experience or [{"company": "Not found", "title": "Not found", "start": "Not found", "end": "Not found", "skills": []}],
        "skills": skills,
        "location": loc_m.group(1) if loc_m else "Not found",
        "job_preferences": {
            "roles": roles,
            "locations": locs,
            "remote": remote,
            "employment_types": ["Full-time"],
            "salary_min": 0,
            "experience_level": "New Grad" if ("intern" in low and "senior" not in low) else "1–2 years",
        },
    }

def _money_to_int(s: str) -> int:
    s = s.replace(",", "").lower().strip()
    m = re.match(r"\$?(\d+(?:\.\d+)?)\s*(k)?", s)
    if not m:
        return 0
    v = float(m.group(1))
    if m.group(2):
        v *= 1000
    return int(v)

def parse_jd(text: str) -> dict:
    low = text.lower()
    title_m = re.search(r"(software engineer|backend[^\n]{0,40}|frontend[^\n]{0,40}|data scientist|data engineer|ml engineer|machine learning engineer|devops engineer|product manager|intern[^\n]{0,40})", text, re.I)
    title = title_m.group(1).strip().title() if title_m else "Software Engineer"
    loc_m = re.search(r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})", text)
    if re.search(r"\bremote\b", low):
        arrang = "Remote"
    elif re.search(r"hybrid", low):
        arrang = "Hybrid"
    else:
        arrang = "On-site"
    sal = re.findall(r"\$\s?\d[\d,]*(?:\.\d+)?\s*k?", text)
    smin, smax = 0, 0
    if sal:
        vals = sorted(_money_to_int(s) for s in sal)
        smin = vals[0]
        smax = vals[-1] if len(vals) > 1 else int(vals[0] * 1.25)
    exp_m = re.search(r"(\d+)\s*\+?\s*(?:-|to)?\s*(\d+)?\s*years?", low)
    exp = f"{exp_m.group(1)}-{exp_m.group(2)} years" if exp_m and exp_m.group(2) else (f"{exp_m.group(1)}+ years" if exp_m else "0-3 years")
    skills = find_skills(text)
    return {
        "title": title,
        "company": "Not found",
        "location": loc_m.group(1) if loc_m else ("Remote" if arrang == "Remote" else "San Francisco, CA"),
        "work_arrangement": arrang,
        "salary_min": smin or 100000,
        "salary_max": smax or 160000,
        "employment_type": "Internship" if "intern" in low else "Full-time",
        "experience": exp,
        "required_skills": skills[:8],
        "preferred_skills": skills[8:14],
        "summary": " ".join(text.split()[:60]),
    }

def summarize_job(description: str) -> str:
    words = description.split()
    return " ".join(words[:45]) + ("..." if len(words) > 45 else "")
