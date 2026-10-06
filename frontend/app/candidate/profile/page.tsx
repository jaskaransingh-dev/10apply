"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const LEVELS = ["New Grad", "1–2 years", "2–5 years", "5+ years"] as const;
const EMP_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;

function PillsEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <button
            key={v} type="button" onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
            title="Click to remove"
          >
            {v} ✕
          </button>
        ))}
        {values.length === 0 && <span className="text-sm text-neutral-400">None yet — add below.</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="input !py-2 text-sm" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="btn-ghost shrink-0 !px-4 !py-2 text-sm">Add</button>
      </div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="text-lg font-black">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-neutral-500">{sub}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const r = useRouter();
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/candidate/profile").then((d) => setP(d.profile)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-600">{err} — <a className="underline" href="/candidate/upload">upload resume first</a></p>;
  if (!p) return <p className="text-neutral-500">Loading profile...</p>;

  const data = p.profile_data || {};
  const set = (k: string, v: any) => { setP({ ...p, [k]: v }); setSaved(false); };
  const setData = (k: string, v: any) => { setP({ ...p, profile_data: { ...data, [k]: v } }); setSaved(false); };
  const toggleEmp = (t: string) => {
    const cur: string[] = p.employment_types || [];
    set("employment_types", cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  };

  async function save() {
    setSaving(true);
    try {
      await api("/candidate/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name, location: p.location, roles: p.roles, locations: p.locations,
          remote: p.remote, employment_types: p.employment_types,
          experience_level: p.experience_level, salary_min: Number(p.salary_min) || 0,
          skills: data.skills,
        }),
      });
      setSaved(true);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="font-bold text-green-700">✓ We built this from your resume.</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Your candidate profile</h1>
        <p className="text-neutral-600">This is what employers will see. Review anything we got wrong.</p>
      </div>

      <Section title="About you">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><span className="label">Name</span><input className="input" value={p.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div><span className="label">Location</span><input className="input" value={p.location || ""} onChange={(e) => set("location", e.target.value)} placeholder="City, ST" /></div>
        </div>
        {(data.email && data.email !== "Not found") || (data.phone && data.phone !== "Not found") ? (
          <p className="text-sm text-neutral-500">
            {[data.email !== "Not found" && data.email, data.phone !== "Not found" && data.phone].filter(Boolean).join(" · ")}
            <span className="text-neutral-400"> — from your resume</span>
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="label">Experience level</span>
            <select className="input" value={p.experience_level || "New Grad"} onChange={(e) => set("experience_level", e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <span className="label">Salary floor (yearly $)</span>
            <input className="input" type="number" min={0} step={5000} value={p.salary_min || 0}
              onChange={(e) => set("salary_min", Number(e.target.value))} placeholder="120000" />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" checked={!!p.remote} onChange={(e) => set("remote", e.target.checked)} />
          Open to remote work
        </label>
        <div>
          <span className="label">Employment types</span>
          <div className="flex flex-wrap gap-2">
            {EMP_TYPES.map((t) => (
              <button
                key={t} type="button" onClick={() => toggleEmp(t)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  (p.employment_types || []).includes(t) ? "bg-neutral-950 text-white" : "border border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Skills" sub="From your resume — click a pill to remove it, or add your own.">
        <PillsEditor values={data.skills || []} onChange={(v) => setData("skills", v)} placeholder="Add a skill, e.g. Go" />
      </Section>

      <Section title="Experience" sub="Detected on your resume — re-upload to change.">
        <div className="space-y-2">
          {(data.experience || []).map((e: any, i: number) => (
            <div key={i} className="rounded-xl border border-neutral-200 p-3">
              <p className="font-bold">{e.title}</p>
              <p className="text-sm text-neutral-500">{e.company} · {e.start} – {e.end}</p>
              {(e.skills || []).length > 0 && <p className="mt-1 text-xs text-neutral-500">{(e.skills || []).join(" · ")}</p>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Education" sub="Detected on your resume — re-upload to change.">
        <div className="space-y-1 text-sm">
          {(data.education || []).map((e: any, i: number) => (
            <p key={i}><b>{e.school}</b>{e.degree && e.degree !== "Not found" ? ` — ${e.degree}` : ""}{e.graduation_year && e.graduation_year !== "Not found" ? ` (${e.graduation_year})` : ""}</p>
          ))}
        </div>
      </Section>

      <Section title="Preferences" sub="What you want — we match against this.">
        <div><span className="label">Target roles</span>
          <PillsEditor values={p.roles || []} onChange={(v) => set("roles", v)} placeholder="Add a role, e.g. Backend Engineer" /></div>
        <div><span className="label">Locations</span>
          <PillsEditor values={p.locations || []} onChange={(v) => set("locations", v)} placeholder="Add a location, e.g. Austin, TX" /></div>
      </Section>

      {saved ? (
        <Link href="/candidate/jobs" className="btn-primary w-full">See My Matches →</Link>
      ) : (
        <button onClick={save} disabled={saving} className="btn-primary w-full disabled:opacity-40">
          {saving ? "Saving…" : "Save Profile"}
        </button>
      )}
    </div>
  );
}
