"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function CountBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { api("/waitlist/count").then((d) => setCount(d.total)).catch(() => {}); }, []);
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-neutral-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      {count != null && count > 0 ? `${count} PEOPLE WAITING` : "INVITE-ONLY · MEMBERS ONLY"}
    </p>
  );
}

const STEPS = [
  { n: "01", title: "Join the waitlist", desc: "Candidates drop a resume — name, email and skills are read automatically. Employers hold a hiring spot in 30 seconds." },
  { n: "02", title: "Get your invite list", desc: "Everyone receives a personal link that admits 5 people. Each of them gets 5 invites of their own." },
  { n: "03", title: "Companies find you", desc: "Upload once and you're done. Employers reach out by email and inbox — reply from either place." },
] as const;

const THREAD = [
  { mine: false, who: "Acme AI · Backend Engineer", body: "Hi Alex — your Python/FastAPI background is exactly what we're hiring for. Open to a chat this week?" },
  { mine: true, who: "You", body: "Hi! Yes — Thursday afternoon works for me." },
  { mine: false, who: "Acme AI · Backend Engineer", body: "Perfect. Sending a calendar invite — talk Thursday." },
] as const;

export default function Home() {
  return (
    <div className="-mx-4 -mt-8">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:pt-24">
          <CountBadge />
          <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
            Stop applying.
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-white to-amber-200 bg-clip-text text-transparent">
              Get discovered.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-300">
            10Apply is a members-only hiring network. Upload your resume once — ranked companies
            come to you by email and inbox. No applications. No job boards. No scrolling.
          </p>
          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <Link
              href="/waitlist?role=candidate"
              className="group rounded-2xl bg-sky-400 px-6 py-5 text-left font-bold text-neutral-950 transition hover:bg-sky-300"
            >
              <span className="block text-xl">Join as a Candidate</span>
              <span className="block text-sm font-medium opacity-70">Drop your resume → get your invite list</span>
            </Link>
            <Link
              href="/waitlist?role=employer"
              className="group rounded-2xl border border-white/15 bg-white/5 px-6 py-5 text-left font-bold text-white transition hover:bg-white/10"
            >
              <span className="block text-xl">Join as an Employer</span>
              <span className="block text-sm font-medium text-neutral-400">Hold your spot → meet ranked candidates</span>
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-white underline underline-offset-4">Log in</Link>
          </p>

          {/* stat strip */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-2 text-center">
            {[["0", "applications, ever"], ["5", "invites per member"], ["2-way", "email + inbox"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-4">
                <p className="text-2xl font-black sm:text-3xl">{v}</p>
                <p className="text-xs text-neutral-400">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-center text-xs font-bold tracking-[0.25em] text-neutral-400">HOW IT WORKS</p>
        <h2 className="mt-2 text-center text-3xl font-black tracking-tight sm:text-4xl">Three steps. Then nothing.</h2>
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

      {/* ── Split ── */}
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 md:grid-cols-2">
        <div className="rounded-3xl bg-sky-950 p-8 text-white sm:p-10">
          <p className="text-xs font-bold tracking-[0.2em] text-sky-300">CANDIDATES</p>
          <h2 className="mt-2 text-3xl font-black leading-tight">Upload once.<br />You&apos;re done.</h2>
          <ul className="mt-4 space-y-2 text-sm text-sky-100/85">
            <li>✓ Resume becomes your profile — autofilled</li>
            <li>✓ Fresh matches every day, view-only</li>
            <li>✓ Outreach lands in inbox + email</li>
            <li>✓ Reply from either place</li>
          </ul>
          <Link href="/waitlist?role=candidate" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-sky-400 px-5 py-3 font-bold text-neutral-950 hover:bg-sky-300">
            Join the waitlist →
          </Link>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10">
          <p className="text-xs font-bold tracking-[0.2em] text-amber-600">EMPLOYERS</p>
          <h2 className="mt-2 text-3xl font-black leading-tight">Post a job.<br />Meet matches.</h2>
          <ul className="mt-4 space-y-2 text-sm text-neutral-600">
            <li>✓ Paste a JD — structured in seconds</li>
            <li>✓ Every candidate ranked by match</li>
            <li>✓ Message or invite to interview</li>
            <li>✓ Delivered to inbox + email</li>
          </ul>
          <Link href="/waitlist?role=employer" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 font-bold text-white hover:bg-neutral-800">
            Hold your spot →
          </Link>
        </div>
      </section>

      {/* ── Invite mechanic ── */}
      <section className="border-y bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-neutral-400">THE INVITE LOOP</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">You get 5. They get 5 each.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-500">
            Everyone on the waitlist receives a personal link. It admits 5 people — and every one of
            them gets 5 invites of their own.
          </p>
          <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-2 sm:gap-3">
            {[["You", "1"], ["→", ""], ["Invites", "5"], ["→", ""], ["Their invites", "25"], ["→", ""], ["Next wave", "125"]].map(([l, v], i) =>
              v === "" ? (
                <span key={i} className="font-black text-neutral-300">›</span>
              ) : (
                <div key={l} className={`rounded-2xl px-3 py-3 sm:px-5 ${i === 0 ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-neutral-50"}`}>
                  <p className="text-xl font-black sm:text-2xl">{v}</p>
                  <p className="whitespace-nowrap text-[11px] font-semibold opacity-70">{l}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Inbox preview ── */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">One conversation, everywhere.</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-neutral-500">
          Every message lives in the 10Apply inbox <b>and</b> in email. Reply from either — the thread stays in sync.
        </p>
        <div className="card mx-auto mt-8 max-w-lg !p-4">
          {THREAD.map((m, i) => (
            <div key={i} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`mb-2 max-w-[85%] rounded-2xl px-3.5 py-2.5 ${m.mine ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}>
                <p className={`text-[11px] font-bold ${m.mine ? "text-white/60" : "text-neutral-400"}`}>{m.who}</p>
                <p className="text-sm">{m.body}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 border-t pt-3">
            <div className="input text-sm text-neutral-400">Write a reply…</div>
            <div className="btn-primary shrink-0 !px-4 !py-2 text-sm">Send</div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link href="/waitlist" className="btn-primary !px-8 !py-4 text-lg">Join the waitlist →</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-8">
          <p className="text-lg font-black">10Apply</p>
          <p className="text-sm text-neutral-500">Members-only hiring. Upload once. You&apos;re done.</p>
          <div className="ml-auto flex gap-4 text-sm">
            <Link href="/waitlist" className="text-neutral-300 hover:text-white">Waitlist</Link>
            <Link href="/login" className="text-neutral-300 hover:text-white">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
