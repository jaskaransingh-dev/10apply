"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authUser, logout, token } from "@/lib/api";
import { Briefcase, MessageSquare, User as UserIcon, LogOut, FileText, PlusCircle, Users } from "lucide-react";

export default function SiteNav() {
  const path = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [logged, setLogged] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setLogged(!!token());
    const u = authUser();
    setUser(u);
    setRole(u?.role ?? null);
    setAccountOpen(false);
  }, [path]);

  const navLink = (href: string, label: string, icon?: any) => {
    const active = path === href || (href !== "/" && path.startsWith(href));
    const Icon = icon;
    return (
      <Link
        key={href}
        href={href}
        className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 rounded-md ${
          active
            ? "bg-neutral-900 text-white"
            : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{label}</span>
      </Link>
    );
  };

  const BrandLogo = () => (
    <Link href={logged ? (role === "candidate" ? "/candidate/jobs" : "/employer") : "/"} className="flex items-center gap-2 mr-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white font-bold text-xs tracking-tight">
        r
      </div>
      <span className="text-sm font-semibold tracking-tight text-neutral-900">rec</span>
    </Link>
  );

  // Candidate Navigation: Jobs, Messages, Account
  if (logged && role === "candidate") {
    return (
      <nav className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <BrandLogo />
            <div className="flex items-center gap-1">
              {navLink("/candidate/jobs", "Applications", Briefcase)}
              {navLink("/candidate/upload", "Upload Resume", FileText)}
              {navLink("/candidate/inbox", "Messages", MessageSquare)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 px-2.5 py-1.5 rounded-md border border-neutral-200 hover:border-neutral-300 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">{user?.email?.split("@")[0] || "Account"}</span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-sm text-xs z-50">
                  <Link
                    href="/candidate/upload"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    <FileText className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Update Resume</span>
                  </Link>
                  <Link
                    href="/candidate/invite"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Invitations</span>
                  </Link>
                  <div className="my-1 border-t border-neutral-100" />
                  <button
                    onClick={() => { setAccountOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Recruiter Navigation: Candidates, Jobs, Messages
  if (logged && (role === "employer" || role === "recruiter")) {
    return (
      <nav className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <BrandLogo />
            <div className="flex items-center gap-1">
              {navLink("/employer", "Candidates", Users)}
              {navLink("/employer/jobs", "Jobs", Briefcase)}
              {navLink("/employer/inbox", "Messages", MessageSquare)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-neutral-400 truncate max-w-[160px]">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // Public / Logged out Navigation
  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <BrandLogo />
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/employer"
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-2.5 py-1.5 transition-colors"
          >
            For Recruiters
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:text-neutral-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  );
}
