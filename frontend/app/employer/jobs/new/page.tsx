"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRecruiterJob } from "@/lib/api";
import { ArrowLeft, Briefcase, Plus, Check } from "lucide-react";

export default function CreateJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requiredSkillsStr, setRequiredSkillsStr] = useState("");
  const [preferredSkillsStr, setPreferredSkillsStr] = useState("");
  const [seniority, setSeniority] = useState("Mid level");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [remotePolicy, setRemotePolicy] = useState("Remote");
  const [location, setLocation] = useState("Remote");
  const [salaryMin, setSalaryMin] = useState(140000);
  const [salaryMax, setSalaryMax] = useState(190000);
  const [minExp, setMinExp] = useState(2.0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Job title and description are required.");
      return;
    }
    const reqSkills = requiredSkillsStr.split(",").map(s => s.trim()).filter(Boolean);
    if (reqSkills.length === 0) {
      setError("Please specify at least one required skill.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await createRecruiterJob({
        title: title.trim(),
        company_name: companyName.trim() || undefined,
        description: description.trim(),
        responsibilities: responsibilities.trim() || undefined,
        required_skills: reqSkills,
        preferred_skills: preferredSkillsStr.split(",").map(s => s.trim()).filter(Boolean),
        seniority,
        employment_type: employmentType,
        remote_policy: remotePolicy,
        location: location.trim() || "Remote",
        salary_min: Number(salaryMin) || 0,
        salary_max: Number(salaryMax) || 0,
        currency: "USD",
        min_experience_years: Number(minExp) || 2.0
      });
      router.push(`/employer?job_id=${res.job_id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create job posting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/employer/jobs" className="hover:text-neutral-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Jobs</span>
        </Link>
      </div>

      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
          Create Job Opening
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
          Structured job requirements immediately trigger deterministic candidate matching upon publication.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Core Info */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-sm text-neutral-900">Role Overview</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Job Title *</label>
              <input
                type="text"
                placeholder="e.g. Founding Software Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Apex Foundry"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-neutral-700">Description & Responsibilities *</label>
            <textarea
              rows={4}
              placeholder="Outline role responsibilities, team mission, and day-to-day work..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full p-3 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900 leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-neutral-700">Key Deliverables / Specific Responsibilities (Optional)</label>
            <textarea
              rows={3}
              placeholder="• Architect distributed APIs in Python and FastAPI&#10;• Design PostgreSQL data models"
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className="w-full p-3 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900 leading-relaxed"
            />
          </div>
        </div>

        {/* Requirements & Skills */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-sm text-neutral-900">Skills & Seniority</h2>

          <div className="space-y-1">
            <label className="font-medium text-neutral-700">Required Skills * (comma-separated)</label>
            <input
              type="text"
              placeholder="Python, FastAPI, PostgreSQL, Docker"
              value={requiredSkillsStr}
              onChange={(e) => setRequiredSkillsStr(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
            />
            <p className="text-[11px] text-neutral-400">
              Accounts for 35% of candidate match score. Terms are mapped to canonical standards (e.g. Postgres → PostgreSQL).
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-neutral-700">Preferred Skills (comma-separated)</label>
            <input
              type="text"
              placeholder="Redis, Kubernetes, AWS"
              value={preferredSkillsStr}
              onChange={(e) => setPreferredSkillsStr(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Seniority</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900"
              >
                <option value="Entry level">Entry level</option>
                <option value="Mid level">Mid level</option>
                <option value="Senior">Senior</option>
                <option value="Lead / Staff">Lead / Staff</option>
                <option value="Founding / Head of">Founding / Head of</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Min Experience</label>
              <select
                value={minExp}
                onChange={(e) => setMinExp(Number(e.target.value))}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900"
              >
                <option value={1.0}>1+ years</option>
                <option value={2.0}>2+ years</option>
                <option value={3.0}>3+ years</option>
                <option value={5.0}>5+ years</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900"
              >
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location & Compensation */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-sm text-neutral-900">Work Policy & Compensation</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Remote Policy</label>
              <select
                value={remotePolicy}
                onChange={(e) => setRemotePolicy(e.target.value)}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Location</label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Salary Min (USD)</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-neutral-700">Salary Max (USD)</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/employer/jobs"
            className="px-4 py-2 border border-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-md font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? "Publishing & matching..." : "Publish Job & Run Matching"}
          </button>
        </div>
      </form>
    </div>
  );
}
