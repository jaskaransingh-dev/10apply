"""Deterministic, explainable 5-component matching engine for resume-first hiring marketplace.

Formula (Section 5.3):
    S(c, j) = 0.35 * K + 0.25 * E + 0.20 * R + 0.10 * P + 0.10 * D
    Score Percentage = round(100 * S(c, j), 1)

Components:
    K: Required skill coverage with canonical taxonomy mapping
    E: Relevant work experience (duration & domain alignment)
    R: Role and responsibility similarity
    P: Preferred skill coverage
    D: Relevant projects and demonstrated work (GitHub, demos, portfolio)
"""
import json
import math
import re
from collections import Counter
from typing import Dict, List, Any, Tuple, Optional

from .parse import CANONICAL_SKILL_MAP, canonicalize_skill


def _normalize_tokens(text: str) -> set:
    """Normalize text into lowercase alphanumeric tokens, stripping punctuation."""
    if not text:
        return set()
    cleaned = re.sub(r"[^\w\s+#.]", " ", text.lower())
    words = cleaned.split()
    stopwords = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
        "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were", "will",
        "with", "we", "you", "your", "our", "they", "them", "this", "these", "those",
        "or", "not", "no", "if", "when", "where", "which", "who", "what", "how", "why"
    }
    return {w for w in words if len(w) > 1 and w not in stopwords}


def check_skill_match(target_skill: str, candidate_skills: List[str], candidate_text: str) -> Tuple[float, str]:
    """Check if a target skill is demonstrated by candidate.
    Returns (match_value: 0.0, 0.5, or 1.0, evidence: str).
    """
    target_canon = canonicalize_skill(target_skill)
    target_lower = target_skill.lower()

    # 1. Exact canonical match in candidate's extracted skills
    for cs in candidate_skills:
        if canonicalize_skill(cs).lower() == target_canon.lower():
            return 1.0, f"Demonstrated {target_canon}"

    # 2. Check full text for canonical name or aliases
    low_text = candidate_text.lower()
    if target_lower in low_text or target_canon.lower() in low_text:
        return 1.0, f"Demonstrated {target_canon} in experience"

    # 3. Check alias mapping
    for alias, canon in CANONICAL_SKILL_MAP.items():
        if canon.lower() == target_canon.lower() and alias in low_text:
            return 1.0, f"Demonstrated {target_canon} ({alias})"

    # 4. Partial substring match
    for cs in candidate_skills:
        if target_lower in cs.lower() or cs.lower() in target_lower:
            return 0.5, f"Related skill: {cs}"

    return 0.0, ""


def hard_filter_ok(candidate_profile, job) -> Tuple[bool, str]:
    """Check hard constraints (work authorization, strict on-site location, compensation floor)."""
    # 1. Work authorization
    job_sponsor = (getattr(job, "sponsorship_policy", "") or (job.get("sponsorship_policy", "") if isinstance(job, dict) else "") or "").lower()
    cand_auth = (getattr(candidate_profile, "work_authorization", "") or (candidate_profile.get("work_authorization", "") if isinstance(candidate_profile, dict) else "") or "").lower()

    if "cannot sponsor" in job_sponsor or (isinstance(job, dict) and job.get("requires_sponsorship") is False):
        if "need sponsorship" in cand_auth or "requires visa" in cand_auth:
            return False, "Job cannot sponsor visa and candidate requires sponsorship"

    # 2. Location & remote
    job_arrang = (getattr(job, "work_arrangement", None) or getattr(job, "remote_policy", None) or (job.get("remote_policy") if isinstance(job, dict) else None) or "Remote").lower()
    cand_arrang = (getattr(candidate_profile, "work_arrangement", None) or getattr(candidate_profile, "remote_preference", None) or (candidate_profile.get("remote_preference") if isinstance(candidate_profile, dict) else None) or "Remote").lower()
    if job_arrang == "on-site" and cand_arrang == "remote":
        cand_loc = (getattr(candidate_profile, "location", "") or (candidate_profile.get("location", "") if isinstance(candidate_profile, dict) else "") or "").lower()
        job_loc = (getattr(job, "location", "") or (job.get("location", "") if isinstance(job, dict) else "") or "").lower()
        if job_loc and cand_loc and job_loc != cand_loc:
            return False, f"Job requires on-site presence in {job_loc}"

    # 3. Compensation floor
    cand_min = (getattr(candidate_profile, "min_salary", 0) or getattr(candidate_profile, "salary_min", 0) or (candidate_profile.get("min_salary", 0) if isinstance(candidate_profile, dict) else 0) or 0)
    job_max = (getattr(job, "salary_max", 0) or (job.get("salary_max", 0) if isinstance(job, dict) else 0) or 0)
    if cand_min > 0 and job_max > 0 and cand_min > job_max:
        return False, f"Candidate minimum salary exceeds job maximum budget"

    return True, "Eligible"


