"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authUser, logout, token } from "@/lib/api";
import { ArrowRight, Plus } from "lucide-react";

export default function SiteNav() {
  const path = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    setLogged(!!token());
    const u = authUser();
    setUser(u);
    setRole(u?.role ?? null);
  }, [path]);

  // Suppress standalone landing page header redundancy if already rendered inline
  // Only render SiteNav on app pages (/candidate/*, /employer/*) or fallback
  const isDedicatedLanding = path === "/" || path === "/join" || path === "/login" || path.startsWith("/recruiter");
  if (!logged && isDedicatedLanding) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">
        {/* Left: Just rec */}
        <Link href={logged ? (role === "candidate" ? "/candidate/jobs" : "/employer") : "/"} className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
            rec
          </span>
        </Link>

        {/* Right: Join with Invite & Recruiters */}
        <div className="flex items-center gap-5 text-sm">
          {logged && (role === "employer" || role === "recruiter") ? (
            <>
              <Link
                href="/employer/jobs/new"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Job</span>
              </Link>
              <Link
                href="/employer"
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Candidates
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/recruiters/waitlist"
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Recruiters
              </Link>
              <Link
                href="/join?code=REC-UNLIMITED"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center gap-1.5"
              >
                <span>Join with Invite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}

          {logged ? (
            <button
              onClick={logout}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
