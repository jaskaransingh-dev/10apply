"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiForm } from "@/lib/api";

const SAMPLE = `Jane Doe
jane@example.com
San Francisco, CA

UCLA B.S. Computer Science 2027

Software Engineering Intern, Acme, June 2026 - September 2026
Built APIs with Python, FastAPI, AWS, PostgreSQL. React frontend.

Skills: Python, FastAPI, React, AWS, PostgreSQL, Docker`;

const PARSE_STEPS = [
  "Resume uploaded",
  "Experience detected",
  "Skills detected",
  "Education detected",
  "Preferences inferred",
];

export default function UploadPage() {
  const r = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [err, setErr] = useState("");

  function pick(f: File | undefined | null) {
    if (f) { setFile(f); setErr(""); }
  }

  async function upload(f: File | null) {
    const target = f || file;
    if (!target || busy) return;
    setBusy(true); setErr(""); setDoneCount(0);
    // Animated checklist while the server parses.
    const tick = setInterval(() => setDoneCount((c) => Math.min(c + 1, PARSE_STEPS.length - 1)), 600);
    try {
      const fd = new FormData();
      fd.append("file", target);
      await apiForm("/candidate/resume", fd);
      clearInterval(tick);
      setDoneCount(PARSE_STEPS.length);
      setTimeout(() => r.push("/candidate/profile"), 800);
    } catch (e: any) { clearInterval(tick); setErr(e.message); setBusy(false); }
  }

  function useSample() {
    const f = new File([new Blob([SAMPLE], { type: "text/plain" })], "sample-resume.txt", { type: "text/plain" });
    setFile(f);
    upload(f);
  }

  return (
    <div className="card mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-black tracking-tight">Let&apos;s get you discovered.</h1>
      <p className="mt-1 text-sm text-neutral-500">Upload your resume once. We&apos;ll build your candidate profile from it.</p>

      <div
        onClick={() => !busy && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-10 transition ${
          drag ? "border-black bg-neutral-100" : "border-neutral-200 hover:border-neutral-400"
        }`}
      >
        <div className="text-3xl">↑</div>
        <p className="font-semibold">{file ? file.name : "Drop your resume here"}</p>
        <p className="text-sm text-neutral-500">{file ? "Looks good — hit Upload below." : "or click to choose a file"}</p>
        <p className="mt-1 text-xs text-neutral-400">PDF, DOCX, or TXT · Max 10 MB</p>
        <input
          ref={input} type="file" accept=".pdf,.docx,.txt" className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {busy || doneCount >= PARSE_STEPS.length ? (
        <div className="mt-4 space-y-1.5 text-left text-sm">
          <p className="font-bold">{doneCount >= PARSE_STEPS.length ? "Your profile is ready." : "Parsing your resume…"}</p>
          {PARSE_STEPS.map((s, i) => (
            <p key={s} className={i < doneCount ? "font-semibold text-emerald-700" : "text-neutral-400"}>
              {i < doneCount ? "✓ " : "· "}{s}
            </p>
          ))}
        </div>
      ) : null}

      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <button disabled={!file || busy} onClick={() => upload(null)} className="btn-primary mt-4 w-full disabled:opacity-40">
        {busy ? "Analyzing…" : "Upload Resume →"}
      </button>
      {!busy && (
        <p className="mt-2 text-xs text-neutral-500">
          No resume handy? <button className="underline" onClick={useSample}>Use a sample resume</button>
        </p>
      )}
    </div>
  );
}
