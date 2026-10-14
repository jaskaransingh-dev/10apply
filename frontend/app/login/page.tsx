"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, saveSession, forgotPassword, resetPassword } from "@/lib/api";
import {
  ArrowRight,
  KeyRound,
  Mail,
  Lock,
  Shield,
  User,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs text-zinc-500 font-mono">
          Loading sign in...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") || "candidate";

  const [activeRole, setActiveRole] = useState<"candidate" | "recruiter">(
    initialRole === "recruiter" ? "recruiter" : "candidate"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetMode, setResetMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      saveSession(res.token, res.refresh_token, res.user, true);

      if (res.user.role === "candidate") {
        router.push("/candidate/jobs");
      } else {
        router.push("/employer");
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please verify credentials or join with an invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, role: string) => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
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
      } catch (inner: any) {
        setError(inner?.message || "Demo sign in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotSuccess(res.message || "Password recovery token generated.");
      if (res.reset_token) {
        setResetTokenInput(res.reset_token);
        setResetMode(true);
      }
    } catch (err: any) {
      setForgotError(err?.message || "Failed to process recovery request.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await resetPassword(resetTokenInput.trim(), newPasswordInput);
      setForgotSuccess(res.message || "Password reset successfully. You may now sign in.");
      setTimeout(() => {
        setShowForgotModal(false);
        setResetMode(false);
        setPassword(newPasswordInput);
      }, 1500);
    } catch (err: any) {
      setForgotError(err?.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
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
      <main className="flex-1 flex items-center justify-center py-14 px-6">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-white mx-auto">
              rec
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs text-zinc-400">
              Sign in to your private account.
            </p>
          </div>

          {/* Role Toggle: Candidate · Recruiter */}
          <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveRole("candidate")}
              className={`py-2 rounded-md font-medium transition-colors ${
                activeRole === "candidate"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => setActiveRole("recruiter")}
              className={`py-2 rounded-md font-medium transition-colors ${
                activeRole === "recruiter"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Recruiter
            </button>
          </div>

          {/* Auth Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-sm space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                  {activeRole === "candidate" ? "Candidate Email" : "Work Email"}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      activeRole === "candidate"
                        ? "candidate@example.com"
                        : "founder@startup.com"
                    }
                    required
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
                      setForgotEmail(email);
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Authenticating..." : "Sign In to Portal"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Switchers (Internal Testing only via ?demo=true) */}
            {searchParams.get("demo") === "true" && (
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wider text-center font-mono">
                  Internal Test Accounts
                </div>
                {activeRole === "candidate" ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleQuickDemo("alex.backend@example.com", "candidate")}
                      disabled={loading}
                      className="p-2 border border-zinc-800 rounded-md text-left bg-zinc-950/60 hover:border-zinc-700 transition-colors"
                    >
                      <div className="font-semibold text-zinc-200">Alex Chen</div>
                      <div className="text-[11px] text-zinc-500">Backend Systems</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo("elena.datascience@example.com", "candidate")}
                      disabled={loading}
                      className="p-2 border border-zinc-800 rounded-md text-left bg-zinc-950/60 hover:border-zinc-700 transition-colors"
                    >
                      <div className="font-semibold text-zinc-200">Elena Rostova</div>
                      <div className="text-[11px] text-zinc-500">Data Science</div>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("founder@apexfoundry.example.com", "recruiter")}
                    disabled={loading}
                    className="w-full p-2 border border-zinc-800 rounded-md text-left bg-zinc-950/60 hover:border-zinc-700 transition-colors"
                  >
                    <div className="font-semibold text-zinc-200">Apex Foundry (Founder)</div>
                    <div className="text-[11px] text-zinc-500">Hiring Founding Backend Engineer</div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Access Links */}
          <div className="text-center space-y-2 text-xs text-zinc-500">
            {activeRole === "candidate" ? (
              <div className="space-y-1">
                <p>
                  Have an invite?{" "}
                  <Link href="/join" className="text-zinc-300 hover:text-white underline underline-offset-4 font-medium">
                    Join here.
                  </Link>
                </p>
                <p>
                  No invite yet?{" "}
                  <Link href="/candidate/waitlist" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-4">
                    Request one.
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p>
                  Looking to hire?{" "}
                  <Link href="/recruiters/waitlist" className="text-zinc-300 hover:text-white underline underline-offset-4 font-medium">
                    Request access.
                  </Link>
                </p>
              </div>
            )}
            <p className="pt-2">
              <Link href="/" className="text-zinc-500 hover:text-zinc-300">
                &larr; Return to homepage
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Reset Password</h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setResetMode(false);
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!resetMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-3 text-xs">
                <p className="text-zinc-400">
                  Enter your registered account email to initiate password recovery.
                </p>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="account@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {forgotError && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                    {forgotError}
                  </div>
                )}
                {forgotSuccess && (
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
                    {forgotSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? "Processing..." : "Generate Reset Key"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                <p className="text-zinc-400">
                  Enter your recovery token and new password.
                </p>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {forgotError && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                    {forgotError}
                  </div>
                )}
                {forgotSuccess && (
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
                    {forgotSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? "Updating..." : "Confirm New Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
