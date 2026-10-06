"""Vector-embed matching: dense-vector retrieval + structured bonuses.

Pipeline (per ranking call):
1. Analyze text into tokens (lowercase, stopword removal).
2. Build field-weighted term counters (title/skills count more than body).
3. Compute IDF over the corpus being ranked.
4. Embed every doc as an IDF-weighted mean of token vectors (`embed.py`),
   rank by cosine similarity, map to 0..1.
5. Blend 50% vector relevance with exact-skill / experience / location /
   seniority / compensation / role-preference signals.

Weights: 50% vector similarity / 20% exact skills / 10% experience /
5% location / 5% seniority / 5% compensation / 5% role pref. Score -> 0-100.
"""
import json
import math
import re
from collections import Counter

from .embed import embed_counter, cosine_sim

LEVEL_RANK = {"New Grad": 0, "1–2 years": 1, "1-2 years": 1, "2–5 years": 2, "2-5 years": 2, "5+ years": 3}
EXP_RE = re.compile(r"(\d+)(?:\s*[-–+]\s*(\d+))?")

STOPWORDS = frozenset(
    """
    a an and are as at be by for from has he in is it its of on that the to was
    were will with we you your our they them this these those then than than
    or not no if else when where which who whom what how why can could should
    would may might must shall do does did done have had having been being are
    into over under out up down off about into through during before after
    between both each few more most other some such only own same so too very
    s t just don now ll re ve m looking seek seeking join team help build work
    """.split()
)

TOKEN_RE = re.compile(r"[a-z0-9+#.]+")

# Cosine -> 0..1 mapping, calibrated: related docs ~= 0.85+, unrelated ~= 0.0.
SIM_LO = 0.05
SIM_HI = 0.80

# Field weights: how much a term occurrence counts in the embedding.
W_TITLE = 4.0
W_REQ_SKILL = 4.0
W_PREF_SKILL = 2.0
W_CAND_SKILL = 4.0
W_ROLE = 3.0
W_EXP = 2.0
W_BODY = 1.0


def exp_midpoint(exp: str) -> float:
    m = EXP_RE.search(exp or "")
    if not m:
        return 1.0
    a = float(m.group(1))
    b = float(m.group(2)) if m.group(2) else a + (2 if "+" in (exp or "") else 0)
    return (a + b) / 2


def analyze(text: str) -> list:
    """Lowercase, split on non-alnum, drop stopwords/short tokens."""
    toks = TOKEN_RE.findall((text or "").lower())
    return [t.strip("+#.").strip() for t in toks
            if len(t) >= 2 and t not in STOPWORDS and t.strip("+#.")]


def tokens(s: str) -> Counter:
    """Backwards-compat alias: analyzed term frequencies."""
    return Counter(analyze(s))


def _add(counter: Counter, text: str, weight: float) -> None:
    if weight == 1.0:
        counter.update(analyze(text))
        return
    for t in analyze(text):
        counter[t] += weight


def _skills_list(obj, attr: str) -> list:
    try:
        v = json.loads(getattr(obj, attr) or "[]")
        return v if isinstance(v, list) else []
    except Exception:
        return []


def job_fields(job) -> Counter:
    """Field-weighted term counter for a job posting."""
    tf: Counter = Counter()
    _add(tf, job.title or "", W_TITLE)
    for s in _skills_list(job, "required_skills"):
        _add(tf, s, W_REQ_SKILL)
    for s in _skills_list(job, "preferred_skills"):
        _add(tf, s, W_PREF_SKILL)
    _add(tf, job.description or "", W_BODY)
    return tf


def candidate_fields(profile_data: dict, resume_text: str) -> Counter:
    """Field-weighted term counter for a candidate."""
    p = profile_data or {}
    tf: Counter = Counter()
    for s in p.get("skills", []) or []:
        _add(tf, s, W_CAND_SKILL)
    for r in (p.get("job_preferences", {}) or {}).get("roles", []) or []:
        _add(tf, r, W_ROLE)
    for e in p.get("experience", []) or []:
        if isinstance(e, dict):
            _add(tf, f"{e.get('title', '')} {e.get('company', '')}", W_EXP)
    _add(tf, resume_text or "", W_BODY)
    return tf


def build_idf(doc_tfs: list) -> dict:
    """IDF over a corpus: log((N - df + 0.5) / (df + 0.5) + 1)."""
    n = len(doc_tfs)
    if n == 0:
        return {}
    df: Counter = Counter()
    for tf in doc_tfs:
        for t in tf:
            df[t] += 1
    return {t: math.log((n - f + 0.5) / (f + 0.5) + 1.0) for t, f in df.items()}


def sim_to_score(cos: float) -> float:
    """Map cosine similarity to 0..1 relevance."""
    if cos <= SIM_LO:
        return 0.0
    if cos >= SIM_HI:
        return 1.0
    return (cos - SIM_LO) / (SIM_HI - SIM_LO)


def hard_filter_ok(candidate_prefs: dict, profile_data: dict, job) -> bool:
    """Lenient hard filters for MVP: only block on salary floor mismatch that's extreme."""
    try:
        cmin = int(candidate_prefs.get("salary_min", 0) or 0)
    except Exception:
        cmin = 0
    if cmin and job.salary_max and job.salary_max < cmin * 0.8:
        return False
    return True


