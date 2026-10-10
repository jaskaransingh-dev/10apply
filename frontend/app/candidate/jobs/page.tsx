"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCandidateJobs, trigger10amDispatch, salaryRange } from "@/lib/api";
import {
  Briefcase,
  Building,
  MapPin,
  DollarSign,
  MessageSquare,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  X,
  Share2,
  Copy,
  Check,
  Send,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";

export default function CandidateJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [inviteStats, setInviteStats] = useState<any>({ remaining: 5, invites: [] });
  const [dailyDispatch, setDailyDispatch] = useState<any>({
    hour: 10,
    status: "Active",
    next_dispatch: "Tomorrow at 10:00 AM",
    dispatched_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [running10am, setRunning10am] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDispatches();
  }, []);

  const loadDispatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCandidateJobs();
      setJobs(res.jobs || []);
      if (res.invite_stats) {
        setInviteStats(res.invite_stats);
      }
      if (res.daily_dispatch) {
        setDailyDispatch(res.daily_dispatch);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dispatches.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger10am = async () => {
    setRunning10am(true);
    try {
      await trigger10amDispatch();
      await loadDispatches();
    } catch (err: any) {
      alert(err?.message || "Could not trigger 10 AM dispatch.");
    } finally {
      setRunning10am(false);
    }
  };

  const primaryInviteCode =
    inviteStats?.invites?.[0]?.token || "cross_c94c58";
  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/?invite=${primaryInviteCode}`
      : `http://localhost:3000/?invite=${primaryInviteCode}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteSuccess(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/invitations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ recipient_email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create invite");
      setInviteSuccess(`Invitation code sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      loadDispatches();
    } catch (err: any) {
      alert(err.message || "Failed to send invite");
    } finally {
      setInviteSending(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "recruiter_contacted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-900 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Recruiter contacted you
          </span>
        );
      case "in_review":
      case "submitted":
      case "submitted_10am":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Submitted at 10:00 AM
          </span>
        );
      case "interviewing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
            Interviewing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
            <Clock className="w-3 h-3 text-neutral-400" />
            Dispatched at 10:00 AM
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Section: Private Invitations Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Private Candidate Network
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-neutral-100 text-neutral-900 rounded">
                {inviteStats?.remaining ?? 5} invites remaining
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Every approved candidate receives 5 invites. Share your link with qualified peers to grant priority access to daily 10 AM matching.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyInvite}
            className="btn btn-outline text-xs gap-1.5 shrink-0 self-start sm:self-center"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
        </div>

        {/* Quick invite email sender */}
        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Invite a friend by email (e.g. colleague@example.com)"
            className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-md bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 placeholder:text-neutral-400"
          />
          <button
            type="submit"
            disabled={inviteSending || (inviteStats?.remaining ?? 5) <= 0}
            className="btn btn-primary text-xs shrink-0 disabled:opacity-40"
          >
            <Send className="w-3 h-3 mr-1" />
            <span>{inviteSending ? "Sending..." : "Send Invite"}</span>
          </button>
        </form>
        {inviteSuccess && (
          <p className="text-[11px] text-emerald-700 font-medium">{inviteSuccess}</p>
        )}
      </div>

      {/* 10:00 AM Automated Engine Status Banner */}
      <div className="bg-neutral-900 text-white rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-semibold tracking-tight text-white">
                Daily 10:00 AM Automated Submissions
              </h2>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
              Candidates do not need to search or submit job applications manually. Every morning at 10:00 AM, the matching engine pairs your verified resume with active startup roles and submits your profile to the top 10 matching jobs.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTrigger10am}
              disabled={running10am}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${running10am ? "animate-spin" : ""}`} />
              <span>{running10am ? "Matching..." : "Simulate 10 AM Run Now"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800 text-xs">
          <div>
            <div className="text-neutral-400 text-[11px]">Today's Dispatches</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {jobs.length} / 10 jobs sent
            </div>
          </div>
          <div>
            <div className="text-neutral-400 text-[11px]">Next Dispatch</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {dailyDispatch?.next_dispatch || "Tomorrow at 10:00 AM"}
            </div>
          </div>
          <div>
            <div className="text-neutral-400 text-[11px]">Submission Mode</div>
            <div className="text-sm font-semibold text-emerald-400 mt-0.5">
              Automated (10/day)
            </div>
          </div>
        </div>
      </div>

      {/* Dispatched Applications Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
            Today's 10 AM Dispatched Applications
          </h2>
          <p className="text-xs text-neutral-500">
            Ranked deterministically by 5-component score: skills, experience, recency, projects, and domain fit.
          </p>
        </div>
        <Link
          href="/candidate/upload"
          className="text-xs font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shrink-0"
        >
          Update Resume
        </Link>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Dispatched Applications List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-400">
          Loading 10 AM dispatches...
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white border border-neutral-200 rounded-lg p-8">
          <Briefcase className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-800">
            No dispatches scheduled yet
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Upload your resume to activate 10:00 AM automated matching. Your profile will be submitted to 10 matching jobs every morning.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/candidate/upload" className="btn btn-primary text-xs">
              Upload Resume
            </Link>
            <button
              onClick={handleTrigger10am}
              className="btn btn-outline text-xs"
            >
              Run 10 AM Match Now
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="group bg-white border border-neutral-200 hover:border-neutral-400 rounded-lg p-4 sm:p-5 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-neutral-900 group-hover:text-neutral-950">
                      {job.title}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                      {job.match_score}% match
                    </span>
                    {statusBadge(job.application_status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-neutral-700">
                      <Building className="w-3.5 h-3.5 text-neutral-400" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      {job.location} ({job.remote_policy})
                    </span>
                    {job.salary_min > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                        {salaryRange(job.salary_min, job.salary_max, job.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {job.application_status === "recruiter_contacted" ? (
                    <Link
                      href="/candidate/inbox"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Reply in Inbox</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-neutral-400 font-mono">
                      {job.dispatched_at || "10:00 AM"}
                    </span>
                  )}
                </div>
              </div>

              {/* Match Explanation Proof */}
              {job.explanation && (
                <div className="mt-3.5 pt-3.5 border-t border-neutral-100 text-xs text-neutral-600 leading-relaxed bg-neutral-50/70 p-2.5 rounded">
                  <span className="font-medium text-neutral-800">Why matched: </span>
                  {job.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-neutral-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {selectedJob.title}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                    {selectedJob.match_score}% match
                  </span>
                  {statusBadge(selectedJob.application_status)}
                </div>
                <div className="text-xs text-neutral-500 mt-1 flex items-center gap-3">
                  <span className="font-medium text-neutral-800">{selectedJob.company}</span>
                  <span>•</span>
                  <span>{selectedJob.location} ({selectedJob.remote_policy})</span>
                  {selectedJob.salary_min > 0 && (
                    <>
                      <span>•</span>
                      <span>{salaryRange(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency)}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs text-neutral-700 leading-relaxed">
              {/* Automated Dispatch Notice */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md space-y-1">
                <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Submitted automatically at 10:00 AM</span>
                </div>
                <p className="text-[11px] text-neutral-600">
                  Your parsed resume evidence was delivered directly to {selectedJob.company}. When the recruiter reviews your background and initiates outreach, you will receive an email and a direct message in your inbox.
                </p>
              </div>

              {/* Match Explanation */}
              <div className="space-y-1.5">
                <h4 className="font-semibold text-neutral-900">Match Evidence</h4>
                <p className="text-neutral-600">{selectedJob.explanation}</p>
              </div>

              {/* 5-Component Score Breakdown */}
              {selectedJob.match_breakdown && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-neutral-900">Deterministic Scoring Breakdown</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2 border border-neutral-100 rounded bg-neutral-50">
                      <div className="text-[10px] text-neutral-500 uppercase">Skills (35%)</div>
                      <div className="font-semibold text-neutral-900 mt-0.5">
                        {Math.round((selectedJob.match_breakdown.skills_score || 0) * 100)}%
                      </div>
                    </div>
                    <div className="p-2 border border-neutral-100 rounded bg-neutral-50">
                      <div className="text-[10px] text-neutral-500 uppercase">Experience (25%)</div>
                      <div className="font-semibold text-neutral-900 mt-0.5">
                        {Math.round((selectedJob.match_breakdown.experience_score || 0) * 100)}%
                      </div>
                    </div>
                    <div className="p-2 border border-neutral-100 rounded bg-neutral-50">
                      <div className="text-[10px] text-neutral-500 uppercase">Recency (20%)</div>
                      <div className="font-semibold text-neutral-900 mt-0.5">
                        {Math.round((selectedJob.match_breakdown.recency_score || 0) * 100)}%
                      </div>
                    </div>
                    <div className="p-2 border border-neutral-100 rounded bg-neutral-50">
                      <div className="text-[10px] text-neutral-500 uppercase">Projects (10%)</div>
                      <div className="font-semibold text-neutral-900 mt-0.5">
                        {Math.round((selectedJob.match_breakdown.projects_score || 0) * 100)}%
                      </div>
                    </div>
                    <div className="p-2 border border-neutral-100 rounded bg-neutral-50">
                      <div className="text-[10px] text-neutral-500 uppercase">Domain (10%)</div>
                      <div className="font-semibold text-neutral-900 mt-0.5">
                        {Math.round((selectedJob.match_breakdown.domain_score || 0) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Description */}
              <div className="space-y-1.5">
                <h4 className="font-semibold text-neutral-900">About the Role</h4>
                <p className="whitespace-pre-line text-neutral-600 leading-relaxed">
                  {selectedJob.description}
                </p>
              </div>

              {/* Responsibilities */}
              {selectedJob.responsibilities && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-neutral-900">Key Responsibilities</h4>
                  <p className="whitespace-pre-line text-neutral-600 leading-relaxed">
                    {selectedJob.responsibilities}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
              {selectedJob.company_website ? (
                <a
                  href={selectedJob.company_website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
                >
                  <span>Company Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="btn btn-outline text-xs"
                >
                  Close
                </button>
                {selectedJob.application_status === "recruiter_contacted" && (
                  <Link
                    href="/candidate/inbox"
                    className="btn btn-primary text-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Conversation</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
