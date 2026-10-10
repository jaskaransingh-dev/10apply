"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  api,
  saveSession,
  validateInvitation,
  onboardCandidateWithFile,
  onboardCandidate,
  joinRecruiterWaitlist,
  forgotPassword,
  resetPassword,
} from "@/lib/api";
import {
  ArrowRight,
  Shield,
  Lock,
  FileUp,
  CheckCircle2,
  Clock,
  Briefcase,
  Users,
  Building,
  KeyRound,
  ExternalLink,
  Check,
  AlertCircle,
  X,
  Mail,
  User,
  Sparkles,
} from "lucide-react";

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Invite Code State
  const [inviteCode, setInviteCode] = useState("");
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [inviterEmail, setInviterEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Candidate Onboarding State
  const [onboardStep, setOnboardStep] = useState<1 | 2 | 3 | 4>(1);
  const [candName, setCandName] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candPassword, setCandPassword] = useState("");
  const [candWorkAuth, setCandWorkAuth] = useState("Authorized to work in US (Citizen or PR)");
  const [candTargetRole, setCandTargetRole] = useState("Software Engineer");
  const [candWorkPref, setCandWorkPref] = useState("Remote");
  const [candLocation, setCandLocation] = useState("San Francisco, CA");
  const [candMinSalary, setCandMinSalary] = useState("140000");
  const [candGithub, setCandGithub] = useState("");
  const [candPortfolio, setCandPortfolio] = useState("");
  const [candLinkedin, setCandLinkedin] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSuccess, setOnboardSuccess] = useState(false);

  // Member Sign In State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetMode, setResetMode] = useState(false);

  // Recruiter Waitlist State
  const [recName, setRecName] = useState("");
  const [recEmail, setRecEmail] = useState("");
  const [recCompany, setRecCompany] = useState("");
  const [recWebsite, setRecWebsite] = useState("");
  const [recHiringNeeds, setRecHiringNeeds] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [recSuccess, setRecSuccess] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  // Demo Switcher
  const [demoLoading, setDemoLoading] = useState(false);

  // Check URL query parameters for invite code
  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("invite");
    if (codeParam) {
      setInviteCode(codeParam.trim());
      handleValidateCode(codeParam.trim());
    }
  }, [searchParams]);

  // Validate single-use invite code
  const handleValidateCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || inviteCode).trim();
    if (!code) {
      setInviteError("Please enter an invitation code or use a private invite link.");
      return;
    }
    setValidatingInvite(true);
    setInviteError(null);
    try {
      const res = await validateInvitation(code);
      if (res.valid) {
        setInviteVerified(true);
        setVerifiedToken(code);
        setInviterEmail(res.inviter_email || "");
        setOnboardStep(1);
      } else {
        setInviteVerified(false);
        setInviteError(res.reason || "Invalid invitation code. Membership is strictly invite-only.");
      }
    } catch (err: any) {
      setInviteVerified(false);
      setInviteError(err?.message || "Failed to validate invitation code.");
    } finally {
      setValidatingInvite(false);
    }
  };

  // Submit candidate onboarding
  const handleCompleteOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);
    setOnboardLoading(true);

    try {
      let res: any;
      if (resumeFile) {
        const formData = new FormData();
        formData.append("file", resumeFile);
        formData.append("invite_code", verifiedToken || inviteCode.trim());
        formData.append("name", candName.trim());
        formData.append("email", candEmail.trim().toLowerCase());
        formData.append("password", candPassword || "demo1234");
        formData.append("work_authorization", candWorkAuth);
        formData.append("target_role", candTargetRole);
        formData.append("work_preference", candWorkPref);
        formData.append("primary_location", candLocation);
        formData.append("min_salary", String(parseInt(candMinSalary) || 0));
        formData.append("github_url", candGithub.trim());
        formData.append("portfolio_url", candPortfolio.trim());
        formData.append("linkedin_url", candLinkedin.trim());
        res = await onboardCandidateWithFile(formData);
      } else {
        res = await onboardCandidate({
          invite_code: verifiedToken || inviteCode.trim(),
          name: candName.trim(),
          email: candEmail.trim().toLowerCase(),
          password: candPassword || "demo1234",
          work_authorization: candWorkAuth,
          target_role: candTargetRole,
          work_preference: candWorkPref,
          primary_location: candLocation,
          min_salary: parseInt(candMinSalary) || 0,
          github_url: candGithub.trim(),
          portfolio_url: candPortfolio.trim(),
          linkedin_url: candLinkedin.trim(),
        });
      }

      if (res.token) {
        saveSession(res.token, res.refresh_token || "", res.user, true);
        setOnboardSuccess(true);
        setOnboardStep(4);
      } else {
        throw new Error(res.message || "Failed to complete onboarding.");
      }
    } catch (err: any) {
      setOnboardError(err?.message || "Error submitting profile. Please check your information.");
    } finally {
      setOnboardLoading(false);
    }
  };

  // Member sign-in with email & password
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      saveSession(res.token, res.refresh_token, res.user, true);
      if (res.user?.role === "candidate") {
        router.push("/candidate/jobs");
      } else {
        router.push("/employer");
      }
    } catch (err: any) {
      setLoginError(err?.message || "Invalid email or password.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Forgot password request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotError("Please enter a valid account email.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotEmail.trim());
      setForgotSuccess(
        res.reset_token
          ? `Password reset instructions dispatched. For testing, your token is: ${res.reset_token}`
          : "If an account exists with this email, password reset instructions have been dispatched."
      );
      if (res.reset_token) {
        setResetTokenInput(res.reset_token);
        setResetMode(true);
      }
    } catch (err: any) {
      setForgotError(err?.message || "Failed to request password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Reset password submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!resetTokenInput.trim() || !newPasswordInput || newPasswordInput.length < 6) {
      setForgotError("Please provide your reset token and a new password (min 6 characters).");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await resetPassword(resetTokenInput.trim(), newPasswordInput);
      setForgotSuccess("Password updated successfully. You may now sign in with your new password.");
      setLoginEmail(forgotEmail);
      setLoginPassword(newPasswordInput);
      setTimeout(() => setShowForgotModal(false), 2000);
    } catch (err: any) {
      setForgotError(err?.message || "Failed to reset password. Please check your token.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Recruiter waitlist submission
  const handleRecruiterWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecError(null);
    setRecSuccess(null);
    if (!recEmail.trim() || !recName.trim() || !recCompany.trim()) {
      setRecError("Please provide your name, work email, and company name.");
      return;
    }
    setRecLoading(true);
    try {
      const res = await joinRecruiterWaitlist({
        name: recName.trim(),
        email: recEmail.trim(),
        company_name: recCompany.trim(),
        company_website: recWebsite.trim() || undefined,
        hiring_needs: recHiringNeeds.trim() || undefined,
      });
      setRecSuccess(
        res.message || "Your recruiter access request has been submitted. We review company profiles and activate hiring accounts in batches."
      );
      setRecName("");
      setRecEmail("");
      setRecCompany("");
      setRecWebsite("");
      setRecHiringNeeds("");
    } catch (err: any) {
      setRecError(err?.message || "Failed to submit waitlist request. Please try again.");
    } finally {
      setRecLoading(false);
    }
  };

  // Quick 1-click demo switcher
  const handleQuickDemo = async (demoEmail: string, role: string) => {
    setDemoLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "demo1234" }),
      });
      saveSession(res.token, res.refresh_token, res.user, true);
      if (role === "candidate") {
        router.push("/candidate/jobs");
      } else {
        router.push("/employer");
      }
    } catch {
      try {
        await api("/demo/seed", { method: "POST" });
        const retry = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: demoEmail, password: "demo1234" }),
        });
        saveSession(retry.token, retry.refresh_token, retry.user, true);
        if (role === "candidate") {
          router.push("/candidate/jobs");
        } else {
          router.push("/employer");
        }
      } catch (err: any) {
        setLoginError("Could not initialize demo login. Please try again.");
      }
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-white">rec</span>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded">
              private network
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a href="#candidate-access" className="text-zinc-400 hover:text-white transition-colors">
              Have an Invite?
            </a>
            <a href="#recruiter-access" className="text-zinc-400 hover:text-white transition-colors">
              Recruiter Access
            </a>
            <a
              href="#sign-in"
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 border-b border-zinc-800/60 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400 mb-6">
            <Shield className="w-3.5 h-3.5 text-zinc-300" />
            <span>Strictly Invite-Only Candidate Network</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-zinc-300">10:00 AM Automated Submissions</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            The private candidate network. Dispatched daily at 10:00 AM.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload your resume once. Our matching engine pairs you with relevant startup roles and submits your applications every morning.
            No job board browsing. No public profiles.
          </p>
        </div>
      </section>

      {/* Main Dual Workspaces: Candidate Code Gate vs Direct Member Sign In */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Candidate Invite Gate (Strictly Requires Code) */}
        <div id="candidate-access" className="lg:col-span-7 flex flex-col justify-start">
          <div className="p-7 rounded-xl border border-zinc-800 bg-zinc-900/40 relative shadow-sm">
            <div className="flex items-center justify-between pb-5 border-b border-zinc-800/80 mb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Candidate Network</span>
                <h2 className="text-xl font-semibold text-white mt-1">Join via Single-Use Invitation</h2>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                Code Required
              </span>
            </div>

            {/* If Invite Not Verified Yet: Gate Code Form */}
            {!inviteVerified && (
              <div>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Candidate access is strictly gated by single-use invitation tokens. Each approved member receives 5 invites for trusted peers.
                  Public waitlists and open registrations are disabled.
                </p>

                <form onSubmit={(e) => { e.preventDefault(); handleValidateCode(); }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                      Single-Use Invitation Code or Private Link
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => { setInviteCode(e.target.value); setInviteError(null); }}
                          placeholder="e.g. cross_8k2m9xla or INV-4E8F"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={validatingInvite}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {validatingInvite ? "Verifying..." : "Verify Code"}
                      </button>
                    </div>
                  </div>

                  {inviteError && (
                    <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-800/60 text-xs text-zinc-500 flex items-center justify-between">
                    <span>Do not have an invite code?</span>
                    <span className="text-zinc-400">Request an invite from an active candidate member</span>
                  </div>
                </form>
              </div>
            )}

            {/* If Invite Verified: Multi-step Candidate Onboarding */}
            {inviteVerified && !onboardSuccess && (
              <div>
                <div className="mb-6 p-3.5 rounded-lg bg-zinc-800/50 border border-zinc-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-emerald-300 block">Invitation Validated</span>
                      <span className="text-xs text-zinc-400 font-mono">{verifiedToken}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setInviteVerified(false); setInviteCode(""); }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Change code
                  </button>
                </div>

                {/* Step Indicators */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setOnboardStep(1)}
                    className={`py-1.5 px-3 rounded text-xs font-medium border text-left transition-colors ${
                      onboardStep === 1
                        ? "bg-zinc-800 border-zinc-600 text-white"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-500"
                    }`}
                  >
                    1. Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardStep(2)}
                    className={`py-1.5 px-3 rounded text-xs font-medium border text-left transition-colors ${
                      onboardStep === 2
                        ? "bg-zinc-800 border-zinc-600 text-white"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-500"
                    }`}
                  >
                    2. Work Auth
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardStep(3)}
                    className={`py-1.5 px-3 rounded text-xs font-medium border text-left transition-colors ${
                      onboardStep === 3
                        ? "bg-zinc-800 border-zinc-600 text-white"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-500"
                    }`}
                  >
                    3. Resume
                  </button>
                </div>

                <form onSubmit={handleCompleteOnboard} className="space-y-4">
                  {/* Step 1: Account Details */}
                  {onboardStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={candName}
                          onChange={(e) => setCandName(e.target.value)}
                          placeholder="Alex Chen"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={candEmail}
                          onChange={(e) => setCandEmail(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                          Password (min 6 characters)
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={candPassword}
                          onChange={(e) => setCandPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (!candName.trim() || !candEmail.trim() || !candPassword) {
                              setOnboardError("Please fill out your name, email, and password.");
                              return;
                            }
                            setOnboardError(null);
                            setOnboardStep(2);
                          }}
                          className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white flex items-center gap-1.5"
                        >
                          Continue to Work Auth <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Work Authorization & Matching Preferences */}
                  {onboardStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                          Work Authorization Status
                        </label>
                        <select
                          value={candWorkAuth}
                          onChange={(e) => setCandWorkAuth(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                        >
                          <option value="Authorized to work in US (Citizen or PR)">US Citizen or Permanent Resident</option>
                          <option value="Employment Visa (H-1B, O-1, TN, E-3)">Employment Visa (H-1B, O-1, TN, E-3)</option>
                          <option value="Requires Visa Sponsorship">Requires Visa Sponsorship</option>
                          <option value="Authorized to work in EU / UK / Canada">Authorized in EU / UK / Canada</option>
                          <option value="Authorized to work worldwide">Authorized to work worldwide</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                            Target Role / Headline
                          </label>
                          <input
                            type="text"
                            value={candTargetRole}
                            onChange={(e) => setCandTargetRole(e.target.value)}
                            placeholder="Senior Backend Engineer"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                            Work Arrangement
                          </label>
                          <select
                            value={candWorkPref}
                            onChange={(e) => setCandWorkPref(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                          >
                            <option value="Remote">Remote Only</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="On-site">On-site</option>
                            <option value="Any">Any Arrangement</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                            Primary Location
                          </label>
                          <input
                            type="text"
                            value={candLocation}
                            onChange={(e) => setCandLocation(e.target.value)}
                            placeholder="San Francisco, CA"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                            Minimum Salary (USD)
                          </label>
                          <input
                            type="number"
                            value={candMinSalary}
                            onChange={(e) => setCandMinSalary(e.target.value)}
                            placeholder="140000"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setOnboardStep(1)}
                          className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnboardStep(3)}
                          className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white flex items-center gap-1.5"
                        >
                          Continue to Resume <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Resume Upload & Portfolio Links */}
                  {onboardStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                          Resume Document (PDF, DOCX, TXT)
                        </label>
                        <div className="border border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg p-5 text-center bg-zinc-950">
                          <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setResumeFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                            id="landing-resume-upload"
                          />
                          <label htmlFor="landing-resume-upload" className="cursor-pointer block">
                            <FileUp className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
                            {resumeFile ? (
                              <span className="text-xs font-medium text-emerald-400 block font-mono">
                                {resumeFile.name} ({(resumeFile.size / 1024).toFixed(0)} KB)
                              </span>
                            ) : (
                              <>
                                <span className="text-xs font-medium text-zinc-300 block">
                                  Click to upload or drag resume
                                </span>
                                <span className="text-[11px] text-zinc-500 block mt-1">
                                  Parsed privately for 10 AM matching
                                </span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                            GitHub URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={candGithub}
                            onChange={(e) => setCandGithub(e.target.value)}
                            placeholder="https://github.com/username"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                            Portfolio / Demos (Optional)
                          </label>
                          <input
                            type="url"
                            value={candPortfolio}
                            onChange={(e) => setCandPortfolio(e.target.value)}
                            placeholder="https://portfolio.dev"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => setOnboardStep(2)}
                          className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={onboardLoading}
                          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
                        >
                          {onboardLoading ? "Verifying & Onboarding..." : "Complete & Activate 10 AM Matches"}
                        </button>
                      </div>
                    </div>
                  )}

                  {onboardError && (
                    <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 mt-4">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{onboardError}</span>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Onboarding Complete Confirmation */}
            {onboardSuccess && (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">You're done! Profile verified.</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Every day at 10:00 AM, our automated matching engine evaluates active startup opportunities and dispatches up to 10 tailored applications on your behalf.
                  You have also been credited with 5 single-use invitations.
                </p>
                <div className="pt-2">
                  <Link
                    href="/candidate/jobs"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-950 hover:bg-white transition-colors"
                  >
                    Go to Your Candidate Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Direct Member Sign-In with Forgot Password */}
        <div id="sign-in" className="lg:col-span-5 flex flex-col justify-start">
          <div className="p-7 rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm relative">
            <div className="flex items-center justify-between pb-5 border-b border-zinc-800/80 mb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Existing Members</span>
                <h2 className="text-xl font-semibold text-white mt-1">Sign In to rec</h2>
              </div>
              <Lock className="w-4 h-4 text-zinc-500" />
            </div>

            <form onSubmit={handleMemberLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(null); }}
                    placeholder="you@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setShowForgotModal(true);
                      setForgotSuccess(null);
                      setForgotError(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(null); }}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50 mt-2"
              >
                {loginLoading ? "Authenticating..." : "Sign In"}
              </button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="mt-8 pt-6 border-t border-zinc-800/80">
              <span className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">
                1-Click Testing Demos
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={demoLoading}
                  onClick={() => handleQuickDemo("alex.backend@example.com", "candidate")}
                  className="w-full py-2 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 text-left flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <span>Alex Chen &bull; Backend Engineer</span>
                  <span className="font-mono text-zinc-500">Candidate Demo &rarr;</span>
                </button>
                <button
                  type="button"
                  disabled={demoLoading}
                  onClick={() => handleQuickDemo("elena.datascience@example.com", "candidate")}
                  className="w-full py-2 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 text-left flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <span>Elena Rostova &bull; Senior Data Scientist</span>
                  <span className="font-mono text-zinc-500">Candidate Demo &rarr;</span>
                </button>
                <button
                  type="button"
                  disabled={demoLoading}
                  onClick={() => handleQuickDemo("founder@apexfoundry.example.com", "employer")}
                  className="w-full py-2 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 text-left flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <span>Apex Foundry &bull; Founder / Recruiter</span>
                  <span className="font-mono text-zinc-500">Recruiter Demo &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recruiter Waitlist Section */}
      <section id="recruiter-access" className="py-16 px-6 border-t border-zinc-800/80 bg-zinc-900/20">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 sm:p-10 rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div className="max-w-2xl mb-8">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">For Founders & Hiring Teams</span>
              <h2 className="text-2xl font-bold text-white mt-1.5">Request Recruiter Platform Access</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Recruiter access is reviewed and activated in batches. Join the recruiter waitlist with your work email and company name to discover vetted candidates with deterministic match scores and parsed resumes.
              </p>
            </div>

            <form onSubmit={handleRecruiterWaitlist} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={recName}
                    onChange={(e) => setRecName(e.target.value)}
                    placeholder="Sarah Jenkins"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    placeholder="sarah@startup.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={recCompany}
                    onChange={(e) => setRecCompany(e.target.value)}
                    placeholder="Foundry Labs"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Company Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={recWebsite}
                    onChange={(e) => setRecWebsite(e.target.value)}
                    placeholder="https://foundrylabs.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  Current Hiring Needs & Target Roles (Optional)
                </label>
                <input
                  type="text"
                  value={recHiringNeeds}
                  onChange={(e) => setRecHiringNeeds(e.target.value)}
                  placeholder="e.g. Hiring 2 Senior Backend Engineers and 1 ML Researcher"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {recSuccess && (
                <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{recSuccess}</span>
                </div>
              )}

              {recError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{recError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={recLoading}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
                >
                  {recLoading ? "Submitting..." : "Join Recruiter Waitlist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Platform Pillars Section */}
      <section className="py-16 px-6 border-t border-zinc-800/60 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 mb-4 font-mono text-xs font-bold">
              5X
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Five Invites Per Candidate</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every approved member receives exactly five single-use invitations. Balances decrement only on successful registration, maintaining network scarcity.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 mb-4">
              <Clock className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">10:00 AM Automated Submissions</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every day at 10:00 AM, the matching engine scores active startup jobs against your parsed resume and dispatches up to 10 applications automatically.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 mb-4">
              <Briefcase className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Transparent Match Evidence</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Recruiters see deterministic 5-component scoring breakdowns and direct resume evidence, eliminating vanity metrics and keyword stuffing.
            </p>
          </div>
        </div>
      </section>

      {/* Sleek Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Security</span>
              <h3 className="text-lg font-semibold text-white mt-1">
                {resetMode ? "Set New Password" : "Reset Account Password"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {resetMode
                  ? "Enter the reset token sent to your email along with your new password."
                  : "Enter your registered email address to receive password reset instructions."}
              </p>
            </div>

            {!resetMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {forgotSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
                    {forgotSuccess}
                  </div>
                )}

                {forgotError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                    {forgotError}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Have a reset token?
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Token"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    placeholder="reset_..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {forgotSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
                    {forgotSuccess}
                  </div>
                )}

                {forgotError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                    {forgotError}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setResetMode(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Back to email entry
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 px-6 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-xs">
          <div>
            <span className="text-sm font-bold text-white tracking-tight">rec</span>
            <p className="mt-2 text-zinc-500 leading-relaxed">
              Private candidate network and startup matching engine.
            </p>
          </div>
          <div>
            <span className="font-mono uppercase text-zinc-400 tracking-wider block mb-3">Candidates</span>
            <ul className="space-y-2 text-zinc-500">
              <li><a href="#candidate-access" className="hover:text-zinc-300">Invite Code Entry</a></li>
              <li><Link href="/candidate/jobs" className="hover:text-zinc-300">10 AM Dispatches</Link></li>
              <li><Link href="/candidate/inbox" className="hover:text-zinc-300">Messages</Link></li>
            </ul>
          </div>
          <div>
            <span className="font-mono uppercase text-zinc-400 tracking-wider block mb-3">Hiring Teams</span>
            <ul className="space-y-2 text-zinc-500">
              <li><a href="#recruiter-access" className="hover:text-zinc-300">Recruiter Waitlist</a></li>
              <li><Link href="/employer" className="hover:text-zinc-300">Candidate Pipeline</Link></li>
              <li><Link href="/employer/jobs/new" className="hover:text-zinc-300">Publish Startup Job</Link></li>
            </ul>
          </div>
          <div>
            <span className="font-mono uppercase text-zinc-400 tracking-wider block mb-3">Architecture</span>
            <ul className="space-y-2 text-zinc-500">
              <li>Deterministic Scoring Formula</li>
              <li>Idempotent Outbox Mailer</li>
              <li>Supabase Database & Storage</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-600">
          <span>&copy; {new Date().getFullYear()} rec &bull; Private Network &bull; Zero Spam</span>
          <span className="font-mono text-[11px] mt-2 sm:mt-0">Built for high-signal startup hiring</span>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">Loading...</div>}>
      <LandingContent />
    </Suspense>
  );
}
