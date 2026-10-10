"use client";
import { useState } from "react";
import Link from "next/link";
import MatchBadge from "./MatchBadge";
import { salaryRange, api } from "@/lib/api";
import { Check, CheckCircle2, ArrowRight } from "lucide-react";

export default function MatchCard({
  job,
  onApplied,
}: {
  job: any;
  onApplied?: (jobId: string) => void;
}) {
  const [applied, setApplied] = useState(!!job.applied);
  const [status, setStatus] = useState(job.application_status || (job.applied ? "Submitted" : null));
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState("");

  const matched: string[] = job.matched_skills || [];
  const missing: string[] = (job.required_skills || []).filter(
    (s: string) => !matched.includes(s)
  ).slice(0, 4);

  async function handleApply() {
    if (applied || applying) return;
    setApplying(true);
    setErr("");
    try {
      await api(`/candidate/apply/${job.id}`, { method: "POST" });
      setApplied(true);
      setStatus("In review");
      if (onApplied) onApplied(job.id);
    } catch (e: any) {
      setErr(e.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="border border-neutral-200 bg-white rounded-lg p-5 flex flex-col justify-between hover:border-neutral-300 transition-all shadow-sm">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs text-neutral-800">{job.company}</span>
              <span className="inline-flex h-1 w-1 rounded-full bg-neutral-300" />
              <span className="text-xs text-neutral-500">{job.location}</span>
            </div>
            <h3 className="text-base font-semibold tracking-tight leading-snug mt-1 text-neutral-900">
              {job.title}
            </h3>
          </div>
          <MatchBadge pct={job.match_pct || job.match_score} applied={applied} />
        </div>

        {/* Badges bar */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
            {job.work_arrangement || job.remote_policy || "Remote"}
          </span>
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
            {salaryRange(job.salary_min, job.salary_max)}
          </span>
        </div>

        {/* Match Rationale */}
        <div className="mt-3 rounded-md bg-neutral-50 border border-neutral-200 p-3 text-xs space-y-2">
          {matched.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {matched.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded bg-neutral-900 text-white px-2 py-0.5 text-[11px]"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {job.explanation && (
            <p className="text-neutral-600 text-xs leading-relaxed">
              {job.explanation}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
        {applied ? (
          <div className="flex items-center justify-between w-full text-xs">
            <span className="text-neutral-700 font-medium">
              Application submitted ({status || "In review"})
            </span>
            <Link
              href="/candidate/inbox"
              className="font-medium text-neutral-900 hover:underline flex items-center gap-1"
            >
              <span>Messages</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-end w-full">
            <button
              onClick={handleApply}
              disabled={applying}
              className="rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium px-3.5 py-1.5 transition-colors disabled:opacity-50"
            >
              {applying ? "Applying..." : "Apply"}
            </button>
          </div>
        )}
      </div>
      {err && <p className="text-red-600 text-xs mt-1">{err}</p>}
    </div>
  );
}
