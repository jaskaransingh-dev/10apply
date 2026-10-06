"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const STEPS = [
  { n: "01", title: "Join the waitlist", desc: "Candidates drop a resume — name, email and skills are read automatically. Employers hold a spot in 30 seconds." },
  { n: "02", title: "Get your invite", desc: "Spots open in order. Your personal invite arrives by email — no applications, no portals." },
  { n: "03", title: "Companies find you", desc: "Upload once and you're done. Employers reach out by email and inbox — reply from either place." },
] as const;

export default function Home() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { api("/waitlist/count").then((d) => setCount(d.total)).catch(() => {}); }, []);

  return (
    <div className="-mx-4 -mt-8">
      {/* Hero */}
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-16 text-center sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-neutral-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {count != null && count > 0 ? `${count} PEOPLE WAITING` : "MEMBERS ONLY"}
          </p>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
            Stop applying.
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-white to-amber-200 bg-clip-text text-transparent">
              Get discovered.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-300">
            Discovered is a members-only hiring network. Upload your resume once — ranked companies
            come to you. The waitlist is the only way in.
          </p>
          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <Link
              href="/waitlist?role=candidate"
              className="rounded-2xl bg-sky-400 px-6 py-5 text-left font-bold text-neutral-950 transition hover:bg-sky-300"
            >
              <span className="block text-xl">I&apos;m a Candidate</span>
              <span className="block text-sm font-medium opacity-70">Drop your resume → hold your spot</span>
            </Link>
            <Link
              href="/waitlist?role=employer"
              className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5 text-left font-bold text-white transition hover:bg-white/10"
            >
              <span className="block text-xl">I&apos;m Hiring</span>
              <span className="block text-sm font-medium text-neutral-400">Tell us the role → meet matches</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">Three steps. Then nothing.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card !p-6">
              <p className="text-4xl font-black text-neutral-200">{s.n}</p>
              <h3 className="mt-2 text-xl font-black">{s.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Split */}
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 md:grid-cols-2">
        <div className="rounded-3xl bg-sky-950 p-8 text-white sm:p-10">
          <p className="text-xs font-bold tracking-[0.2em] text-sky-300">CANDIDATES</p>
          <h2 className="mt-2 text-3xl font-black leading-tight">Upload once.<br />You&apos;re done.</h2>
          <p className="mt-3 text-sm text-sky-100/85">Your resume becomes your profile. Matches refresh daily. Outreach arrives by email.</p>
          <Link href="/waitlist?role=candidate" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-sky-400 px-5 py-3 font-bold text-neutral-950 hover:bg-sky-300">
            Join the waitlist →
          </Link>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10">
          <p className="text-xs font-bold tracking-[0.2em] text-amber-600">EMPLOYERS</p>
          <h2 className="mt-2 text-3xl font-black leading-tight">Post a job.<br />Meet matches.</h2>
          <p className="mt-3 text-sm text-neutral-500">Paste a JD, get a ranked shortlist, message candidates by inbox + email.</p>
          <Link href="/waitlist?role=employer" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 font-bold text-white hover:bg-neutral-800">
            Hold your spot →
          </Link>
        </div>
        <div className="md:col-span-2">
          <Link href="/waitlist" className="btn-primary w-full !px-8 !py-4 text-lg">Join the waitlist →</Link>
        </div>
      </section>

      <footer className="bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-8">
          <p className="text-lg font-black">Discovered</p>
          <p className="text-sm text-neutral-500">Members-only hiring. Upload once. You&apos;re done.</p>
          <div className="ml-auto">
            <Link href="/waitlist" className="text-sm text-neutral-300 hover:text-white">Waitlist</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
