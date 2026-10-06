import Link from "next/link";

function InviteStrip() {
  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border bg-white p-6 text-center shadow-sm">
      <p className="text-xs font-bold tracking-[0.2em] text-neutral-400">INVITE-ONLY</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight">You get 5 invites. They get 5 each.</h2>
      <p className="mt-2 text-sm text-neutral-500">
        Every member gets one personal link. It works for the first 5 people who join — then each of
        them gets their own link with 5 more invites.
      </p>
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-2 w-10 rounded-full bg-black" />
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold text-neutral-400">
        Every person you invite gets 5 invites of their own · no refills
      </p>
    </div>
  );
}

const STEPS = [
  { n: "1", title: "Upload Resume", desc: "Once. That's the whole application." },
  { n: "2", title: "We Match You", desc: "Your profile is ranked against live roles." },
  { n: "3", title: "Employers Contact You", desc: "By email and inbox. Reply from either." },
] as const;

const CARDS = [
  { title: "Upload once", desc: "Your resume becomes your candidate profile." },
  { title: "Get matched", desc: "We rank jobs against your experience, skills, preferences and location." },
  { title: "Let companies reach out", desc: "Messages appear in 10Apply and your email. Reply from either place." },
] as const;

export default function Home() {
  return (
    <div className="-mx-4 -mt-8">
      {/* Hero */}
      <section className="bg-neutral-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-24">
          <p className="text-xs font-bold tracking-[0.25em] text-neutral-400">
            10APPLY · INVITE-ONLY
          </p>
          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Upload once.
            <br />
            You&apos;re done.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-300">
            10Apply matches your resume with jobs and lets companies come to you. No applications.
            No job boards. No endless scrolling.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/signup?role=candidate"
              className="rounded-2xl bg-sky-400 px-6 py-4 text-center font-bold text-neutral-950 transition hover:bg-sky-300"
            >
              <span className="block text-lg">I&apos;m a Candidate →</span>
              <span className="block text-sm font-medium opacity-70">Upload resume, you&apos;re done</span>
            </Link>
            <Link
              href="/signup?role=employer"
              className="rounded-2xl bg-amber-300 px-6 py-4 text-center font-bold text-neutral-950 transition hover:bg-amber-200"
            >
              <span className="block text-lg">I&apos;m Hiring →</span>
              <span className="block text-sm font-medium opacity-70">Post a job today</span>
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Candidates join by invite. Employers can join freely.{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-white">
              Log in
            </Link>
          </p>

          {/* Three-step visual */}
          <div className="mx-auto mt-12 grid max-w-xl gap-2 text-left sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-neutral-950">
                  {s.n}
                </p>
                <p className="mt-2 text-sm font-bold">{s.title}</p>
                <p className="text-xs text-neutral-400">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 font-black text-neutral-600 sm:block">›</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stop applying. Start getting discovered. */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="text-center text-3xl font-black tracking-tight">Stop applying. Start getting discovered.</h2>
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
            href="/signup?role=candidate"
            className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-5 py-3 font-bold text-neutral-950 hover:bg-sky-300"
          >
            Candidate Sign Up
          </Link>
          <Link
            href="/signup?role=employer"
            className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 font-bold text-white hover:bg-neutral-800"
          >
            Employer Sign Up
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <InviteStrip />
      </section>
    </div>
  );
}
