"use client";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, apiForm } from "@/lib/api";

function Success({ entry }: { entry: any }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}${entry.invite_path}` : entry.invite_path;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="card mx-auto max-w-md space-y-3 text-center">
      <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-black text-emerald-800">✓</p>
      <h1 className="text-2xl font-black tracking-tight">You&apos;re #{entry.position} in line</h1>
      <p className="text-sm text-neutral-500">
        {entry.total} waiting · we saved {entry.side === "candidate" ? "your resume" : "your hiring needs"}.
        Everyone on the waitlist gets their own invite list — share yours to move up.
      </p>
      <div className="flex gap-2">
        <input className="input font-mono text-sm" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button onClick={copy} className="btn-primary shrink-0 !px-4">{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <p className="text-xs text-neutral-400">Your link admits 5 people · each of them gets 5 invites</p>
    </div>
  );
}

function CandidateJoin({ onDone }: { onDone: (e: any) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function join() {
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("side", "candidate");
      fd.append("name", name);
      fd.append("email", email);
      if (file) fd.append("file", file);
      const d = await apiForm("/waitlist/join", fd);
      onDone(d.entry);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="card mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-black tracking-tight">Join as a candidate</h1>
      <p className="text-sm text-neutral-500">Drop your resume — we pull your name and email automatically.</p>
      <div
        onClick={() => input.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-200 p-8 text-center transition hover:border-neutral-400"
      >
        <div className="text-2xl">↑</div>
        <p className="font-semibold text-sm">{file ? file.name : "Drop resume here or click to choose"}</p>
        <p className="text-xs text-neutral-400">PDF, DOCX, TXT · optional but recommended</p>
        <input ref={input} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <div><span className="label">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="From your resume if you upload one" /></div>
      <div><span className="label">Email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button onClick={join} disabled={busy} className="btn-primary w-full disabled:opacity-40">
        {busy ? "Joining…" : "Join the waitlist →"}
      </button>
    </div>
  );
}

function EmployerJoin({ onDone }: { onDone: (e: any) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function join() {
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("side", "employer");
      fd.append("name", name);
      fd.append("email", email);
      fd.append("company", company);
      fd.append("hiring_notes", notes);
      const d = await apiForm("/waitlist/join", fd);
      onDone(d.entry);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="card mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-black tracking-tight">Join as an employer</h1>
      <p className="text-sm text-neutral-500">Tell us what you&apos;re hiring — we&apos;ll hold your spot.</p>
      <div><span className="label">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
      <div><span className="label">Work email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div>
      <div><span className="label">Company</span><input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme AI" /></div>
      <div><span className="label">Who are you hiring? (optional)</span>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 2 backend engineers, Python + AWS" /></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button onClick={join} disabled={busy} className="btn-primary w-full disabled:opacity-40">
        {busy ? "Joining…" : "Join the waitlist →"}
      </button>
    </div>
  );
}

function Body() {
  const q = useSearchParams();
  const [role, setRole] = useState(q.get("role") === "employer" ? "employer" : "candidate");
  const [done, setDone] = useState<any>(null);
  if (done) return <Success entry={done} />;
  return (
    <div>
      <div className="mx-auto mb-4 grid max-w-md grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1.5">
        {(["candidate", "employer"] as const).map((x) => (
          <button key={x} type="button" onClick={() => setRole(x)}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold capitalize transition ${role === x ? "bg-white shadow" : "text-neutral-500"}`}>
            {x === "candidate" ? "Candidate" : "Employer"}
          </button>
        ))}
      </div>
      {role === "candidate" ? <CandidateJoin onDone={setDone} /> : <EmployerJoin onDone={setDone} />}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-center text-neutral-500">Loading…</p>}>
      <Body />
    </Suspense>
  );
}
