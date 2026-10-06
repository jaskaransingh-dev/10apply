"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authUser, logout, token } from "@/lib/api";

export default function SiteNav() {
  const path = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  useEffect(() => {
    setLogged(!!token());
    setRole(authUser()?.role ?? null);
  }, [path]);

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`text-sm transition hover:text-white ${path === href ? "font-semibold text-white" : "text-white/70"}`}
    >
      {label}
    </Link>
  );

  if (logged && role === "candidate") {
    return (
      <nav className="sticky top-0 z-10 bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-3">
          <Link href="/candidate/jobs" className="text-lg font-black">10Apply</Link>
          {link("/candidate/jobs", "Matches")}
          {link("/candidate/inbox", "Inbox")}
          {link("/candidate/profile", "Profile")}
          {link("/candidate/invite", "Invite")}
          <button onClick={logout} className="ml-auto text-sm text-white/70 underline underline-offset-4 hover:text-white">
            Log out
          </button>
        </div>
      </nav>
    );
  }

  if (logged && role === "employer") {
    return (
      <nav className="sticky top-0 z-10 bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-3">
          <Link href="/employer" className="text-lg font-black">10Apply</Link>
          {link("/employer", "Dashboard")}
          {link("/employer/jobs/new", "Post a Job")}
          {link("/employer/inbox", "Inbox")}
          {link("/employer/invite", "Invite")}
          <button onClick={logout} className="ml-auto text-sm text-white/70 underline underline-offset-4 hover:text-white">
            Log out
          </button>
        </div>
      </nav>
    );
  }

  const btn = "rounded-xl px-4 py-2 text-sm font-bold transition";
  return (
    <nav className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-tight">10Apply</Link>
        <span className="ml-1 hidden rounded-full bg-neutral-950 px-2.5 py-1 text-[11px] font-bold tracking-widest text-white sm:inline">
          INVITE-ONLY
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/login" className={`${btn} border hover:bg-neutral-100`}>Log in</Link>
          <Link href="/signup?role=candidate" className={`${btn} bg-sky-400 text-neutral-950 hover:bg-sky-300`}>
            Candidate Sign Up
          </Link>
          <Link href="/signup?role=employer" className={`${btn} bg-neutral-950 text-white hover:bg-neutral-800`}>
            Employer Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
