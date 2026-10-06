"use client";
import { useEffect, useState } from "react";
import { api, fileUrl } from "@/lib/api";
import MatchBadge from "@/components/MatchBadge";

const TEMPLATE = "Hi {first_name}, we'd love to chat about the {job_title} position at {company}. Are you available this week?";

function fillTemplate(tpl: string, c: any, job: any) {
  const first = (c?.name || c?.full?.name || "there").split(" ")[0];
  return tpl
    .replaceAll("{first_name}", first)
    .replaceAll("{job_title}", job?.title || "this role")
    .replaceAll("{company}", job?.company || "us");
}

export default function JobDetail({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>(null);
  const [cands, setCands] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      const d = await api(`/employer/jobs/${params.id}/candidates`);
      setJob(d.job); setCands(d.candidates);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function inviteToInterview(c: any) {
    const text = `Hi ${(c?.name || c?.full?.name || "there").split(" ")[0]}, we'd like to invite you to interview for the ${job?.title} role at ${job?.company}. What times work for you this week?`;
    await api("/messages", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: c.candidate_id, job_id: params.id, body: text }) });
    alert("Interview invite sent — by email and inbox");
  }
  async function contact(c: any) {
    const text = msg.trim() || fillTemplate(TEMPLATE, c, job);
    await api("/messages", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: c.candidate_id, job_id: params.id, body: text }) });
    alert("Message sent"); setMsg("");
  }
  async function openCandidate(c: any) {
    const d = await api(`/candidate/${c.candidate_id}`);
    setSel({ ...c, full: d.candidate });
    setMsg("");
  }

  if (err) return <p className="text-red-600">{err}</p>;
  if (!job) return <p>Loading...</p>;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-black">{job.title}</h1>
        <p className="text-neutral-500 text-sm">{cands.length} matching candidates · Best Match first</p>
        <div className="space-y-3 mt-3">
          {cands.map(c => {
            const skills = (c.skills || []).slice(0, 3);
            const school = c.education?.[0]?.school;
            const meta = [school && school !== "Not found" ? school : "", skills.join(" · ")]
              .filter(Boolean).join(" · ");
            return (
              <div key={c.candidate_id} className="card">
                <MatchBadge pct={c.match_pct} applied={c.applied} />
                {c.application_status && (
                  <span className="ml-2 text-xs font-semibold text-neutral-500">{c.application_status}</span>
                )}
                <p className="font-bold mt-1">{c.name}</p>
                {meta ? <p className="text-sm text-neutral-500">{meta}</p> : null}
                <p className="text-sm mt-1">{c.match_reason}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openCandidate(c)} className="btn-ghost !py-1.5 text-sm">View Profile</button>
                  <button onClick={() => contact(c)} className="btn-primary !py-1.5 text-sm">Contact</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        {sel ? (
          <div className="card sticky top-20 p-6 space-y-3">
            <div>
              <h2 className="text-xl font-black">{sel.full?.name}</h2>
              <div className="mt-1"><MatchBadge pct={sel.match_pct} applied={sel.applied} /></div>
              {sel.full?.location && <p className="text-sm text-neutral-500 mt-1">{sel.full.location}</p>}
            </div>
            {(sel.full?.experience || []).length > 0 && (
              <div>
                <h3 className="font-bold">Experience</h3>
                {(sel.full.experience || []).map((e: any, i: number) => (
                  <p key={i} className="text-sm">{e.title} — {e.company} ({e.start}–{e.end})</p>
                ))}
              </div>
            )}
            {(sel.full?.skills || []).length > 0 && (
              <div>
                <h3 className="font-bold">Skills</h3>
                <p className="text-sm">{(sel.full.skills || []).join(" · ")}</p>
              </div>
            )}
            <div>
              <h3 className="font-bold">Why this candidate matches</h3>
              <p className="text-sm">{sel.match_reason}</p>
            </div>
            <div>
              <span className="label">Message candidate</span>
              <textarea className="input" rows={3} value={msg} onChange={e => setMsg(e.target.value)}
                placeholder={fillTemplate(TEMPLATE, sel, job)} />
              <p className="text-xs text-neutral-500 mt-1">
                Leave blank to send the template. Variables: {"{first_name} {job_title} {company}"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => inviteToInterview(sel)} className="btn-primary flex-1">Invite to Interview</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => contact(sel)} className="btn-ghost flex-1">Message Candidate</button>
            </div>
            {sel.full?.resume_url && <a className="underline text-sm mt-2 inline-block" href={fileUrl(sel.full.resume_url)} target="_blank">Download resume</a>}
          </div>
        ) : <p className="text-neutral-500">Select a candidate to view profile.</p>}
      </div>
    </div>
  );
}
