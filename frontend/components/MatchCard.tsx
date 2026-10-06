import MatchBadge from "./MatchBadge";
import { salaryRange } from "@/lib/api";

export default function MatchCard({ job }: { job: any }) {
  const matched: string[] = job.matched_skills || [];
  const missing: string[] = (job.required_skills || []).filter((s: string) => !matched.includes(s)).slice(0, 4);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{job.company}</p>
          <p className="text-lg font-semibold leading-snug">{job.title}</p>
          <p className="text-sm text-neutral-500">{job.location} · {job.work_arrangement}</p>
        </div>
        <MatchBadge pct={job.match_pct} />
      </div>
      <p className="mt-2 font-semibold">{salaryRange(job.salary_min, job.salary_max)}</p>

      <details className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-bold">Why this match?</summary>
        <div className="mt-2 space-y-1.5">
          {matched.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {matched.map((s) => (
                <span key={s} className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">✓ {s}</span>
              ))}
            </div>
          )}
          {missing.length > 0 && (
            <p className="text-neutral-500">Also wanted: {missing.join(" · ")}</p>
          )}
          <p className="text-neutral-600">{job.match_reason}</p>
        </div>
      </details>

      <p className="mt-2 text-sm text-neutral-500">{job.summary}</p>
      <p className="mt-2 text-xs font-semibold text-neutral-400">This company hasn&apos;t contacted you — yet.</p>
    </div>
  );
}
