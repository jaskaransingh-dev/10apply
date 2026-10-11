"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Lock,
  Clock,
  Briefcase,
  Users,
  Building,
  KeyRound,
  FileText,
  Sparkles,
  Terminal,
  Palette,
  TrendingUp,
  BriefcaseBusiness,
  Cog,
  ChevronRight,
  EyeOff,
  CheckCircle2,
  Cpu,
  Layers,
  Search,
  MessageSquare,
} from "lucide-react";

export default function LandingPage() {
  // Interactive Product Showcase Active Tab
  const [activeTab, setActiveTab] = useState<"engine" | "secrecy" | "disciplines" | "recruiter">("engine");

  // Selected Discipline for the Disciplines Showcase
  const [selectedDiscipline, setSelectedDiscipline] = useState<
    "engineering" | "product" | "growth" | "sales" | "operations"
  >("engineering");

  const disciplines = [
    {
      id: "engineering",
      name: "Engineering & AI",
      icon: Cpu,
      roles: ["Staff Distributed Systems Engineer", "Founding ML / AI Engineer", "Full-Stack Infrastructure", "Backend Lead (Go/Python)"],
      stacks: ["Python", "Go", "TypeScript", "Rust", "PyTorch", "Kubernetes", "PostgreSQL"],
      blurb: "Foundational technical talent, research engineers, and full-stack builders who build mission-critical products from 0 to 1.",
    },
    {
      id: "product",
      name: "Product & Design",
      icon: Palette,
      roles: ["Founding Product Designer", "Principal Design Systems Lead", "Technical Product Manager", "Head of Product"],
      stacks: ["Figma", "Design Systems", "User Research", "Product Analytics", "Rapid Prototyping"],
      blurb: "Designers and product leaders who craft exceptional user experiences, cohesive design systems, and intuitive software.",
    },
    {
      id: "growth",
      name: "Growth & Marketing",
      icon: TrendingUp,
      roles: ["Head of Growth", "Product Marketing Lead", "Developer Relations", "Lifecycle Marketing Specialist"],
      stacks: ["SQL", "Attribution Modeling", "SEO / Content Engines", "DevRel", "Growth Experiments"],
      blurb: "Growth engineers and marketers who scale acquisition channels, developer adoption, and organic distribution loops.",
    },
    {
      id: "sales",
      name: "Sales & BD",
      icon: BriefcaseBusiness,
      roles: ["Founding Account Executive", "Head of Business Development", "Strategic Partnerships Lead", "Solutions Architect"],
      stacks: ["Enterprise Sales", "Contract Negotiation", "Channel Partnerships", "Technical Demo Delivery"],
      blurb: "Commercial operators who close early lighthouse enterprise contracts and build predictable revenue pipelines.",
    },
    {
      id: "operations",
      name: "Operations & Strategy",
      icon: Cog,
      roles: ["Chief of Staff", "VP of Operations", "Finance & Strategy Lead", "BizOps Manager"],
      stacks: ["Financial Modeling", "Cross-Functional Execution", "Org Scaling", "Board Governance"],
      blurb: "Strategic operators who manage company cadence, unit economics, fundraising operations, and strategic initiatives.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              rec
            </span>
          </Link>

          {/* Navigation Links (No input forms on landing page) */}
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/recruiters/waitlist"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Recruiters
            </Link>
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
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-28 px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-mono">
          <Lock className="w-3.5 h-3.5 text-zinc-300" />
          <span>Strictly Invite-Only &bull; 10:00 AM Daily Dispatch</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          The private network for <span className="text-zinc-400">stealth job switchers</span>.
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Upload your resume once. Every morning at 10:00 AM, our deterministic matching engine dispatches up to 10 tailored applications to verified startup openings on your behalf.
        </p>

        {/* Dual Primary Call-to-Actions (Links only, no inline forms) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/join"
            className="w-full sm:w-auto px-7 py-3.5 rounded-lg text-sm font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Candidate Join via Private Invite</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/recruiters/waitlist"
            className="w-full sm:w-auto px-7 py-3.5 rounded-lg text-sm font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>Request Recruiter Access</span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </Link>
        </div>

        {/* Core Architectural Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 border-t border-zinc-800/80 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/60">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
              Daily Automation
            </span>
            <span className="text-xl font-bold text-white mt-1 block">10:00 AM</span>
            <p className="text-xs text-zinc-400 mt-1">10 targeted applications dispatched every morning.</p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/60">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
              Network Scarcity
            </span>
            <span className="text-xl font-bold text-white mt-1 block">5 Invites</span>
            <p className="text-xs text-zinc-400 mt-1">Single-use links granted per approved candidate.</p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/60">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
              Employer Shield
            </span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">Protected</span>
            <p className="text-xs text-zinc-400 mt-1">Current company blocked from candidate profiles.</p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/60">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
              Founder Access
            </span>
            <span className="text-xl font-bold text-white mt-1 block">Direct Chat</span>
            <p className="text-xs text-zinc-400 mt-1">Zero recruiting agency intermediaries or markups.</p>
          </div>
        </div>
      </section>

      {/* Interactive Product Showcase: Tabs Section */}
      <section className="py-16 px-6 bg-zinc-900/20 border-y border-zinc-800/80">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Product Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Designed for career privacy and deterministic matching.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Explore how rec coordinates stealth talent matching, daily automated dispatches, and startup outreach.
            </p>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-zinc-900/80 border border-zinc-800 rounded-lg max-w-2xl mx-auto">
            <button
              onClick={() => setActiveTab("engine")}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "engine"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              The 10 AM Engine
            </button>
            <button
              onClick={() => setActiveTab("secrecy")}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "secrecy"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Secrecy &amp; Privacy Shield
            </button>
            <button
              onClick={() => setActiveTab("disciplines")}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "disciplines"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cross-Functional Talent
            </button>
            <button
              onClick={() => setActiveTab("recruiter")}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "recruiter"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Recruiter Match Evidence
            </button>
          </div>

          {/* Tab Content 1: The 10 AM Engine */}
          {activeTab === "engine" && (
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                <div>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                    Automated Candidate Loop
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Every morning at 10:00 AM, 10 tailored applications dispatch.
                  </h3>
                </div>
                <div className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                  CRON: 0 10 * * *
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-2">
                  <span className="text-xs font-mono text-zinc-500">Phase 01 &bull; 09:30 AM</span>
                  <h4 className="text-sm font-semibold text-white">Opening Evaluation</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    The engine indexes all newly published and approved startup job openings, extracting skill sets, seniority tiers, and compensation constraints.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-2">
                  <span className="text-xs font-mono text-zinc-500">Phase 02 &bull; 10:00 AM</span>
                  <h4 className="text-sm font-semibold text-white">Deterministic Match Ranking</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Every candidate resume is scored against live startup criteria. The system picks up to 10 optimal matches and submits applications with zero manual clicking.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-2">
                  <span className="text-xs font-mono text-zinc-500">Phase 03 &bull; 10:05 AM</span>
                  <h4 className="text-sm font-semibold text-white">Recruiter In-App Outreach</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Founders receive high-signal applicants with parsed evidence and can initiate direct in-app messaging without cold email spam.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/80">
                <span>Candidates never manually search job boards again.</span>
                <Link href="/join" className="text-zinc-300 hover:text-white font-medium flex items-center gap-1">
                  Join Candidate Network <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Tab Content 2: Secrecy & Privacy */}
          {activeTab === "secrecy" && (
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                <div>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                    Confidentiality Infrastructure
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Zero public profiles. Your current employer cannot see you.
                  </h3>
                </div>
                <div className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Stealth Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                    <span>Company Domain Shield</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    We automatically suppress your candidate profile and resumes from hiring managers and recruiters originating from your current employer.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <Lock className="w-4 h-4 text-zinc-400" />
                    <span>No Web Indexing</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Unlike LinkedIn or traditional job platforms, rec profiles are never indexed on Google, searchable by colleagues, or visible to public visitors.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <KeyRound className="w-4 h-4 text-zinc-400" />
                    <span>Invite-Gated Network</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Spammers and third-party scrapers are locked out. New members only join through authenticated single-use invitation tokens from trusted peers.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/80">
                <span>Protect your current role while discovering startup opportunities.</span>
                <Link href="/join" className="text-zinc-300 hover:text-white font-medium flex items-center gap-1">
                  Get Started with Invite <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Tab Content 3: Cross-Functional Disciplines */}
          {activeTab === "disciplines" && (
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm space-y-6">
              <div className="border-b border-zinc-800/80 pb-6">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                  Startup Talent Disciplines
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Engineered for startup hiring across engineering, product, and growth.
                </h3>
              </div>

              {/* Discipline Switcher */}
              <div className="flex flex-wrap gap-2">
                {disciplines.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDiscipline(d.id as any)}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${
                      selectedDiscipline === d.id
                        ? "bg-zinc-800 text-white border border-zinc-700"
                        : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                    }`}
                  >
                    <d.icon className="w-3.5 h-3.5" />
                    <span>{d.name}</span>
                  </button>
                ))}
              </div>

              {/* Active Discipline Card */}
              {(() => {
                const current = disciplines.find((d) => d.id === selectedDiscipline)!;
                return (
                  <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-4">
                    <div className="flex items-center gap-3">
                      <current.icon className="w-5 h-5 text-zinc-300" />
                      <div>
                        <h4 className="text-base font-bold text-white">{current.name}</h4>
                        <p className="text-xs text-zinc-400">{current.blurb}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                          Matched Role Archetypes
                        </span>
                        <ul className="space-y-1.5">
                          {current.roles.map((r) => (
                            <li key={r} className="text-xs text-zinc-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                          Evaluated Skill Competencies
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {current.stacks.map((s) => (
                            <span
                              key={s}
                              className="text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-4 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/80">
                <span>Are you hiring in these functions?</span>
                <Link
                  href="/recruiters/waitlist"
                  className="text-zinc-300 hover:text-white font-medium flex items-center gap-1"
                >
                  Join Recruiter Waitlist <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Tab Content 4: Recruiter Match Evidence */}
          {activeTab === "recruiter" && (
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                <div>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                    Recruiter View
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Deterministic match explanations backed by actual resume data.
                  </h3>
                </div>
                <div className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                  Signal &gt; Noise
                </div>
              </div>

              {/* Sample Match Card */}
              <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-200">
                      MK
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">
                        Senior Systems Engineer &bull; Ex-Stripe
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        94% Match &bull; Authorized in US &bull; Remote / SF
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-semibold">
                    Score: 94/100
                  </span>
                </div>

                <div className="p-3.5 rounded bg-zinc-950/80 border border-zinc-800/60 text-xs text-zinc-300 space-y-2">
                  <span className="font-mono text-zinc-500 uppercase tracking-wider block text-xs">
                    Deterministic Match Breakdown
                  </span>
                  <p className="leading-relaxed">
                    Matched on distributed systems engineering requirements. Candidate demonstrates 5+ years building fault-tolerant backend infrastructure in Go and Python, managing high-throughput PostgreSQL databases, and deploying on Kubernetes.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs">Go</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs">Distributed Systems</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs">PostgreSQL</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs">Kubernetes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-500 font-mono">Verified Resume Attached &bull; 0 Agency Fees</span>
                  <Link
                    href="/recruiters/waitlist"
                    className="text-zinc-200 hover:text-white font-medium flex items-center gap-1"
                  >
                    Request Recruiter Access &rarr;
                  </Link>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/80">
                <span>Startups receive direct candidate applications with zero resume spam.</span>
                <Link href="/recruiters/waitlist" className="text-zinc-300 hover:text-white font-medium">
                  Apply for Hiring Team Access &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* The 5-Invite Architecture */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Scarcity Model
          </span>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            The 5-Invite Candidate Architecture
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            rec maintains talent density by strictly capping candidate onboarding through peer referrals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
            <span className="text-xs font-mono text-zinc-500">Rule 01</span>
            <h3 className="text-base font-semibold text-white">5 Single-Use Tokens</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every verified candidate receives 5 unique single-use invitation links to share with trusted peers.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
            <span className="text-xs font-mono text-zinc-500">Rule 02</span>
            <h3 className="text-base font-semibold text-white">Zero Public Registration</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Candidates cannot sign up without an invitation code. This eliminates low-signal bots and mass spam.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
            <span className="text-xs font-mono text-zinc-500">Rule 03</span>
            <h3 className="text-base font-semibold text-white">Decrement on Success Only</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              An invitation token only decrements from your balance when your peer completes verified onboarding.
            </p>
          </div>
        </div>
      </section>

      {/* Dual Portal Gateway (Links only, completely separate) */}
      <section className="py-16 px-6 bg-zinc-900/30 border-t border-zinc-800/80">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Candidate Card */}
          <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                For Job Switchers &amp; Passive Candidates
              </span>
              <h3 className="text-2xl font-bold text-white">
                Candidate Network
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Upload your resume once, keep your search private from your current employer, and let our 10:00 AM dispatch engine find and apply to verified startup roles for you.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-800/80">
              <Link
                href="/join"
                className="w-full py-3 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2"
              >
                <span>Join with Private Invite Key</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <div className="text-center">
                <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300">
                  Already a member? Sign in &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Recruiter Card */}
          <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                For Founders &amp; Hiring Teams
              </span>
              <h3 className="text-2xl font-bold text-white">
                Recruiter Platform
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Publish openings, receive verified candidates who match your exact stack, review parsed resume evidence, and start conversations directly with zero agency placement fees.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-800/80">
              <Link
                href="/recruiters/waitlist"
                className="w-full py-3 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <span>Request Recruiter Access</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <div className="text-center">
                <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300">
                  Recruiter Sign In &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-8 text-xs text-zinc-500">
          <div className="space-y-3 sm:col-span-1">
            <span className="text-base font-bold text-white block">rec</span>
            <p className="leading-relaxed">
              The private network for stealth job switchers and startup hiring teams.
            </p>
            <p className="font-mono text-zinc-600">
              Daily 10:00 AM Automated Dispatch
            </p>
          </div>

          <div className="space-y-2.5">
            <span className="font-mono uppercase tracking-wider text-zinc-400 block mb-3">
              Candidates
            </span>
            <div><Link href="/join" className="hover:text-zinc-300">Join via Invitation</Link></div>
            <div><Link href="/login" className="hover:text-zinc-300">Candidate Sign In</Link></div>
            <div><Link href="/join" className="hover:text-zinc-300">Resume Upload &amp; Verification</Link></div>
            <div><Link href="/" className="hover:text-zinc-300">The 10 AM Engine</Link></div>
          </div>

          <div className="space-y-2.5">
            <span className="font-mono uppercase tracking-wider text-zinc-400 block mb-3">
              Hiring Teams
            </span>
            <div><Link href="/recruiters/waitlist" className="hover:text-zinc-300">Recruiter Waitlist</Link></div>
            <div><Link href="/login" className="hover:text-zinc-300">Recruiter Sign In</Link></div>
            <div><Link href="/recruiters/waitlist" className="hover:text-zinc-300">Publish Jobs</Link></div>
            <div><Link href="/" className="hover:text-zinc-300">Deterministic Matching</Link></div>
          </div>

          <div className="space-y-2.5">
            <span className="font-mono uppercase tracking-wider text-zinc-400 block mb-3">
              Privacy &amp; Security
            </span>
            <div><span className="text-zinc-400">Zero Public Profiles</span></div>
            <div><span className="text-zinc-400">Employer Suppression Shield</span></div>
            <div><span className="text-zinc-400">Single-Use Token Scarcity</span></div>
            <div><span className="text-zinc-400">&copy; {new Date().getFullYear()} rec network. All rights reserved.</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
