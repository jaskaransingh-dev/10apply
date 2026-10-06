"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiForm } from "@/lib/api";

export default function UploadPage() {
  const r = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [err, setErr] = useState("");

  async function upload() {
    if (!file) return;
    setBusy(true); setErr("");
    setSteps(["Extracting experience...", "Identifying skills...", "Understanding projects..."]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiForm("/candidate/resume", fd);
      setSteps(["✓ Extracting experience", "✓ Identifying skills", "✓ Understanding projects", "✓ Identifying education", "✓ Building your job preferences"]);
      setTimeout(() => r.push("/candidate/profile"), 700);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="card max-w-lg mx-auto text-center">
      <h1 className="text-2xl font-black">Build your profile</h1>
      <div className="border-2 border-dashed rounded-2xl p-10 mt-4">
        <div className="text-3xl">↑</div>
        <p className="font-semibold">Upload Resume</p>
        <p className="text-sm text-neutral-500">PDF or DOCX, max 10MB</p>
        <input type="file" accept=".pdf,.docx,.txt" className="mt-3"
          onChange={e => setFile(e.target.files?.[0] || null)} />
      </div>
      {steps.length > 0 && (
        <div className="text-left mt-4 text-sm space-y-1">
          <p className="font-bold">Analyzing your resume...</p>
          {steps.map(s => <p key={s}>{s}</p>)}
        </div>
      )}
      {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
      <button disabled={!file || busy} onClick={upload} className="btn-primary w-full mt-4 disabled:opacity-40">
        {busy ? "Analyzing..." : "Upload Resume"}
      </button>
      {!busy && <p className="text-xs text-neutral-500 mt-2">No resume handy? <button className="underline" onClick={async () => {
        const blob = new Blob(["Jane Doe\njane@example.com\nSan Francisco, CA\n\nUCLA B.S. Computer Science 2027\n\nSoftware Engineering Intern, Acme, June 2026 - September 2026\nBuilt APIs with Python, FastAPI, AWS, PostgreSQL. React frontend.\n\nSkills: Python, FastAPI, React, AWS, PostgreSQL, Docker"], { type: "text/plain" });
        const f = new File([blob], "sample-resume.txt", { type: "text/plain" });
        setFile(f);
      }}>Use a sample resume</button></p>}
    </div>
  );
}
