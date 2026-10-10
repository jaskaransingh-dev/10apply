"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRecruiterJobs, salaryRange } from "@/lib/api";
import { Briefcase, Plus, Users, MapPin, DollarSign, Clock } from "lucide-react";

export default function RecruiterJobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecruiterJobs();
      setJobs(res.jobs || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
            Job Postings
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Active and draft openings for your company. Candidates are automatically matched upon publication.
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Post New Job</span>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-400">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white border border-neutral-200 rounded-lg p-8">
          <Briefcase className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-800">No jobs posted yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Create your first job posting to start matching with qualified candidates from our resume database.
          </p>
          <Link
            href="/employer/jobs/new"
            className="inline-block mt-2 px-3.5 py-1.5 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800 transition-colors"
          >
            Create Job Opening
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-lg p-5 transition-all shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-neutral-900">
                      {job.title}
                    </h3>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                      {job.status}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-neutral-700">{job.company}</span>
                    <span>·</span>
                    <span>{job.remote_policy}</span>
                    <span>·</span>
                    <span>{salaryRange(job.salary_min, job.salary_max)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/employer?job_id=${job.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>View Candidates ({job.matches_count || 0})</span>
                  </Link>
                </div>
              </div>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-neutral-400 mr-1 self-center">Required:</span>
                  {job.required_skills.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-neutral-100 text-neutral-800 rounded text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
