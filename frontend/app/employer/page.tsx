"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getRecruiterCandidates,
  getRecruiterJobs,
  startConversation,
  api,
  authUser,
  saveSession,
  token,
} from "@/lib/api";
import {
  Users,
  Search,
  FileText,
  MessageSquare,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  X,
  Send,
  ArrowRight,
} from "lucide-react";

export default function RecruiterCandidatesPage() {
  const router = useRouter();
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [activeJobInfo, setActiveJobInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Resume preview modal
  const [previewResume, setPreviewResume] = useState<{ id: string; name: string; url: string } | null>(null);

  // Message candidate modal
  const [messageModal, setMessageModal] = useState<{ candidate: any } | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Public login states
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const t = token();
    const u = authUser();
    if (t && (u?.role === "recruiter" || u?.role === "employer" || u?.role === "admin")) {
      setIsRecruiter(true);
      loadRecruiterData();
    } else {
      setIsRecruiter(false);
      setLoading(false);
    }
  }, []);

  const loadRecruiterData = async (jobId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const jRes = await getRecruiterJobs();
      const jobList = jRes.jobs || [];
      setJobs(jobList);

      const targetJob = jobId || (jobList.length > 0 ? jobList[0].id : "");
      if (targetJob) setSelectedJobId(targetJob);

      const cRes = await getRecruiterCandidates(targetJob);
      setCandidates(cRes.candidates || []);
      setActiveJobInfo(cRes.job || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  };

  const handleJobChange = async (newJobId: string) => {
    setSelectedJobId(newJobId);
    setLoading(true);
    try {
      const cRes = await getRecruiterCandidates(newJobId);
      setCandidates(cRes.candidates || []);
      setActiveJobInfo(cRes.job || null);
    } catch (err: any) {
      setError(err?.message || "Failed to switch job.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessage = (cand: any) => {
    setMessageModal({ candidate: cand });
    setMessageDraft(
      `Hi ${cand.name}, I reviewed your resume and background for our ${activeJobInfo?.title || "engineering"} role. We would love to connect about what we're building.`
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageModal || !messageDraft.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      await startConversation(
        messageModal.candidate.candidate_id || messageModal.candidate.id,
        selectedJobId || undefined,
        messageDraft.trim()
      );
      setMessageModal(null);
      setMessageDraft("");
      // Refresh candidate list to reflect contacted status
      loadRecruiterData(selectedJobId);
    } catch (err: any) {
      alert(err?.message || "Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleQuickRecruiterDemo = async (email: string) => {
    setLoggingIn(true);
    setError(null);
    try {
      let res: any;
      try {
        res = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "demo1234" }),
        });
      } catch {
        await api("/demo/seed", { method: "POST" });
        res = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "demo1234" }),
        });
      }
      saveSession(res.token, res.refresh_token, res.user, true);
      setIsRecruiter(true);
      loadRecruiterData();
    } catch (err: any) {
      setError(err?.message || "Failed to sign in.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRecruiterDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruiterEmail.trim()) return;
    setLoggingIn(true);
    setError(null);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recruiterEmail.trim(), password: "demo1234" }),
      });
      saveSession(res.token, res.refresh_token, res.user, true);
      setIsRecruiter(true);
      loadRecruiterData();
    } catch (err: any) {
      setError(err?.message || "Invalid credentials.");
    } finally {
      setLoggingIn(false);
    }
  };

  // --- PUBLIC RECRUITER LANDING & LOGIN ---
  if (!isRecruiter) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-[11px] font-medium text-neutral-600 mb-2">
            <Users className="w-3.5 h-3.5" />
            Recruiter Portal
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Source qualified candidates
          </h1>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            Discover verified candidates ranked deterministically against your job requirements.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm space-y-4">
          <form onSubmit={handleRecruiterDirectLogin} className="space-y-3">
            {error && (
              <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700">Work email</label>
              <input
                type="email"
                placeholder="founder@apexfoundry.example.com"
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md bg-white text-neutral-900"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loggingIn ? "Signing in..." : "Continue as recruiter"}
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-100">
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2 text-center">
              Explore with fictional recruiter demo
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickRecruiterDemo("founder@apexfoundry.example.com")}
                disabled={loggingIn}
                className="w-full text-left px-3 py-2 rounded border border-neutral-200 hover:bg-neutral-50 text-xs transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-neutral-900">Apex Foundry (Founder)</div>
                  <div className="text-[11px] text-neutral-500">Hiring Founding Backend Engineer</div>
                </div>
                <span className="text-neutral-400 text-xs">Sign in →</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickRecruiterDemo("hiring@metricpulse.example.com")}
                disabled={loggingIn}
                className="w-full text-left px-3 py-2 rounded border border-neutral-200 hover:bg-neutral-50 text-xs transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-neutral-900">MetricPulse Analytics (Talent)</div>
                  <div className="text-[11px] text-neutral-500">Hiring Lead Data Scientist</div>
                </div>
                <span className="text-neutral-400 text-xs">Sign in →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter candidates by search query
  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.headline.toLowerCase().includes(q) ||
      c.skills.some((s: string) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Job Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
            Candidate Discovery
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Ranked deterministically using verified resume text, canonical skill coverage, and demonstrated work.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {jobs.length > 0 && (
            <select
              value={selectedJobId}
              onChange={(e) => handleJobChange(e.target.value)}
              className="px-3 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900 font-medium"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.company})
                </option>
              ))}
            </select>
          )}
          <Link
            href="/employer/jobs"
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors"
          >
            Manage Jobs
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter candidate by skill, name, or role (e.g. Python, FastAPI, React)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-md bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
        />
      </div>

      {/* Candidate Results */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-400">
          Computing deterministic matches...
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-white border border-neutral-200 rounded-lg p-8">
          <Users className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-800">No candidates found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Try broadening your search query or check back as more candidates upload their resumes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map((cand, idx) => (
            <div
              key={cand.candidate_id || cand.id}
              className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono text-neutral-400">#{idx + 1}</span>
                    <h3 className="text-base font-semibold text-neutral-900">{cand.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                      {cand.match_score}% match
                    </span>
                    {cand.application_status === "recruiter_contacted" && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Contacted
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-neutral-700">{cand.headline}</span>
                    <span>·</span>
                    <span>{cand.location || "Remote"}</span>
                    <span>·</span>
                    <span>{cand.total_experience_years} years experience</span>
                    <span>·</span>
                    <span>{cand.work_authorization}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {cand.has_resume && (
                    <a
                      href={`http://127.0.0.1:8000/api/resumes/${cand.resume_id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 border border-neutral-200 hover:border-neutral-300 rounded text-xs font-medium text-neutral-700 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Resume</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenMessage(cand)}
                    className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                </div>
              </div>

              {/* Match Explanation */}
              <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-md text-xs space-y-2">
                <div className="text-neutral-700 leading-relaxed">
                  <span className="font-semibold text-neutral-900">Match Evidence: </span>
                  {cand.explanation}
                </div>
                {cand.score_breakdown && (
                  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-neutral-200/60 text-center text-[10px]">
                    <div>
                      <span className="text-neutral-400">Skills (35%): </span>
                      <span className="font-mono font-medium text-neutral-800">{Math.round((cand.score_breakdown.K || 0) * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Experience (25%): </span>
                      <span className="font-mono font-medium text-neutral-800">{Math.round((cand.score_breakdown.E || 0) * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Role (20%): </span>
                      <span className="font-mono font-medium text-neutral-800">{Math.round((cand.score_breakdown.R || 0) * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Preferred (10%): </span>
                      <span className="font-mono font-medium text-neutral-800">{Math.round((cand.score_breakdown.P || 0) * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Projects (10%): </span>
                      <span className="font-mono font-medium text-neutral-800">{Math.round((cand.score_breakdown.D || 0) * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Candidate Skills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {cand.matched_skills?.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded font-medium bg-neutral-900 text-white text-[11px]">
                    {s}
                  </span>
                ))}
                {cand.missing_skills?.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded font-medium bg-neutral-100 text-neutral-400 line-through text-[11px]">
                    {s}
                  </span>
                ))}
              </div>

              {/* Projects */}
              {cand.projects && cand.projects.length > 0 && (
                <div className="pt-2 border-t border-neutral-100 space-y-1">
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Demonstrated Work & Projects
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cand.projects.map((pr: any) => (
                      <a
                        key={pr.id}
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-neutral-400" />
                        <span className="font-medium">{pr.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message Candidate Modal */}
      {messageModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-neutral-900">
                  Message {messageModal.candidate.name}
                </h3>
                <div className="text-xs text-neutral-500">
                  Regarding: {activeJobInfo?.title || "Engineering Role"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessageModal(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700">Message content</label>
                <textarea
                  rows={4}
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  required
                  className="w-full p-3 text-xs border border-neutral-300 rounded-md focus:outline-none focus:border-neutral-900 text-neutral-900 bg-white leading-relaxed"
                />
                <p className="text-[11px] text-neutral-400">
                  Sending this message initiates a persistent conversation and queues an email notification to the candidate.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setMessageModal(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMessage || !messageDraft.trim()}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingMessage ? "Sending..." : "Send Message"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
