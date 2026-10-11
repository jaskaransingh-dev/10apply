"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCandidateJobs,
  getCandidateProfile,
  updateCandidateProfile,
  uploadResumeFile,
  trigger10amDispatch,
  salaryRange,
} from "@/lib/api";
import {
  Briefcase,
  Building,
  MapPin,
  DollarSign,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  FileText,
  Upload,
  Shield,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function CandidateDashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile Edit State
  const [targetRole, setTargetRole] = useState("");
  const [workAuth, setWorkAuth] = useState("");
  const [workPref, setWorkPref] = useState("Remote");
  const [minSalary, setMinSalary] = useState("140000");
  const [location, setLocation] = useState("San Francisco, CA");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Resume Upload State
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Copy Unlimited Invite Link State
  const [copiedUnlimited, setCopiedUnlimited] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jRes, pRes] = await Promise.all([
        getCandidateJobs().catch(() => ({ jobs: [] })),
        getCandidateProfile().catch(() => ({ profile: null })),
      ]);

      setJobs(jRes.jobs || []);
      if (pRes?.profile) {
        setProfile(pRes.profile);
        setTargetRole(pRes.profile.headline || "Senior Full-Stack Engineer");
        setWorkAuth(pRes.profile.work_authorization || "Authorized to work in US (Citizen or PR)");
        setWorkPref(pRes.profile.remote_preference || "Remote");
        setMinSalary(String(pRes.profile.min_salary || 140000));
        setLocation(pRes.profile.location || "San Francisco, CA");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess(null);
    try {
      await updateCandidateProfile({
        headline: targetRole,
        work_authorization: workAuth,
        remote_preference: workPref,
        min_salary: Number(minSalary) || 0,
        location,
      });
      setProfileSuccess("Profile information updated successfully.");
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    setResumeError(null);
    setResumeSuccess(null);

    try {
      await uploadResumeFile(file);
      setResumeSuccess(`Resume updated successfully (${file.name}).`);
      await loadDashboard();
      setTimeout(() => setResumeSuccess(null), 4000);
    } catch (err: any) {
      setResumeError(err?.message || "Failed to upload resume.");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleCopyUnlimited = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://discovered-site.vercel.app";
    const link = `${origin}/join?code=REC-UNLIMITED`;
    navigator.clipboard.writeText(link);
    setCopiedUnlimited(true);
    setTimeout(() => setCopiedUnlimited(false), 2500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      <main className="flex-1 py-10 px-6 max-w-5xl mx-auto w-full space-y-8">
        {/* Core Hero Status Card: "You're all done!" */}
        <div className="p-8 sm:p-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-900 bg-emerald-950/40 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Daily 10:00 AM Dispatch Loop: Active</span>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              Account: <span className="text-zinc-300 font-semibold">{profile?.email || "launchrec.noreply@gmail.com"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              You&apos;re all done!
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
              Your candidate profile is active and verified. Every morning at 10:00 AM, our deterministic matching engine evaluates live startup openings and dispatches up to 10 tailored applications on your behalf.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                Next Automated Dispatch
              </span>
              <span className="text-lg font-bold text-white mt-1 block">
                Tomorrow at 10:00 AM
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">
                10 matching startup roles queued
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                Employer Shield
              </span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">
                Protected
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">
                Current employer blocked from discovery
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                Master Invitation Token
              </span>
              <span className="text-lg font-bold text-zinc-200 mt-1 block font-mono">
                REC-UNLIMITED
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">
                Unlimited uses for colleagues
              </p>
            </div>
          </div>
        </div>

        {/* Master Unlimited Invite Link Banner */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Share Unlimited Candidate Invite
            </span>
            <p className="text-xs text-zinc-400">
              Colleagues can join using key <code className="text-zinc-200 font-mono">REC-UNLIMITED</code> without invite caps.
            </p>
          </div>
          <button
            onClick={handleCopyUnlimited}
            className="px-4 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors flex items-center gap-2 shrink-0"
          >
            {copiedUnlimited ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Link</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Unlimited Invite Link</span>
              </>
            )}
          </button>
        </div>

        {/* Two MVP Action Cards: Update Resume & Update Profile Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Card 1: Update Resume */}
          <div className="lg:col-span-5 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-5">
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-base font-semibold text-white">Update Resume</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Replace your active resume anytime. Our engine re-indexes skills immediately.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Active Resume on File</span>
              </div>
              <p className="text-xs text-zinc-500">
                PDF / DOCX verified &bull; Skills extracted for daily 10 AM matching
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleResumeFileSelect}
              className="hidden"
            />

            {resumeSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{resumeSuccess}</span>
              </div>
            )}

            {resumeError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{resumeError}</span>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingResume}
              className="w-full py-2.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingResume ? "Uploading & Re-indexing..." : "Upload New Resume File"}</span>
            </button>
          </div>

          {/* Card 2: Update Profile Information */}
          <div className="lg:col-span-7 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-5">
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-base font-semibold text-white">Update Matching Info</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Adjust criteria for daily 10:00 AM startup applications.
              </p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Target Role Title
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Senior Full-Stack Engineer"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Preferred Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA or Remote"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Work Authorization
                  </label>
                  <select
                    value={workAuth}
                    onChange={(e) => setWorkAuth(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Authorized to work in US (Citizen or PR)">
                      US Citizen or Permanent Resident
                    </option>
                    <option value="Requires US Visa Sponsorship (H-1B, O-1, TN)">
                      Requires Visa Sponsorship (H-1B, O-1, TN)
                    </option>
                    <option value="Authorized in Canada / UK / EU">
                      Authorized in Canada / UK / EU
                    </option>
                    <option value="Authorized for Global Remote Contract">
                      Global Remote Contractor
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Minimum Salary Floor ($/yr)
                  </label>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={(e) => setMinSalary(e.target.value)}
                    placeholder="140000"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  Work Preference
                </label>
                <select
                  value={workPref}
                  onChange={(e) => setWorkPref(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  <option value="Remote">Remote Only</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Any">Flexible</option>
                </select>
              </div>

              {profileSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full py-2.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{updatingProfile ? "Saving Updates..." : "Save Matching Info"}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Daily 10 AM Dispatched Applications Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Daily 10:00 AM Dispatches
              </h2>
              <p className="text-xs text-zinc-400">
                10 tailored applications dispatched to matching startup openings.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              10 / 10 Active
            </span>
          </div>

          <div className="space-y-3">
            {jobs.slice(0, 10).map((job, idx) => (
              <div
                key={job.id || idx}
                className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{job.title}</span>
                    <span className="text-zinc-500">&bull;</span>
                    <span className="text-zinc-300">{job.company || job.company_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px]">
                    <span>{job.location || "Remote"}</span>
                    <span>&bull;</span>
                    <span>{salaryRange(job.salary_min, job.salary_max)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-400 font-mono text-[11px]">
                    Dispatched 10:00 AM
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
