"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import MatchCard from "@/components/MatchCard";

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
      {/* Signature screen: you're done */}
      <div className="card mb-4 text-center">
        <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-black text-emerald-800">✓</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">You&apos;re all set</h1>
        <p className="mx-auto mt-2 max-w-md text-neutral-600">
          Your profile is being shown to companies looking for people like you.{" "}
          {jobs.length > 0 ? `${jobs.length} matches refreshed today.` : ""} We&apos;ll email you
          when an employer reaches out.
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
        {jobs.map((j) => <MatchCard key={j.id} job={j} />)}
      </div>
      {jobs.length === 0 && !err && <p className="mt-4 text-neutral-500">Finding your matches...</p>}
    </div>
  );
}
