"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  validateInvitation,
  onboardCandidateWithFile,
  saveSession,
} from "@/lib/api";
import {
  Shield,
  Lock,
  FileUp,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Users,
  ChevronRight,
  User,
  Mail,
  KeyRound,
  FileText,
  DollarSign,
  MapPin,
  Globe,
  Code2,
} from "lucide-react";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Invite validation state
  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Multi-step form state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Credentials
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Role & Preferences
  const [discipline, setDiscipline] = useState("Engineering & AI");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [workAuth, setWorkAuth] = useState("Authorized to work in US (Citizen or PR)");
  const [workPref, setWorkPref] = useState("Remote");
  const [location, setLocation] = useState("San Francisco, CA");
  const [minSalary, setMinSalary] = useState("140000");

  // Step 3: Resume & Links
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

  // Auto-fill from URL params ?code= or ?invite=
  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("invite");
    if (codeParam) {
      const trimmed = codeParam.trim();
      setInviteCode(trimmed);
      handleValidate(trimmed);
    }
  }, [searchParams]);

  const handleValidate = async (codeToVerify?: string) => {
    const code = (codeToVerify || inviteCode).trim();
    if (!code) {
      setInviteError("Please provide an invite key.");
      return;
    }
    setIsValidating(true);
    setInviteError(null);
    try {
      const res = await validateInvitation(code);
      if (res.valid) {
        setInviteVerified(true);
        setVerifiedToken(code);
        setInviteError(null);
      } else {
        setInviteVerified(false);
        setInviteError(res.reason || "Invalid invitation key. Membership is strictly invite-only.");
      }
    } catch (err: any) {
      setInviteVerified(false);
      setInviteError(err?.message || "Verification failed. Please check the invite code and try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const ext = f.name.toLowerCase();
      if (!ext.endsWith(".pdf") && !ext.endsWith(".docx") && !ext.endsWith(".txt")) {
        setSubmitError("Please upload a PDF, DOCX, or TXT resume file.");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setSubmitError("Resume file size cannot exceed 10MB.");
        return;
      }
      setResumeFile(f);
      setSubmitError(null);
    }
  };

  const handleSubmitOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!resumeFile) {
      setSubmitError("Please attach your resume file (PDF, DOCX, or TXT).");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("invite_code", verifiedToken);
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);
      formData.append("work_authorization", workAuth);
      formData.append("target_role", targetRole.trim() || "Software Engineer");
      formData.append("work_preference", workPref);
      formData.append("primary_location", location.trim() || "Remote");
      formData.append("min_salary", String(parseInt(minSalary || "0", 10) || 0));
      formData.append("currency", "USD");
      formData.append("github_url", githubUrl.trim());
      formData.append("portfolio_url", portfolioUrl.trim());
      formData.append("linkedin_url", linkedinUrl.trim());
      formData.append("file", resumeFile);

      const res = await onboardCandidateWithFile(formData);

      if (res.token) {
        saveSession(res.token, res.refresh_token || "", res.user || { email, role: "candidate" });
      }

      setSubmitSuccessMessage(
        res.message ||
          "You're done! Your profile is verified. Applications are automatically dispatched to 10 matching jobs every morning at 10:00 AM."
      );
      setStep(4);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to complete onboarding. Please verify your details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              rec
            </span>
          </Link>

          <div className="flex items-center gap-5 text-sm">
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
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 py-14 px-6 max-w-3xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-8 font-mono">
          <Link href="/" className="hover:text-zinc-300">rec</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-400">Candidate Join</span>
        </div>

        {/* STEP 0: Invite Verification Gate */}
        {!inviteVerified ? (
          <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Confidential Invitation Required
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Join the Private Candidate Network
              </h1>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                rec is an invite-only network engineered for passive candidates and stealth job switchers.
                We conceal your identity from your current employer, eliminate inbound spam, and automatically
                dispatch tailored applications to 10 matching startup roles every morning at 10:00 AM.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-zinc-200 font-medium">
                <Shield className="w-4 h-4 text-zinc-300" />
                <span>Zero Public Profiles &bull; Stealth Protection</span>
              </div>
              <p className="leading-relaxed">
                Members are never indexed on search engines or visible to public browsing.
                Only verified startup hiring teams receive your credentials when a mutual match criteria is met.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidate();
              }}
              className="space-y-4 pt-2"
            >
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                  Single-Use Invitation Key
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="rec_inv_xxxx or invitation link token"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {inviteError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{inviteError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isValidating}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isValidating ? "Validating invite key..." : "Verify invite & continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-4 border-t border-zinc-800/80 text-xs text-zinc-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span>No invite yet?</span>
              <Link
                href="/candidate/waitlist"
                className="text-zinc-300 hover:text-white underline underline-offset-4 font-medium"
              >
                Request an invite &rarr;
              </Link>
            </div>
          </div>
        ) : step === 4 ? (
          /* STEP 4: Completion Confirmation */
          <div className="p-8 sm:p-10 rounded-xl border border-emerald-900/60 bg-emerald-950/10 shadow-sm space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-800 bg-emerald-950/40 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Access Granted &bull; Verified Profile</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                You&apos;re done!
              </h1>
              <p className="text-zinc-300 text-sm leading-relaxed">
                {submitSuccessMessage ||
                  "Your private profile is verified. Applications will automatically dispatch to 10 matching jobs every morning at 10:00 AM."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
                  Daily Automation
                </span>
                <span className="text-lg font-bold text-white mt-1 block">
                  10:00 AM
                </span>
                <p className="text-xs text-zinc-400 mt-1">
                  10 targeted applications dispatched every day.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
                  Network Credits
                </span>
                <span className="text-lg font-bold text-white mt-1 block">
                  5 Invites
                </span>
                <p className="text-xs text-zinc-400 mt-1">
                  Single-use keys to grant entry to trusted peers.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
                  Privacy Shield
                </span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  Protected
                </span>
                <p className="text-xs text-zinc-400 mt-1">
                  Current employer blocked from discovering profile.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/candidate/jobs"
                className="flex-1 py-3 px-4 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors text-center flex items-center justify-center gap-2"
              >
                <span>Enter Candidate Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/candidate/invite"
                className="py-3 px-4 rounded-lg text-sm font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-colors text-center"
              >
                Manage 5 Invitations
              </Link>
            </div>
          </div>
        ) : (
          /* Multi-Step Onboarding Form */
          <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm space-y-6">
            {/* Step Header */}
            <div className="border-b border-zinc-800/80 pb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  Verified Candidate Registration
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Step {step} of 3
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-zinc-200 h-full transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight">
                {step === 1 && "Create your account"}
                {step === 2 && "Target roles & preferences"}
                {step === 3 && "Resume & proof of work"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {step === 1 && "Step 1 of 3. Next, your target roles. Then your resume."}
                {step === 2 && "Configure matching parameters for your daily 10:00 AM dispatch."}
                {step === 3 && "Upload your resume once. Our matching engine handles the rest."}
              </p>
            </div>

            {/* STEP 1: Name, Email, Password */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Blake"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jordan@example.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!name.trim() || !email.trim() || password.length < 6) {
                        setSubmitError("Please provide your name, valid email, and at least 6-character password.");
                        return;
                      }
                      setSubmitError(null);
                      setStep(2);
                    }}
                    className="w-full py-3 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Next: Target Role & Preferences</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Work Auth & Preferences */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Discipline
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Engineering & AI">Engineering & AI</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Growth & Marketing">Growth & Marketing</option>
                    <option value="Sales & Business Development">Sales & Business Development</option>
                    <option value="Operations & Strategy">Operations & Strategy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Target Role Title
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Backend Engineer or Head of Growth"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Work Authorization
                  </label>
                  <select
                    value={workAuth}
                    onChange={(e) => setWorkAuth(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Authorized to work in US (Citizen or PR)">
                      US Citizen or Permanent Resident (No sponsorship required)
                    </option>
                    <option value="Requires US Visa Sponsorship (H-1B, O-1, TN)">
                      Requires US Visa Sponsorship (H-1B, O-1, TN, or transfer)
                    </option>
                    <option value="Authorized in Canada / UK / EU">
                      Authorized in Canada / UK / EU
                    </option>
                    <option value="Authorized for Global Remote Contract">
                      Global Remote Contract / Independent Contractor
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                      Work Preference
                    </label>
                    <select
                      value={workPref}
                      onChange={(e) => setWorkPref(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="Remote">Remote Only</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Onsite">Onsite</option>
                      <option value="Any">Flexible</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                      Minimum Salary Floor (USD/yr)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="number"
                        value={minSalary}
                        onChange={(e) => setMinSalary(e.target.value)}
                        placeholder="140000"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Location / Base
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA or New York, NY"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-5 rounded-lg text-sm font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Next: Resume & Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Resume File & Optional Links */}
            {step === 3 && (
              <form onSubmit={handleSubmitOnboard} className="space-y-5">
                {/* File Upload Zone */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                    Resume Document (PDF, DOCX, TXT) *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      resumeFile
                        ? "border-emerald-600/60 bg-emerald-950/20"
                        : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/60"
                    }`}
                  >
                    {resumeFile ? (
                      <div className="space-y-2">
                        <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                        <p className="text-sm font-medium text-white">{resumeFile.name}</p>
                        <p className="text-xs text-zinc-400">
                          {(resumeFile.size / 1024).toFixed(1)} KB &bull; Click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileUp className="w-8 h-8 text-zinc-500 mx-auto" />
                        <p className="text-sm font-medium text-zinc-200">
                          Click to select or drag and drop your resume
                        </p>
                        <p className="text-xs text-zinc-500">
                          PDF, DOCX, or text format up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Links */}
                <div className="space-y-3 pt-2">
                  <span className="block text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    Work Samples & Profiles (Optional)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Code2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    <div className="relative">
                      <Globe className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="Portfolio / Personal site URL"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-3 px-5 rounded-lg text-sm font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !resumeFile}
                    className="flex-1 py-3 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? "Parsing Resume & Finalizing Profile..." : "Complete Profile & Join Network"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {submitError && step !== 3 && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-white">rec</span>
            <span>Private Candidate Network &bull; Zero Spam &bull; 10 AM Daily Dispatch</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-zinc-300">Overview</Link>
            <Link href="/recruiters/waitlist" className="hover:text-zinc-300">Recruiter Waitlist</Link>
            <Link href="/login" className="hover:text-zinc-300">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-xs font-mono">Loading...</div>}>
      <JoinForm />
    </Suspense>
  );
}
