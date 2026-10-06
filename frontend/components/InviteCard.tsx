"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function InviteCard() {
  const [data, setData] = useState<{ code: string; used: number; limit: number; remaining: number; invited: string[]; invite_path: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/invites/me").then(setData).catch((e: any) => setErr(e.message));
  }, []);

  if (err) return <div className="card"><p className="text-sm text-red-600">{err}</p></div>;
  if (!data) return <div className="card"><p className="text-sm text-neutral-500">Loading your invite link…</p></div>;

  const url = typeof window !== "undefined" ? `${window.location.origin}${data.invite_path}` : data.invite_path;
  const slots = Array.from({ length: data.limit }, (_, i) => i < data.used);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="card">
      <p className="text-xs font-bold tracking-[0.2em] text-neutral-400">YOUR INVITE LINK</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight">
        Invite 5 people
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Your link works for the first {data.limit} people who join. Each of them gets their own link with {data.limit} invites.
      </p>

      <div className="mt-4 flex gap-2">
        <input className="input font-mono text-sm" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button onClick={copy} className="btn-primary shrink-0 !px-4">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">{data.used} / {data.limit} used</span>
          <span className="text-neutral-500">{data.remaining} left</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {slots.map((filled, i) => (
            <span key={i} className={`h-2.5 flex-1 rounded-full ${filled ? "bg-black" : "bg-neutral-200"}`} />
          ))}
        </div>
      </div>

      {data.invited.length > 0 ? (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-bold tracking-widest text-neutral-400">JOINED WITH YOUR LINK</p>
          <ul className="mt-2 space-y-1 text-sm">
            {data.invited.map((e) => (
              <li key={e} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  ✓
                </span>
                {e}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">No one has joined with your link yet — share it to grow your network.</p>
      )}
    </div>
  );
}
