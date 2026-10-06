"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession } from "@/lib/api";

export function LoginForm() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      saveSession(data.token, data.refresh_token || "", data.user, true);
      r.push(data.user.role === "employer" ? "/employer" : "/candidate/jobs");
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-black tracking-tight">Welcome back</h1>
      <p className="text-sm text-neutral-500">Log in to your account.</p>
      <div>
        <span className="label">Email</span>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div>
        <span className="label">Password</span>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
    </form>
  );
}

export function SignupForm({ defaultRole = "candidate", defaultInvite = "" }: { defaultRole?: string; defaultInvite?: string }) {
  const r = useRouter();
  const role0 = defaultRole === "employer" ? "employer" : "candidate";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(role0);
  const [invite, setInvite] = useState(defaultInvite);
  const [inviteState, setInviteState] = useState<{ checked: boolean; valid: boolean; remaining: number }>({ checked: false, valid: false, remaining: 0 });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setInvite(defaultInvite); }, [defaultInvite]);
  useEffect(() => { setRole(defaultRole === "employer" ? "employer" : "candidate"); }, [defaultRole]);

  useEffect(() => {
    let live = true;
    if (!invite.trim()) { setInviteState({ checked: false, valid: false, remaining: 0 }); return; }
    const t = setTimeout(async () => {
      try {
        const d = await api(`/invites/validate?code=${encodeURIComponent(invite.trim())}`);
        if (live) setInviteState({ checked: true, valid: !!d.valid, remaining: d.remaining ?? 0 });
      } catch { if (live) setInviteState({ checked: true, valid: false, remaining: 0 }); }
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [invite]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const data = await api("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, invite_code: invite.trim() }),
      });
      saveSession(data.token, data.refresh_token || "", data.user, true);
      r.push(data.user.role === "employer" ? "/employer" : "/candidate/upload");
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const isCandidate = role === "candidate";

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          {isCandidate ? "Candidate Sign Up" : "Employer Sign Up"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isCandidate
            ? "Upload your resume once — then you're done. Invite-only: paste the link a member sent you."
            : "Post a job, meet ranked candidates. No invite needed — employers join freely."}
        </p>
      </div>

      {/* Role switch — the two landing buttons land here preselected */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1.5">
        {(["candidate", "employer"] as const).map((x) => (
          <button
            type="button"
            key={x}
            onClick={() => setRole(x)}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold capitalize transition ${
              role === x ? "bg-white text-black shadow" : "text-neutral-500 hover:text-black"
            }`}
          >
            {x === "candidate" ? "Candidate" : "Employer"}
          </button>
        ))}
      </div>

      {isCandidate && (
        <div>
          <span className="label">Invite code</span>
          <input
            className="input font-mono"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="Paste invite code or link"
          />
          {invite.trim() && inviteState.checked && (
            <p className={`mt-1 text-xs font-semibold ${inviteState.valid ? "text-emerald-600" : "text-red-600"}`}>
              {inviteState.valid
                ? `✓ Invite valid — ${inviteState.remaining} of 5 spots left on this link`
                : "✕ This invite is invalid or fully used (5/5)."}
            </p>
          )}
        </div>
      )}

      <div>
        <span className="label">Email</span>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div>
        <span className="label">Password</span>
        <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className={`btn-primary w-full ${isCandidate ? "" : "!bg-amber-300 !text-neutral-950 hover:!bg-amber-200"}`} disabled={busy}>
        {busy ? "Creating account…" : isCandidate ? "Create candidate account" : "Create employer account"}
      </button>
    </form>
  );
}
