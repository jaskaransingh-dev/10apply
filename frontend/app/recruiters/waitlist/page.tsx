"use client";

import { useState } from "react";
import Link from "next/link";
import { joinRecruiterWaitlist } from "@/lib/api";
import {
  Building,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Users,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export default function RecruiterWaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [stage, setStage] = useState("Seed");
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([
    "Engineering & AI",
    "Product & Design",
  ]);
  const [hiringTimeline, setHiringTimeline] = useState("Immediate (< 30 days)");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const functionsList = [
    "Engineering & AI",
    "Product & Design",
    "Growth & Marketing",
    "Sales & Business Development",
    "Operations & Finance",
  ];

  const toggleFunction = (fn: string) => {
    setSelectedFunctions((prev) =>
      prev.includes(fn) ? prev.filter((f) => f !== fn) : [...prev, fn]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim() || !company.trim()) {
      setError("Please fill out your name, work email, and company name.");
      return;
    }

    setLoading(true);
    try {
      const combinedNotes = [
        `Stage: ${stage}`,
        `Functions: ${selectedFunctions.join(", ")}`,
        `Timeline: ${hiringTimeline}`,
        notes.trim() ? `Notes: ${notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await joinRecruiterWaitlist({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company_name: company.trim(),
        company_website: website.trim() || undefined,
        hiring_needs: combinedNotes,
      });

      setSuccess(
        res.message ||
          "Your recruiter access request has been received. We review company hiring profiles and activate accounts in batches."
      );
      setName("");
      setEmail("");
      setCompany("");
      setWebsite("");
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
              Sign In
            </Link>
            <Link
              href="/join?code=REC-UNLIMITED"
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center gap-1.5"
            >
              <span>Join with Invite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-16 px-6 max-w-5xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-8 font-mono">
          <Link href="/" className="hover:text-zinc-300">rec</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-400">Recruiter Waitlist</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Product Value Narrative */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Startup Hiring Platform
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2 leading-tight">
                Hire vetted, passive talent without inbound fatigue.
              </h1>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                rec is an invite-only network of high-performing candidates and stealth job switchers.
                We pair active startup openings with qualified candidates every morning at 10:00 AM.
              </p>
            </div>

            {/* Core Value Pillars */}
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
                <span className="text-xs font-semibold text-white block mb-1">
                  Cross-Functional Startup Talent
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Access talent across Engineering, AI / ML, Product, Growth, Marketing, Sales, and Operations.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
                <span className="text-xs font-semibold text-white block mb-1">
                  Deterministic Match Breakdown
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every match explains why a candidate fits your stack with parsed resume evidence and hard constraints.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
                <span className="text-xs font-semibold text-white block mb-1">
                  Direct In-App Messaging
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Reach out directly to matched candidates with zero agency markups or intermediary recruiters.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200 block mb-1">How Access Works</span>
              We review company submissions in batches to preserve candidate privacy and guarantee high-signal introductions.
            </div>
          </div>

          {/* Right Column: Waitlist Request Form */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm">
              <div className="pb-6 border-b border-zinc-800/80 mb-6">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Access Application
                </span>
                <h2 className="text-xl font-semibold text-white mt-1">
                  Request Recruiter Access
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Submit your hiring requirements. Verified startups receive invitation keys in weekly batches.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Sarah Jenkins"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sarah@startup.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Company & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Apex Technologies"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                      Company Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://apextech.example.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                {/* Company Stage */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Funding Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Pre-seed">Pre-seed / Bootstrapped</option>
                    <option value="Seed">Seed ($1M - $4M)</option>
                    <option value="Series A">Series A ($5M - $15M)</option>
                    <option value="Series B+">Series B+ ($15M+)</option>
                    <option value="Profitable / Scaleup">Profitable Scaleup</option>
                  </select>
                </div>

                {/* Target Hiring Functions */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                    Target Hiring Functions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {functionsList.map((fn) => {
                      const selected = selectedFunctions.includes(fn);
                      return (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => toggleFunction(fn)}
                          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            selected
                              ? "bg-zinc-800 border-zinc-600 text-white font-medium"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {fn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hiring Timeline */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Hiring Timeline
                  </label>
                  <select
                    value={hiringTimeline}
                    onChange={(e) => setHiringTimeline(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Immediate (< 30 days)">Immediate (&lt; 30 days)</option>
                    <option value="Next 60-90 days">Next 60–90 days</option>
                    <option value="Ongoing / Passive Pipeline">Ongoing / Passive Pipeline</option>
                  </select>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Specific Roles & Tech Stack (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Hiring 2 Senior Backend Engineers (Go, Python) and 1 Head of Growth."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>

                {success && (
                  <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{success}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? "Submitting Request..." : "Request Recruiter Platform Access"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <span className="font-bold text-white">rec</span>
            <span>Private Candidate Network &bull; Zero Spam</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-zinc-300">Candidate Network</Link>
            <Link href="/login" className="hover:text-zinc-300">Member Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