def _structured(prefs: dict, cskills_low: set, job, req: list):
    req_low = [s.lower() for s in req]
    matched = [s for s in req if s.lower() in cskills_low]
    skill_score = (len(matched) / len(req_low)) if req_low else 0.6

    c_mid = exp_midpoint(prefs.get("experience_level") if isinstance(prefs.get("experience_level"), str) else "1–2 years")
    j_mid = exp_midpoint(job.experience or "")
    exp_score = max(0.0, 1.0 - abs(c_mid - j_mid) / 5.0)

    clocs = [l.lower() for l in (prefs.get("locations", []) or [])]
    if clocs:
        jl = (job.location or "").lower()
        loc_score = 1.0 if any(c in jl or jl in c for c in clocs) else (
            0.9 if (prefs.get("remote") and "remote" in (job.work_arrangement or "").lower()) else 0.4)
    elif prefs.get("remote") and "remote" in (job.work_arrangement or "").lower():
        loc_score = 1.0
    else:
        loc_score = 1.0 if not clocs else 0.6

    seniority_score = exp_score

    comp_score = 1.0
    try:
        cmin = int(prefs.get("salary_min", 0) or 0)
        if cmin and job.salary_max:
            comp_score = 1.0 if job.salary_max >= cmin else max(0.0, job.salary_max / max(cmin, 1))
    except Exception:
        pass

    roles = [r.lower() for r in (prefs.get("roles", []) or [])]
    jt = (job.title or "").lower()
    pref_score = 1.0 if not roles else (
        1.0 if any((r in jt) or (jt in r) or bool(set(r.split()) & set(jt.split())) for r in roles) else 0.5)

    return skill_score, exp_score, loc_score, seniority_score, comp_score, pref_score, matched, roles


def score_pair(profile_data: dict, prefs: dict, resume_text: str, job,
               idf: dict | None = None, cand_vec: list | None = None,
               job_vec: list | None = None) -> tuple:
    """Score one candidate/job pair: vector similarity + structured signals.

    Pass corpus `idf` (and optionally precomputed vectors) from the ranking
    call. Without them, falls back to neutral IDF so single-pair use works.
    """
    pdata = profile_data or {}
    cskills = set(s.lower() for s in (pdata.get("skills", []) or []))
    try:
        req = json.loads(job.required_skills or "[]")
    except Exception:
        req = []

    idf = idf or {}
    if cand_vec is None:
        cand_vec = embed_counter(candidate_fields(pdata, resume_text or ""), idf or None)
    if job_vec is None:
        job_vec = embed_counter(job_fields(job), idf or None)
    text_score = sim_to_score(cosine_sim(cand_vec, job_vec))

    skill_score, exp_score, loc_score, seniority_score, comp_score, pref_score, matched, roles = _structured(
        prefs or {}, cskills, job, req)

    total = (
        0.50 * text_score + 0.20 * skill_score + 0.10 * exp_score
        + 0.05 * loc_score + 0.05 * seniority_score + 0.05 * comp_score + 0.05 * pref_score
    )
    pct = round(total * 100, 1)
    if matched:
        why = f"Strong overlap on {', '.join(matched[:3])}" + (" and relevant experience." if exp_score > 0.5 else ".")
    elif text_score > 0.6:
        why = "Your profile is a strong semantic match for this role."
    elif text_score > 0.3:
        why = "Your background is closely related to this role."
    else:
        why = f"Matches your interest in {roles[0] if roles else 'this role'} with compatible location and level."
    return pct, why, matched


def rank_jobs(pdata: dict, prefs: dict, resume_text: str, jobs: list) -> list:
    """Rank jobs for one candidate with vector search. Returns [(pct, job, why, matched)]."""
    cand_tf = candidate_fields(pdata, resume_text or "")
    job_tfs = [(j, job_fields(j)) for j in jobs]
    idf = build_idf([tf for _, tf in job_tfs] + ([cand_tf] if cand_tf else []))
    cand_vec = embed_counter(cand_tf, idf)
    out = []
    for j, jtf in job_tfs:
        pct, why, matched = score_pair(pdata, prefs, resume_text or "", j,
                                       idf=idf, cand_vec=cand_vec,
                                       job_vec=embed_counter(jtf, idf))
        out.append((pct, j, why, matched))
    out.sort(key=lambda x: x[0], reverse=True)
    return out


def rank_candidates(job, profiles: list) -> list:
    """Rank candidates for one job (JD-as-query vector). Returns [(pct, profile, pdata, why, matched)]."""
    job_tf = job_fields(job)
    rows = []
    for p, pdata, resume in profiles:
        rows.append((p, pdata, resume, candidate_fields(pdata, resume or "")))
    idf = build_idf([tf for _, _, _, tf in rows] + ([job_tf] if job_tf else []))
    job_vec = embed_counter(job_tf, idf)
    out = []
    for p, pdata, resume, ctf in rows:
        try:
            prefs = {"roles": json.loads(p.roles or "[]"), "locations": json.loads(p.locations or "[]"),
                     "remote": bool(p.remote), "salary_min": p.salary_min or 0,
                     "experience_level": p.experience_level or "New Grad"}
            pd = json.loads(p.profile_data or "{}")
        except Exception:
            prefs = {"roles": [], "locations": [], "remote": True,
                     "salary_min": 0, "experience_level": "1–2 years"}
            pd = pdata
        pct, why, matched = score_pair(pd, prefs, resume or "", job,
                                       idf=idf, job_vec=job_vec,
                                       cand_vec=embed_counter(ctf, idf))
        out.append((pct, p, pd, why, matched))
    out.sort(key=lambda x: x[0], reverse=True)
    return out
