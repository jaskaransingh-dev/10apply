"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiForm } from "@/lib/api";

export default function NewJobPage() {
  const r = useRouter();
  const [text, setText] = useState("Backend Software Engineer\nWe are looking for a backend engineer with Python, FastAPI, PostgreSQL, AWS in San Francisco, CA. Hybrid. $140k-$180k. 0-3 years experience.");
  const [parsed, setParsed] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");

  async function generate() {
    setErr("");
    try {
      const d = await api("/employer/jobs/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      setParsed(d.parsed);
    } catch (e: any) { setErr(e.message); }
  }

  async function publish() {
    setErr("");
    try {
      const p = parsed || {};
      const fd = new FormData();
      fd.append("description", text);
      fd.append("title", p.title || "");
      fd.append("company", p.company && p.company !== "Not found" ? p.company : "");
      fd.append("location", p.location || "");
      fd.append("work_arrangement", p.work_arrangement || "Hybrid");
      fd.append("salary_min", String(p.salary_min || 0));
      fd.append("salary_max", String(p.salary_max || 0));
      fd.append("employment_type", p.employment_type || "Full-time");
      fd.append("experience", p.experience || "0-3 years");
      fd.append("required_skills", JSON.stringify(p.required_skills || []));
      fd.append("preferred_skills", JSON.stringify(p.preferred_skills || []));
      if (file) fd.append("file", file);
      // create as draft
      const d = await apiForm("/employer/jobs", fd);
      // publish
      await api(`/employer/jobs/${d.job.id}/publish`, { method: "POST" });
      r.push(`/employer/jobs/${d.job.id}`);
    } catch (e: any) { setErr(e.message); }
  }

  const set = (k: string, v: any) => setParsed({ ...parsed, [k]: v });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <p className="text-xs font-bold tracking-widest accent">FOR EMPLOYERS</p>
      <h1 className="text-3xl font-black">Create a Job</h1>
      <div className="card">
        <span className="label">Paste your job description</span>
        <textarea className="input h-40" value={text} onChange={e => setText(e.target.value)} />
        <div className="mt-2"><span className="label">Or upload JD (PDF/DOCX)</span>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
        <button onClick={generate} className="btn-primary mt-3">Generate Job →</button>
        {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
      </div>
      {parsed && (
        <div className="card space-y-2">
          <h2 className="text-xl font-black">Review your job</h2>
          {(["title", "company", "location", "work_arrangement", "employment_type", "experience"] as const).map(k => (
            <div key={k}><span className="label capitalize">{k.replace("_", " ")}</span>
              <input className="input" value={parsed[k] || ""} onChange={e => set(k, e.target.value)} /></div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <div><span className="label">Salary min</span><input className="input" type="number" value={parsed.salary_min || 0} onChange={e => set("salary_min", Number(e.target.value))} /></div>
            <div><span className="label">Salary max</span><input className="input" type="number" value={parsed.salary_max || 0} onChange={e => set("salary_max", Number(e.target.value))} /></div>
          </div>
          <div><span className="label">Required skills (comma separated)</span>
            <input className="input" value={(parsed.required_skills || []).join(", ")} onChange={e => set("required_skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>
          <div><span className="label">Preferred (comma separated)</span>
            <input className="input" value={(parsed.preferred_skills || []).join(", ")} onChange={e => set("preferred_skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>
          <button onClick={publish} className="btn-primary w-full">Publish Job</button>
        </div>
      )}
    </div>
  );
}
