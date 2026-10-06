"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Msg = {
  id: string; mine: boolean; body: string; created_at: string;
  other_id: string; other_email: string; job_id: string | null; job_title: string; job_company: string;
};

function threadTitle(m: Msg): string {
  const who = m.job_company || m.other_email || "Conversation";
  return m.job_title ? `${who} · ${m.job_title}` : who;
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Inbox() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const d = await api("/messages");
      setMsgs(d.messages || []);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const convos = useMemo(() => {
    const map = new Map<string, Msg[]>();
    for (const m of msgs) {
      const key = `${m.other_id}|${m.job_id || ""}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()]
      .map(([key, list]) => {
        const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { key, thread: sorted, last: sorted[sorted.length - 1] };
      })
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [msgs]);

  useEffect(() => {
    if (sel == null && convos.length > 0) setSel(convos[0].key);
  }, [convos, sel]);

  const active = convos.find((c) => c.key === sel);

  async function send() {
    if (!active || !draft.trim()) return;
    setSending(true);
    try {
      await api("/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: active.last.other_id, job_id: active.last.job_id, body: draft.trim() }),
      });
      setDraft("");
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setSending(false); }
  }

  if (err) return <div className="card"><p className="text-sm text-red-600">{err}</p></div>;
  if (convos.length === 0)
    return (
      <div className="card mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-black tracking-tight">Inbox</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Nothing yet. When someone reaches out, it lands here — and in your email. Replies go back
          the same way, so the conversation keeps going in both places.
        </p>
      </div>
    );

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        {convos.map((c) => (
          <button
            key={c.key}
            onClick={() => setSel(c.key)}
            className={`w-full rounded-2xl border p-3 text-left transition ${
              c.key === sel ? "border-black bg-white shadow-sm" : "border-neutral-200 bg-white/60 hover:bg-white"
            }`}
          >
            <p className="truncate text-sm font-bold">{threadTitle(c.last)}</p>
            <p className="truncate text-xs text-neutral-500">{c.last.other_email}</p>
            <p className="mt-1 truncate text-xs text-neutral-500">
              {c.last.mine ? "You: " : ""}{c.last.body}
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">{timeAgo(c.last.created_at)}</p>
          </button>
        ))}
      </div>

      <div className="card flex min-h-[420px] flex-col">
        {active ? (
          <>
            <div className="border-b pb-3">
              <p className="font-bold">{threadTitle(active.last)}</p>
              <p className="text-sm text-neutral-500">{active.last.other_email}</p>
              <p className="text-xs text-neutral-400">Replies also go out by email — back and forth, both places.</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto py-4">
              {active.thread.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}>
                    {m.body}
                    <span className={`mt-1 block text-[11px] ${m.mine ? "text-white/60" : "text-neutral-400"}`}>{timeAgo(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t pt-3">
              <input
                className="input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Write a reply…"
              />
              <button onClick={send} disabled={sending || !draft.trim()} className="btn-primary shrink-0 disabled:opacity-40">
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-500">Select a conversation.</p>
        )}
      </div>
    </div>
  );
}
