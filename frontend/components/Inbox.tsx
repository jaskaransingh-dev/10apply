"use client";
import { useEffect, useState, useRef } from "react";
import { getConversations, getConversationMessages, sendConversationMessage } from "@/lib/api";
import { MessageSquare, Send, CheckCheck, Check, Clock } from "lucide-react";

export default function Inbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getConversations();
      const list = res.conversations || [];
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await getConversationMessages(convId);
      setMessages(res.messages || []);
    } catch {
      // Ignored
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !draft.trim() || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");
    try {
      await sendConversationMessage(activeConvId, content);
      await loadMessages(activeConvId);
      // update conversation list snippet
      setConversations(conversations.map(c => c.id === activeConvId ? { ...c, last_message: content, last_message_at: new Date().toISOString() } : c));
    } catch (err: any) {
      alert(err?.message || "Failed to send message.");
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  if (loading) {
    return <div className="py-16 text-center text-xs text-neutral-400">Loading messages...</div>;
  }

  if (error) {
    return (
      <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
        {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-10 text-center space-y-3 max-w-md mx-auto">
        <MessageSquare className="w-8 h-8 text-neutral-400 mx-auto" />
        <h3 className="text-base font-semibold text-neutral-900">No active conversations</h3>
        <p className="text-xs text-neutral-500 leading-relaxed">
          When recruiters review your resume and reach out, your messages and interview invitations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] border border-neutral-200 rounded-lg bg-white overflow-hidden min-h-[520px]">
      {/* Conversation Thread Sidebar */}
      <div className="border-r border-neutral-200 bg-neutral-50/50 flex flex-col">
        <div className="p-3 border-b border-neutral-200 text-xs font-semibold text-neutral-900 uppercase tracking-wider">
          Conversations
        </div>
        <div className="divide-y divide-neutral-100 overflow-y-auto flex-1">
          {conversations.map((c) => {
            const isSelected = c.id === activeConvId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                  isSelected ? "bg-white border-l-2 border-neutral-900 shadow-sm" : "hover:bg-neutral-100/60"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="font-semibold text-xs text-neutral-900 truncate">
                    {c.company_name || c.candidate_name}
                  </div>
                  {c.unread_count > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                  {c.job_title}
                </div>
                <p className="text-xs text-neutral-600 truncate mt-1">
                  {c.last_message || "No messages yet"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Chat Pane */}
      <div className="flex flex-col flex-1 bg-white">
        {activeConv ? (
          <>
            {/* Thread Header */}
            <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-semibold text-sm text-neutral-900">
                  {activeConv.company_name || activeConv.candidate_name}
                </h3>
                <div className="text-xs text-neutral-500">
                  Regarding: <span className="text-neutral-700 font-medium">{activeConv.job_title}</span>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-neutral-50/30">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                      m.mine
                        ? "bg-neutral-900 text-white rounded-br-none"
                        : "bg-white border border-neutral-200 text-neutral-900 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.content}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        m.mine ? "text-neutral-400" : "text-neutral-400"
                      }`}
                    >
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {m.mine && (
                        m.is_read ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Check className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSend} className="p-3 border-t border-neutral-200 flex items-center gap-2 bg-white">
              <input
                type="text"
                placeholder="Type your message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 bg-white"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
            Select a conversation to begin reading
          </div>
        )}
      </div>
    </div>
  );
}
