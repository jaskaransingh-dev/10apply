"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Clock,
  Lock,
  CheckCircle2,
  Building,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Send,
  EyeOff,
  MessageSquare,
  Sparkles,
  Briefcase,
  Users,
} from "lucide-react";

export default function LandingPage() {
  const [activeLane, setActiveLane] = useState<"candidate" | "recruiter">("candidate");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              rec
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-xs">
            <Link
              href="#candidates"
              className="text-zinc-400 hover:text-white transition-colors hidden sm:inline-block"
            >
              Candidates
            </Link>
            <Link
              href="/recruiters/waitlist"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Recruiters
            </Link>
            <Link
              href="/login"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/join"
              className="px-3.5 py-1.5 rounded-md font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center gap-1.5"
            >
              <span>Have an invite?</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-28 px-6 max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Invite-only · Applications sent daily at 10 AM</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-none">
          Startup interviews, found while you&apos;re still employed.
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed">
          Upload your resume once. Every morning at 10 AM, rec applies to up to 10 matching startup roles for you. Your current employer is blocked from seeing your profile.
        </p>

        {/* Dual CTAs */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/join"
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs sm:text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Join with my invite</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/candidate/waitlist"
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs sm:text-sm font-medium border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
          >
            No invite yet? Request one
          </Link>
        </div>

        {/* Trust Strip */}
        <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span>10 AM daily</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Matching and applications run on a schedule you can count on every morning.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
              <Sparkles className="w-4 h-4 text-zinc-400" />
              <span>Up to 10 a day</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Quality over volume. Each match is scored against your specific criteria.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
              <Shield className="w-4 h-4 text-zinc-400" />
              <span>You stay in control</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your current employer is blocked. Pause or edit your search anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Two Clear Lanes: Candidates vs Recruiters */}
      <section id="candidates" className="border-t border-zinc-800/80 py-20 px-6 max-w-6xl mx-auto w-full">
        {/* Lane Selector */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setActiveLane("candidate")}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeLane === "candidate"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              I&apos;m looking for a role
            </button>
            <button
              onClick={() => setActiveLane("recruiter")}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeLane === "recruiter"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              I&apos;m hiring
            </button>
          </div>
        </div>

        {activeLane === "candidate" ? (
          /* Lane 1: Candidate Flow */
          <div className="space-y-16">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                How It Works
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
                A private job search that runs itself.
              </h2>
              <p className="text-sm text-zinc-400 mt-3">
                No endless job board searching or tedious application forms. You stay focused on your current job while opportunities come to you.
              </p>
            </div>

            {/* 3 Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold font-mono text-white">
                  1
                </div>
                <h3 className="text-sm font-semibold text-white">Upload once.</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We read your resume and extract your technical stack, verified seniority, target roles, and minimum compensation must-haves.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold font-mono text-white">
                  2
                </div>
                <h3 className="text-sm font-semibold text-white">We match every morning.</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  At 10 AM, new startup openings are scored against your profile. The top matches receive your application directly.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold font-mono text-white">
                  3
                </div>
                <h3 className="text-sm font-semibold text-white">Founders reach out.</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Matched founders review your parsed resume evidence and message you directly in the app. No agency intermediaries.
                </p>
              </div>
            </div>

            {/* Live Sample Dispatch Card */}
            <div className="max-w-2xl mx-auto">
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3 text-center">
                Sample 10 AM Dispatch
              </div>
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>94% Match · Dispatched at 10:00 AM</span>
                    </div>
                    <h4 className="text-base font-bold text-white">Founding Backend Engineer</h4>
                    <p className="text-xs text-zinc-400">Apex Foundry · Series A · Remote · $160,000 - $190,000</p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-800/80 px-2.5 py-1 rounded">
                    Shield: Active
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300 space-y-1.5">
                  <div className="font-semibold text-zinc-200 text-[11px] uppercase tracking-wider font-mono">
                    Match Explanation & Evidence
                  </div>
                  <p className="text-xs text-zinc-400">
                    Matched on 5+ years backend systems experience; strong overlap on Python, FastAPI, PostgreSQL, and distributed queues. Salary expectations and US remote preference satisfied.
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Application delivered to founder inbox
                  </span>
                  <span className="text-zinc-400 hover:text-white cursor-pointer">
                    Pause search anytime
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Lane 2: Recruiter Flow */
          <div className="space-y-16">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                For Startup Hiring Teams
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
                Pre-vetted startup talent. No agency. No markup.
              </h2>
              <p className="text-sm text-zinc-400 mt-3">
                rec is an invite-only network of engineers, product, growth, and ops people who are open to the right move but not actively public about it. Post your roles, review matched candidates with their resume evidence, and message them directly.
              </p>
            </div>

            {/* Three Value Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Matched to your stack</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Candidates are scored against the exact requirements, frameworks, and seniority requirements you specify.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Evidence, not keywords</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  See the parsed experience and project evidence behind each match score, not just inflated resumes or keyword stuffing.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">Message directly</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Start conversations in the platform with zero agency fees, zero placement commissions, and no middlemen.
                </p>
              </div>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/recruiters/waitlist"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs sm:text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <span>Request access</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Scarcity & Network Signal Section */}
      <section className="border-t border-zinc-800/80 py-20 px-6 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Invite Scarcity
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Invites are limited on purpose.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Every verified member gets 5 single-use invites for trusted peers. An invite counts against your balance only after that peer finishes verification. That keeps the network small and high-signal.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-zinc-400">Invite Balance</span>
              <span className="text-white font-mono font-bold">5 Single-Use Tokens</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-zinc-400">Balance Decrement</span>
              <span className="text-zinc-300 font-mono">Only on peer verification</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Public Registration</span>
              <span className="text-zinc-400 font-mono">Disabled</span>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section: Employer Shield */}
      <section id="privacy" className="border-t border-zinc-800/80 py-20 px-6 max-w-4xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Privacy & Employer Shield
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Your search stays yours.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Your current employer can&apos;t see your profile, and your profile is never listed publicly. Employer blocking matches company names and corporate domains to prevent current team members and HR from discovering your search.
          </p>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
                <EyeOff className="w-4 h-4 text-zinc-400" />
                <span>Zero Public Profiles</span>
              </div>
              <p className="text-xs text-zinc-400">
                Your profile is never indexed by search engines or viewable to unauthenticated visitors.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
                <Shield className="w-4 h-4 text-zinc-400" />
                <span>Domain & Name Suppression</span>
              </div>
              <p className="text-xs text-zinc-400">
                Recruiters from your designated current company cannot see your applications or profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-zinc-800/80 py-20 px-6 max-w-4xl mx-auto w-full text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Ready to hear about roles before your boss does?
        </h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Join our private candidate network with your invite code or request an invite to be considered in our next weekly batch.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/join"
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs sm:text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Join with my invite</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/candidate/waitlist"
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs sm:text-sm font-medium border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
          >
            Request an invite
          </Link>
        </div>
      </section>

      {/* 3-Column Footer */}
      <footer className="border-t border-zinc-800/60 py-14 px-6 bg-zinc-950 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1 space-y-3">
            <span className="text-lg font-bold text-white tracking-tight">rec</span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The private network for quietly-looking engineers and startup hiring teams.
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] font-mono">
              Candidates
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/join" className="hover:text-zinc-300 transition-colors">
                  Join with invite
                </Link>
              </li>
              <li>
                <Link href="/candidate/waitlist" className="hover:text-zinc-300 transition-colors">
                  Request an invite
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-zinc-300 transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="#candidates" className="hover:text-zinc-300 transition-colors">
                  How it works
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] font-mono">
              Recruiters
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/recruiters/waitlist" className="hover:text-zinc-300 transition-colors">
                  Request access
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-zinc-300 transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/employer" className="hover:text-zinc-300 transition-colors">
                  Platform overview
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] font-mono">
              Privacy
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#privacy" className="hover:text-zinc-300 transition-colors">
                  Employer blocking
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">Data use & suppression</span>
              </li>
              <li>
                <span className="text-zinc-500">Token rules</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 mt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <span>rec Inc. Applications dispatched daily at 10:00 AM.</span>
          <div className="flex items-center gap-4">
            <Link href="/candidate/waitlist" className="hover:text-zinc-300">
              Request Candidate Invite
            </Link>
            <Link href="/recruiters/waitlist" className="hover:text-zinc-300">
              Request Recruiter Access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
