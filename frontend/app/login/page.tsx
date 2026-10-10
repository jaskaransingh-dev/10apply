"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, saveSession, magicLogin } from "@/lib/api";
import { ArrowRight, KeyRound, Mail, Lock, Shield, User } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-140px)] flex items-center justify-center text-xs text-neutral-400">Loading sign in...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInvite = searchParams.get("invite") || "";
  const initialRole = searchParams.get("role") || "candidate";

  const [activeRole, setActiveRole] = useState<"candidate" | "recruiter">(
    initialRole === "recruiter" ? "recruiter" : "candidate"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [isPasswordMode, setIsPasswordMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    setLoading(true);
    try {
      if (isPasswordMode && password) {
        // Direct password login
        const res = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        saveSession(res.token, res.refresh_token, res.user, true);

        if (res.user.role === "candidate") {
          router.push("/candidate/jobs");
        } else {
          router.push("/employer");
        }
      } else {
        // Passwordless magic link login
        const res = await magicLogin(email.trim(), inviteCode.trim() || undefined);
        saveSession(res.token, res.refresh_token, res.user, true);

        if (res.user.role === "candidate") {
          router.push("/candidate/jobs");
        } else {
          router.push("/employer");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please verify credentials or invitation code.");
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

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 bg-neutral-50">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-900 text-white font-bold text-sm mx-auto">
            r
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Sign in to rec
          </h1>
          <p className="text-xs text-neutral-500">
            Access your 10 AM dispatches or candidate pipeline.
          </p>
        </div>

        {/* Role Toggle: Candidate vs Recruiter */}
        <div className="bg-neutral-200/70 p-1 rounded-lg grid grid-cols-2 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveRole("candidate")}
            className={`py-1.5 rounded-md font-medium transition-colors ${
              activeRole === "candidate"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Candidate Portal
          </button>
          <button
            type="button"
            onClick={() => setActiveRole("recruiter")}
            className={`py-1.5 rounded-md font-medium transition-colors ${
              activeRole === "recruiter"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Recruiter Portal
          </button>
        </div>

        {/* Primary Auth Box */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 text-red-700 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-medium text-neutral-700">
                {activeRole === "candidate" ? "Candidate Email" : "Work Email"}
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeRole === "candidate"
                      ? "alex.backend@example.com"
                      : "founder@apexfoundry.example.com"
                  }
                  required
                  className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            {isPasswordMode ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-neutral-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsPasswordMode(false)}
                    className="text-[11px] text-neutral-500 hover:text-neutral-800"
                  >
                    Use passwordless magic link
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="demo1234"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-neutral-700">Invite Code (Optional)</label>
                  <button
                    type="button"
                    onClick={() => setIsPasswordMode(true)}
                    className="text-[11px] text-neutral-500 hover:text-neutral-800"
                  >
                    Use password
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="cross_xxxxx"
                    className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900 font-mono focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign in"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Switchers */}
          <div className="pt-4 border-t border-neutral-100 space-y-2">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider text-center">
              1-Click Demo Accounts
            </div>
            {activeRole === "candidate" ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemo("alex.backend@example.com", "candidate")}
                  disabled={loading}
                  className="p-2 border border-neutral-200 rounded text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="font-semibold text-neutral-900">Alex Chen</div>
                  <div className="text-[11px] text-neutral-500">Backend Systems</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo("elena.datascience@example.com", "candidate")}
                  disabled={loading}
                  className="p-2 border border-neutral-200 rounded text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="font-semibold text-neutral-900">Elena Rostova</div>
                  <div className="text-[11px] text-neutral-500">Data Science</div>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleQuickDemo("founder@apexfoundry.example.com", "recruiter")}
                disabled={loading}
                className="w-full p-2 border border-neutral-200 rounded text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="font-semibold text-neutral-900">Apex Foundry (Founder)</div>
                <div className="text-[11px] text-neutral-500">Hiring Founding Backend Engineer</div>
              </button>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 underline underline-offset-2">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
