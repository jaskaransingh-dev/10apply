"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, salaryRange } from "@/lib/api";
import MatchBadge from "@/components/MatchBadge";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api("/candidate/daily-jobs").then((d) => setJobs(d.jobs)).catch((e: any) => setErr(e.message));
    api("/messages").then((d) => setUnread((d.messages || []).length)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Passive starting state: you're done, nothing to do */}
      <div className="card mb-4 text-center">
        <h1 className="text-3xl font-black tracking-tight">You&apos;re done 🎉</h1>
        <p className="mx-auto mt-2 max-w-md text-neutral-600">
          No applying, no scrolling. Your profile is live — employers reach out by email and the
          conversation goes back and forth right here.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/candidate/inbox" className="btn-primary">
            {unread > 0 ? `Check Inbox (${unread})` : "Check Inbox"}
          </Link>
          <Link href="/candidate/profile" className="btn-ghost">Edit Profile</Link>
        </div>
      </div>

      <Link href="/candidate/invite" className="mb-4 flex items-center justify-between rounded-2xl bg-neutral-950 px-5 py-3 text-sm text-white transition hover:bg-neutral-800">
        <span><b>Invite-only:</b> you have <b>5 invites</b> — share your link.</span>
        <span className="font-bold">→</span>
      </Link>

      <div>
        <p className="text-xs font-bold tracking-widest accent">FOR CANDIDATES</p>
        <h2 className="text-2xl font-black">Your 10 matches today</h2>
        <p className="text-neutral-600">Companies find you — nothing to apply to.</p>
      </div>
      {err && <p className="text-red-600 mt-2">{err}</p>}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {jobs.map((j) => (
          <div key={j.id} className="card">
            <p className="font-bold">{j.company}</p>
            <p className="text-lg font-semibold">{j.title}</p>
            <p className="text-sm text-neutral-500">{j.location} · {j.work_arrangement}</p>
            <p className="font-semibold mt-2">{salaryRange(j.salary_min, j.salary_max)}</p>
            <div className="mt-1"><MatchBadge pct={j.match_pct} applied={false} /></div>
            <div className="text-sm mt-2 space-y-0.5">
              {(j.matched_skills || []).map((s: string) => <p key={s}>✓ {s}</p>)}
              {(j.required_skills || []).filter((s: string) => !(j.matched_skills || []).includes(s)).slice(0, 3).map((s: string) => <p key={s} className="text-neutral-400">· {s}</p>)}
            </div>
            <p className="text-sm mt-2"><b>Why you&apos;re a match:</b> {j.match_reason}</p>
            <p className="text-sm text-neutral-500 mt-1">{j.summary}</p>
          </div>
        ))}
      </div>
      {jobs.length === 0 && !err && <p className="mt-4 text-neutral-500">Finding your matches...</p>}
    </div>
  );
}
