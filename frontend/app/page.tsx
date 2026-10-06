"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const STEPS = [
  { n: "1", title: "Join the waitlist", desc: "Candidates drop a resume — we read it for you." },
  { n: "2", title: "Get your invite list", desc: "Everyone gets a link that admits 5 people." },
  { n: "3", title: "Companies find you", desc: "No applications. Employers reach out by email." },
] as const;

const CARDS = [
  { title: "Upload once", desc: "Your resume becomes your candidate profile." },
  { title: "Get matched", desc: "We rank jobs against your experience, skills, preferences and location." },
  { title: "Let companies reach out", desc: "Messages appear in 10Apply and your email. Reply from either place." },
] as const;

export default function Home() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { api("/waitlist/count").then((d) => setCount(d.total)).catch(() => {}); }, []);

  return (
    <div className="-mx-4 -mt-8">
      {/* Hero — waitlist first */}
      <section className="bg-neutral-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-24">
          <p className="text-xs font-bold tracking-[0.25em] text-neutral-400">
            10APPLY · {count != null && count > 0 ? `${count} WAITING` : "INVITE-ONLY"}
          </p>
          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Stop applying.
            <br />
            Get discovered.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-300">
            Upload your resume once and let companies come to you. No applications. No job boards.
            No endless scrolling. The app is members-only — the waitlist is how you get in.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/waitlist?role=candidate"
              className="rounded-2xl bg-sky-400 px-6 py-4 text-center font-bold text-neutral-950 transition hover:bg-sky-300"
            >
              <span className="block text-lg">Join as a Candidate →</span>
              <span className="block text-sm font-medium opacity-70">Drop your resume, you&apos;re listed</span>
            </Link>
            <Link
              href="/waitlist?role=employer"
              className="rounded-2xl bg-amber-300 px-6 py-4 text-center font-bold text-neutral-950 transition hover:bg-amber-200"
            >
              <span className="block text-lg">Join as an Employer →</span>
              <span className="block text-sm font-medium opacity-70">Hold your hiring spot</span>
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Already a member?{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-white">
              Log in
            </Link>
          </p>

          <div className="mx-auto mt-12 grid max-w-xl gap-2 text-left sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-neutral-950">
                  {s.n}
                </p>
                <p className="mt-2 text-sm font-bold">{s.title}</p>
                <p className="text-xs text-neutral-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="text-center text-3xl font-black tracking-tight">Upload once. You&apos;re done.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <div key={c.title} className="card">
              <p className="text-xs font-bold tracking-[0.2em] text-neutral-400">0{i + 1}</p>
              <h3 className="mt-1 text-lg font-black">{c.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/waitlist?role=candidate"
            className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-5 py-3 font-bold text-neutral-950 hover:bg-sky-300"
          >
            Join the waitlist
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border px-5 py-3 font-bold hover:bg-neutral-100"
          >
            Member login
          </Link>
        </div>
      </section>
    </div>
  );
}
