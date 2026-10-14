"use client";

import { useState } from "react";
import Link from "next/link";
import { joinCandidateWaitlist } from "@/lib/api";
import {
  Shield,
  Mail,
  User,
  Building,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Lock,
} from "lucide-react";

export default function CandidateWaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleInterest, setRoleInterest] = useState("Software Engineer");
  const [currentCompany, setCurrentCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rolesList = [
    "Software Engineer",
    "Founding Full-Stack Engineer",
    "Senior Backend Systems",
    "AI / Machine Learning Engineer",
    "Frontend & UI Engineer",
    "Product Designer",
    "Product Manager",
    "Growth & Ops",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await joinCandidateWaitlist({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role_interest: roleInterest,
        current_company: currentCompany.trim(),
        linkedin_url: linkedinUrl.trim(),
        notes: notes.trim(),
      });

      setSuccess(
        res.message ||
          "Your invite request has been received. We review candidate applications in weekly batches to keep the network vetted and high-signal."
      );
      setName("");
      setEmail("");
      setCurrentCompany("");
      setLinkedinUrl("");
      setNotes("");
    } catch (err: any) {
      setError(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              rec
            </span>
          </Link>

          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/login"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/join"
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center gap-1.5"
            >
              <span>Have an invite?</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-16 px-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-8 font-mono">
          <Link href="/" className="hover:text-zinc-300">
            rec
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-400">Request an invite</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Private Candidate Network
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2 leading-tight">
                Startup interviews, found while you are still employed.
              </h1>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                rec is strictly invite-only. Upload your resume once, and our engine applies to up to 10 matching startup roles for you every morning at 10 AM. Your current employer is blocked from seeing your profile.
              </p>
            </div>

            {/* Trust Pillars */}
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-zinc-300" />
                  <span className="text-xs font-semibold text-white">
                    Current Employer Shield
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your current company is blocked by name and domain. No one at your current company can view your profile or see your applications.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4 text-zinc-300" />
                  <span className="text-xs font-semibold text-white">
                    10 AM Daily Dispatch
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every morning at 10 AM, live startup openings are scored against your resume. Up to 10 tailored applications are dispatched directly to hiring founders.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-zinc-300" />
                  <span className="text-xs font-semibold text-white">
                    Limited on Purpose
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We review candidate requests in weekly batches. Once verified, each member receives 5 single-use invites for trusted peers.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <span>Already received a private invite?</span>
              <Link
                href="/join"
                className="text-white hover:underline font-medium inline-flex items-center gap-1"
              >
                Join with invite <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Waitlist Request Form */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  Request an invite
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Tell us what you are looking for. We release invitations in weekly batches.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {success ? (
                <div className="p-6 rounded-lg bg-zinc-900/90 border border-zinc-800 text-center space-y-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Invite Request Received
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {success}
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-medium"
                    >
                      Return to home page <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5">
                      Your Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Chen"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5">
                      Email Address <span className="text-zinc-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      Use your personal email so your current employer never sees it.
                    </span>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5">
                      Target Role / Discipline
                    </label>
                    <select
                      value={roleInterest}
                      onChange={(e) => setRoleInterest(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                      {rolesList.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5">
                      Current Employer (for suppression shield)
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={currentCompany}
                        onChange={(e) => setCurrentCompany(e.target.value)}
                        placeholder="e.g. Stripe, Datadog, or stealth"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 block">
                      We block recruiters from this company and its domains from seeing your profile.
                    </span>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5">
                      LinkedIn or GitHub URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1.5">
                      What are you looking for in your next move? (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Series A or B, high ownership, distributed backend or AI infrastructure, $180k+ base."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-lg font-medium text-xs bg-white text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span>Submitting request...</span>
                      ) : (
                        <>
                          <span>Request an invite</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center text-[11px] text-zinc-500 pt-1">
                    Your details are encrypted and never shared publicly.
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 px-6 bg-zinc-950 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>rec - The private network for quietly-looking engineers and startup hiring teams.</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-zinc-300">Home</Link>
            <Link href="/recruiters/waitlist" className="hover:text-zinc-300">Recruiters</Link>
            <Link href="/login" className="hover:text-zinc-300">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
