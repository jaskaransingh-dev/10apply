"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      saveSession(data.token, data.refresh_token || "", data.user, true);
      router.push(data.user.role === "candidate" ? "/candidate/jobs" : "/employer");
    } catch (e: any) {
      setError(e.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-neutral-200 rounded-lg p-6 max-w-md mx-auto space-y-4 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Sign in to your account</h1>
        <p className="text-xs text-neutral-500 mt-1">Access your jobs, resume, and messages.</p>
      </div>

      {error && <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>}

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700">Email address</label>
        <input
          className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700">Password</label>
        <input
          className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

const DEMOS = [
  {
    email: "alex.backend@example.com",
    label: "Candidate · Alex Chen",
    desc: "Backend Engineer · Python, FastAPI, PostgreSQL",
    role: "candidate",
  },
  {
    email: "elena.datascience@example.com",
    label: "Candidate · Elena Rostova",
    desc: "Data Scientist · ML, PyTorch, Statistics",
    role: "candidate",
  },
  {
    email: "marcus.fullstack@example.com",
    label: "Candidate · Marcus Taylor",
    desc: "Full-Stack Engineer · TypeScript, React, Next.js",
    role: "candidate",
  },
  {
    email: "founder@apexfoundry.example.com",
    label: "Recruiter · Apex Foundry",
    desc: "Hiring Founding Backend Engineer",
    role: "recruiter",
  },
  {
    email: "hiring@metricpulse.example.com",
    label: "Recruiter · MetricPulse Analytics",
    desc: "Hiring Lead Data Scientist",
    role: "recruiter",
  },
] as const;

export function DemoLogins() {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function quick(email: string, role: string) {
    setBusy(email);
    try {
      let data: any;
      try {
        data = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "demo1234" }),
        });
      } catch {
        await api("/demo/seed", { method: "POST" });
        data = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "demo1234" }),
        });
      }
      saveSession(data.token, data.refresh_token || "", data.user, true);
      router.push(role === "candidate" ? "/candidate/jobs" : "/employer");
    } catch (e: any) {
      alert("Sign-in error: " + e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-6 bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
      <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider text-center">
        Demo Accounts (Fictional Dataset)
      </div>
      <div className="space-y-1.5">
        {DEMOS.map((d) => (
          <button
            key={d.email}
            type="button"
            disabled={busy === d.email}
            onClick={() => quick(d.email, d.role)}
            className="w-full text-left p-2.5 rounded border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors text-xs flex items-center justify-between"
          >
            <div>
              <div className="font-medium text-neutral-900">{d.label}</div>
              <div className="text-[11px] text-neutral-500">{d.desc}</div>
            </div>
            <span className="text-neutral-400 text-xs">
              {busy === d.email ? "..." : "Sign in →"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SignupForm({ defaultRole = "candidate", defaultInvite = "" }: { defaultRole?: string; defaultInvite?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [inviteToken, setInviteToken] = useState(defaultInvite);
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role, invite_token: inviteToken.trim() }),
      });
      saveSession(data.token, data.refresh_token || "", data.user, true);
      router.push(role === "candidate" ? "/candidate/upload" : "/employer");
    } catch (e: any) {
      setError(e.message || "Failed to sign up.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-neutral-200 rounded-lg p-6 max-w-md mx-auto space-y-4 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Create an account</h1>
        <p className="text-xs text-neutral-500 mt-1">Get started on the resume-first hiring platform.</p>
      </div>

      {error && <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>}

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700">Account Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("candidate")}
            className={`py-1.5 px-3 rounded text-xs font-medium border text-center transition-colors ${
              role === "candidate" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-700 border-neutral-200"
            }`}
          >
            Candidate
          </button>
          <button
            type="button"
            onClick={() => setRole("recruiter")}
            className={`py-1.5 px-3 rounded text-xs font-medium border text-center transition-colors ${
              role === "recruiter" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-700 border-neutral-200"
            }`}
          >
            Recruiter
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700">Email address</label>
        <input
          className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-700">Password</label>
        <input
          className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {role === "candidate" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-700">Invitation Code (Optional)</label>
          <input
            className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900 font-mono"
            type="text"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            placeholder="cross_xxxxx"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
