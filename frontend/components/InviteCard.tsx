"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, Copy, Check, XCircle } from "lucide-react";

interface InviteItem {
  id: string;
  token: string;
  recipient_email: string;
  status: string;
  created_at: string;
  accepted_at?: string;
}

interface InviteStats {
  limit: number;
  accepted: number;
  pending: number;
  remaining: number;
  invitations: InviteItem[];
}

export default function InviteCard() {
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [recipient, setRecipient] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadInvites() {
    try {
      const data = await api("/invitations/my");
      setStats(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load invitations.");
    }
  }

  useEffect(() => {
    loadInvites();
  }, []);

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr("");
    setSuccessMsg("");
    try {
      await api("/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_email: recipient.trim() }),
      });
      await loadInvites();
      setRecipient("");
      setSuccessMsg("Single-use invitation generated.");
    } catch (e: any) {
      setErr(e.message || "Failed to create invitation.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/join?code=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  }

  if (!stats) {
    return <div className="text-xs text-neutral-400 py-6 text-center">Loading invitations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border border-neutral-200 bg-white rounded-lg p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
            Candidate Invitations
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Every candidate receives five single-use invitation links. Your balance decrements only when a new candidate successfully registers.
          </p>
        </div>

        {/* Balance Metric Card */}
        <div className="rounded-md bg-neutral-50 border border-neutral-200 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-neutral-700">
              {stats.accepted} accepted · {stats.pending} pending
            </span>
            <span className="font-semibold text-neutral-900">
              {stats.remaining} of {stats.limit} remaining
            </span>
          </div>

          <div className="flex gap-1.5 h-1.5 w-full">
            {Array.from({ length: stats.limit }).map((_, i) => {
              const isAccepted = i < stats.accepted;
              const isPending = i >= stats.accepted && i < stats.accepted + stats.pending;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${
                    isAccepted ? "bg-neutral-900" : isPending ? "bg-neutral-400" : "bg-neutral-200"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {err && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {err}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-neutral-100 rounded text-xs text-neutral-800">
            {successMsg}
          </div>
        )}

        {/* Generate Invite Form */}
        {stats.remaining > 0 ? (
          <form onSubmit={handleCreateInvite} className="space-y-2 border-t border-neutral-100 pt-4">
            <label className="block text-xs font-medium text-neutral-700">Generate single-use invitation</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Recipient email (optional)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-900"
              />
              <button
                type="submit"
                disabled={creating}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium disabled:opacity-50"
              >
                {creating ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100">
            All 5 invitation slots have been generated or used.
          </div>
        )}
      </div>

      {/* Invitations List */}
      <div className="border border-neutral-200 bg-white rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-sm text-neutral-900">Your Invitation Tokens</h3>
        {stats.invitations && stats.invitations.length > 0 ? (
          <div className="space-y-2">
            {stats.invitations.map((inv) => (
              <div
                key={inv.id}
                className="border border-neutral-200 rounded-md p-3 flex items-center justify-between gap-3 text-xs bg-neutral-50/50"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-neutral-900">{inv.token}</span>
                    <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                      {inv.status}
                    </span>
                  </div>
                  {inv.recipient_email && (
                    <div className="text-neutral-500 text-[11px]">Intended: {inv.recipient_email}</div>
                  )}
                </div>

                {inv.status === "pending" && (
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-800 rounded text-xs font-medium"
                  >
                    {copiedToken === inv.token ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-400" />}
                    <span>{copiedToken === inv.token ? "Copied" : "Copy"}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">No invitation tokens generated yet.</p>
        )}
      </div>
    </div>
  );
}