def compute_match_score(
    candidate_skills: List[str],
    candidate_text: str,
    experience_list: List[dict],
    total_exp_years: float,
    candidate_headline: str,
    candidate_roles: List[str],
    projects_list: List[dict],
    job_title: str,
    job_description: str,
    required_skills: List[str],
    preferred_skills: List[str],
    job_min_exp_years: float = 2.0
) -> Dict[str, Any]:
    """Compute the 5-component deterministic score S(c, j)."""
    # 1. K: Required skill coverage (35%)
    matched_required = []
    missing_required = []
    k_sum = 0.0
    req_weights_sum = 0.0

    if not required_skills:
        # Fallback if no explicit required skills: derive from JD
        required_skills = ["Python", "SQL"]

    for req in required_skills:
        weight = 1.0
        val, evidence = check_skill_match(req, candidate_skills, candidate_text)
        k_sum += weight * val
        req_weights_sum += weight
        canon_req = canonicalize_skill(req)
        if val >= 0.5:
            matched_required.append(canon_req)
        else:
            missing_required.append(canon_req)

    k_score = k_sum / max(req_weights_sum, 1.0)
    k_score = max(0.0, min(1.0, k_score))

    # 2. E: Relevant work experience (25%)
    # Duration factor
    duration_ratio = min(1.0, total_exp_years / max(job_min_exp_years, 1.0))
    # Domain & title relevance
    job_toks = _normalize_tokens(job_title + " " + job_description)
    exp_toks = set()
    recent_company = ""
    for exp in experience_list:
        if not recent_company and exp.get("employer"):
            recent_company = exp.get("employer")
        exp_toks.update(_normalize_tokens(exp.get("title", "") + " " + exp.get("evidence", "")))

    overlap_e = len(job_toks & exp_toks) / max(len(job_toks & exp_toks) + 5, 1)
    e_score = 0.5 * duration_ratio + 0.5 * min(1.0, overlap_e * 2.0)
    e_score = max(0.0, min(1.0, e_score))

    # 3. R: Role and responsibility similarity (20%)
    title_toks = _normalize_tokens(job_title)
    cand_role_toks = _normalize_tokens(candidate_headline + " " + " ".join(candidate_roles))
    title_overlap = len(title_toks & cand_role_toks) / max(len(title_toks), 1)
    r_score = min(1.0, 0.4 + 0.6 * title_overlap) if title_overlap > 0 else 0.35

    # 4. P: Preferred skill coverage (10%)
    matched_preferred = []
    if preferred_skills:
        p_sum = 0.0
        for pref in preferred_skills:
            val, _ = check_skill_match(pref, candidate_skills, candidate_text)
            p_sum += val
            if val >= 0.5:
                matched_preferred.append(canonicalize_skill(pref))
        p_score = p_sum / len(preferred_skills)
    else:
        # If no preferred skills specified, bonus for general skill breadth
        p_score = min(1.0, len(candidate_skills) / 8.0)
    p_score = max(0.0, min(1.0, p_score))

    # 5. D: Relevant projects and demonstrated work (10%)
    d_score = 0.1
    project_mentions = []
    if projects_list:
        d_score = 0.5  # Base credit for having projects/demos
        for proj in projects_list:
            proj_name = proj.get("name") or proj.get("title") or proj.get("label") or "Project"
            proj_text = f"{proj_name} {proj.get('description', '')} {' '.join(proj.get('technologies', []))}"
            p_toks = _normalize_tokens(proj_text)
            if p_toks & job_toks:
                d_score = min(1.0, d_score + 0.25)
                project_mentions.append(proj_name)
    d_score = max(0.0, min(1.0, d_score))

    # Total weighted score: S(c, j) = 0.35K + 0.25E + 0.20R + 0.10P + 0.10D
    total_score = 0.35 * k_score + 0.25 * e_score + 0.20 * r_score + 0.10 * p_score + 0.10 * d_score
    total_pct = round(total_score * 100.0, 1)

    # Strengths list
    strengths = []
    if matched_required:
        strengths.append(f"Demonstrated core skills: {', '.join(matched_required[:3])}")
    if matched_preferred:
        strengths.append(f"Preferred skills: {', '.join(matched_preferred[:2])}")
    if total_exp_years >= job_min_exp_years:
        strengths.append(f"{total_exp_years} years relevant experience")
    if project_mentions:
        strengths.append(f"Project evidence: {', '.join(project_mentions[:2])}")

    # Generate transparent evidence-based explanation
    exp_parts = []
    if total_pct >= 80:
        exp_parts.append(f"Strong match for {job_title}.")
    elif total_pct >= 60:
        exp_parts.append(f"Solid match for {job_title}.")
    else:
        exp_parts.append(f"Partial match for {job_title}.")

    if matched_required:
        skills_str = ", ".join(matched_required[:3])
        if recent_company:
            exp_parts.append(f"Resume demonstrates {skills_str} experience at {recent_company}.")
        else:
            exp_parts.append(f"Resume demonstrates verified {skills_str} experience.")

    if project_mentions:
        exp_parts.append(f"Includes demonstrated work on {project_mentions[0]}.")

    if missing_required:
        exp_parts.append(f"Does not provide direct evidence for {', '.join(missing_required[:2])}.")
    else:
        exp_parts.append("Meets all explicitly required technical skills.")

    explanation = " ".join(exp_parts)

    return {
        "score": round(total_score, 4),
        "score_pct": total_pct,
        "breakdown": {
            "K": round(k_score, 3),
            "E": round(e_score, 3),
            "R": round(r_score, 3),
            "P": round(p_score, 3),
            "D": round(d_score, 3)
        },
        "matched_skills": matched_required,
        "missing_skills": missing_required,
        "matched_preferred": matched_preferred,
        "strengths": strengths,
        "explanation": explanation
    }


