"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import InviteCard from "@/components/InviteCard";

export default function EmployerDash() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => { api("/employer/jobs").then(d => setJobs(d.jobs)).catch(() => {}); }, []);
  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-bold tracking-widest accent">FOR EMPLOYERS</p>
          <h1 className="text-3xl font-black">Employer Dashboard</h1>
          <p className="text-neutral-600">Post a job. Message candidates who match — by email and inbox.</p>
        </div>
        <Link href="/employer/jobs/new" className="btn-primary">+ Create Job</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {jobs.map(j => (
          <Link key={j.id} href={`/employer/jobs/${j.id}`} className="card hover:shadow">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-lg">{j.title}</p>
              <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${j.status === "active" ? "bg-emerald-100 text-emerald-900" : "bg-neutral-100 text-neutral-600"}`}>
                {j.status === "active" ? "Live" : "Draft"}
              </span>
            </div>
            <p className="text-sm text-neutral-500">{j.company} · {j.location}</p>
            <p className="text-sm mt-1 text-neutral-600">
              Open to meet matching candidates →
            </p>
          </Link>
        ))}
      </div>
      {jobs.length === 0 && <p className="text-neutral-500 mt-4">No jobs yet. Create your first one.</p>}
      <div className="mt-6 max-w-lg">
        <InviteCard />
      </div>
    </div>
  );
}
