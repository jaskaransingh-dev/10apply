"use client";
import Link from "next/link";

export default function SiteNav() {
  const btn = "rounded-xl px-4 py-2 text-sm font-bold transition";
  return (
    <nav className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-tight">Discovered</Link>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/waitlist" className={`${btn} bg-neutral-950 text-white hover:bg-neutral-800`}>
            Join the waitlist
          </Link>
        </div>
      </div>
    </nav>
  );
}