def score_pair(profile_data: dict, prefs: dict, resume_text: str, job, **kwargs):
    """Backwards-compatible tuple return: (pct, why, matched)."""
    cskills = profile_data.get("skills", []) or []
    exp_list = profile_data.get("experience", []) or []
    tot_exp = profile_data.get("total_experience_years", 2.0)
    projs = profile_data.get("projects", []) or []
    headline = profile_data.get("headline", "")

    req_skills = []
    pref_skills = []
    try:
        req_skills = json.loads(getattr(job, "required_skills", "[]") or "[]")
    except Exception:
        req_skills = []
    try:
        pref_skills = json.loads(getattr(job, "preferred_skills", "[]") or "[]")
    except Exception:
        pref_skills = []

    res = compute_match_score(
        candidate_skills=cskills,
        candidate_text=resume_text or json.dumps(profile_data),
        experience_list=exp_list,
        total_exp_years=tot_exp,
        candidate_headline=headline,
        candidate_roles=prefs.get("roles", []),
        projects_list=projs,
        job_title=getattr(job, "title", "Software Engineer"),
        job_description=getattr(job, "description", ""),
        required_skills=req_skills,
        preferred_skills=pref_skills,
        job_min_exp_years=2.0
    )

    class CompatResult(tuple):
        def __new__(cls, pct, why, matched, missing=None, strengths=None, breakdown=None):
            return super().__new__(cls, (pct, why, matched))
        def __init__(self, pct, why, matched, missing=None, strengths=None, breakdown=None):
            self.pct = pct
            self.why = why
            self.matched = matched
            self.missing = missing or []
            self.strengths = strengths or []
            self.breakdown = breakdown or {}

    return CompatResult(
        pct=res["score_pct"],
        why=res["explanation"],
        matched=res["matched_skills"],
        missing=res["missing_skills"],
        strengths=res["strengths"],
        breakdown=res["breakdown"]
    )


def rank_jobs(pdata: dict, prefs: dict, resume_text: str, jobs: list) -> list:
    """Rank jobs for one candidate. Returns [(pct, job, why, matched)]."""
    out = []
    for j in jobs:
        res = score_pair(pdata, prefs, resume_text, j)
        out.append((res.pct, j, res.why, res.matched))
    out.sort(key=lambda x: x[0], reverse=True)
    return out


def rank_candidates(job, profiles: list) -> list:
    """Rank candidates for one job. Returns [(pct, profile, pdata, why, matched)]."""
    out = []
    for p, pdata, resume in profiles:
        try:
            prefs = {
                "roles": json.loads(p.roles or "[]") if isinstance(p.roles, str) else (p.roles or []),
                "locations": json.loads(p.locations or "[]") if isinstance(p.locations, str) else (p.locations or []),
                "remote": bool(p.remote),
                "salary_min": getattr(p, "salary_min", 0) or 0,
            }
        except Exception:
            prefs = {"roles": [], "locations": [], "remote": True, "salary_min": 0}
        
        pd = pdata if isinstance(pdata, dict) else {}
        if not pd and getattr(p, "profile_data", None):
            try:
                pd = json.loads(p.profile_data)
            except Exception:
                pd = {}

        res = score_pair(pd, prefs, resume or getattr(p, "resume_text", ""), job)
        out.append((res.pct, p, pd, res.why, res.matched))
    out.sort(key=lambda x: x[0], reverse=True)
    return out
