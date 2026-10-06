"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const r = useRouter();
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/candidate/profile").then(d => setP(d.profile)).catch(e => setErr(e.message)); }, []);
  if (err) return <p className="text-red-600">{err} — <a className="underline" href="/candidate/upload">upload resume first</a></p>;
  if (!p) return <p>Loading profile...</p>;
  const data = p.profile_data || {};
  const set = (k: string, v: any) => setP({ ...p, [k]: v });
  async function save() {
    await api("/candidate/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      name: p.name, location: p.location, roles: p.roles, locations: p.locations, remote: p.remote,
      experience_level: p.experience_level, salary_min: p.salary_min, skills: data.skills,
    })});
    r.push("/candidate/jobs");
  }
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card">
        <p className="font-bold text-green-700">We built your profile.</p>
        <h1 className="text-3xl font-black mt-1">Profile</h1>
        <div className="mt-3 space-y-3">
          <div><span className="label">Name</span><input className="input" value={p.name || ""} onChange={e => set("name", e.target.value)} /></div>
          <div><span className="label">Education</span>
            <div className="text-sm space-y-1">{(data.education || []).map((e: any, i: number) => (
              <p key={i}>{e.school} — {e.degree} ({String(e.graduation_year)})</p>))}</div></div>
          <div><span className="label">Experience</span>
            <div className="text-sm space-y-1">{(data.experience || []).map((e: any, i: number) => (
              <p key={i}><b>{e.company}</b> — {e.title} ({e.start} – {e.end})</p>))}</div></div>
          <div><span className="label">Skills (comma separated)</span>
            <input className="input" value={(data.skills || []).join(", ")}
              onChange={e => setP({ ...p, profile_data: { ...data, skills: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) } })} />
            <p className="text-sm mt-1">{(data.skills || []).join(" · ")}</p></div>
          <div><span className="label">Preferred roles (comma separated)</span>
            <input className="input" value={(p.roles || []).join(", ")} onChange={e => set("roles", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>
          <div><span className="label">Preferred locations (comma separated)</span>
            <input className="input" value={(p.locations || []).join(", ")} onChange={e => set("locations", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>
          <div><span className="label">Your location</span><input className="input" value={p.location || ""} onChange={e => set("location", e.target.value)} /></div>
        </div>
      </div>
      <button onClick={save} className="btn-primary w-full">Looks Good →</button>
    </div>
  );
}
