"use client";

import { Megaphone, MessageSquarePlus, Search, Send, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Profile = {
  id: string;
  legal_name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

type Conversation = {
  id: string;
  type: "direct" | "group" | "broadcast" | "case";
  title: string;
  preview?: string;
  unreadCount?: number;
  participants?: Array<{ user_id: string; profile?: Profile | null }>;
  lastMessage?: { body?: string; created_at?: string } | null;
};

type Message = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  is_deleted?: boolean;
  sender?: Profile | null;
};

const BROADCAST_AUDIENCES = [
  { value: "all_clients", label: "All clients" },
  { value: "all_staff", label: "All staff" },
  { value: "tax_clients", label: "Tax clients" },
  { value: "formation_clients", label: "Formation clients" },
  { value: "insurance_clients", label: "Insurance clients" },
  { value: "notary_clients", label: "Notary clients" },
  { value: "bookkeeping_clients", label: "Bookkeeping clients" },
];

export function ConversationInbox({ staffMode = false }: { staffMode?: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Array<{ user_id: string; profile?: Profile | null }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [sending, setSending] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const toast = useToast();
  const toastRef = useRef(toast);
  const errorToastShownRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => conversations.find((item) => item.id === activeId) || null, [conversations, activeId]);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCurrentUserId(data.id || null))
      .catch(() => setCurrentUserId(null));
  }, []);

  const loadConversations = useCallback(async (selectFirst = true) => {
    try {
      const res = await fetch("/api/conversations", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load conversations");
      setConversations(data.conversations || []);
      setLoadError(null);
      setPollingPaused(false);
      errorToastShownRef.current = false;
      if (selectFirst && !activeId && data.conversations?.[0]?.id) setActiveId(data.conversations[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load conversations";
      setLoadError(message);
      setPollingPaused(true);
      if (!errorToastShownRef.current) {
        toastRef.current.error(message);
        errorToastShownRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  const loadMessages = useCallback(async (conversationId: string, showErrors = true) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load messages");
      setMessages(data.messages || []);
      setParticipants(data.participants || []);
      setConversations((prev) => prev.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
    } catch (error) {
      if (showErrors) toastRef.current.error(error instanceof Error ? error.message : "Could not load messages");
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (pollingPaused) return;
    const timer = setInterval(() => {
      void loadConversations(false);
      if (activeId) void loadMessages(activeId, false);
    }, 10000);
    return () => clearInterval(timer);
  }, [activeId, loadConversations, loadMessages, pollingPaused]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send message");
      setInput("");
      await loadMessages(activeId, false);
      await loadConversations(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {staffMode && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-ink">Secure Messages</h1>
            <p className="text-sm text-muted mt-1">Direct, group, and broadcast conversations outside a service case.</p>
          </div>
          <button
            onClick={() => setShowComposer((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B4DA2] px-4 py-3 text-sm font-black text-white hover:bg-[#083a7a]"
          >
            <MessageSquarePlus size={17} />
            New Message
          </button>
        </div>
      )}

      {staffMode && showComposer && <ConversationComposer onCreated={(id) => { setShowComposer(false); setActiveId(id); void loadConversations(false); }} />}

      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-border bg-white lg:grid-cols-[310px_1fr]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-black text-ink">Inbox</div>
            <div className="text-xs text-muted">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</div>
          </div>
          <div className="max-h-[260px] overflow-y-auto lg:max-h-[560px]">
            {loading ? (
              <div className="p-4 text-sm text-muted">Loading conversations...</div>
            ) : loadError ? (
              <div className="p-5">
                <div className="text-sm font-black text-red-700">Messages unavailable</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{loadError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoadError(null);
                    setPollingPaused(false);
                    errorToastShownRef.current = false;
                    setLoading(true);
                    void loadConversations();
                  }}
                  className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-black text-[#0B4DA2] hover:bg-blue-50"
                >
                  Retry
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-5 text-sm text-muted">No secure conversations yet.</div>
            ) : conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                className={`block w-full border-b border-border px-4 py-3 text-left transition-colors ${activeId === conversation.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-ink">{conversation.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted">{conversation.preview || labelForType(conversation.type)}</div>
                  </div>
                  {!!conversation.unreadCount && (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#C8102E] px-2 text-[10px] font-black text-white">{conversation.unreadCount}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col">
          {active ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <ConversationIcon type={active.type} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-ink">{active.title}</div>
                    <div className="truncate text-xs text-muted">{participantSummary(participants)}</div>
                  </div>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-soft p-4">
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted">No messages in this thread yet.</div>
                ) : messages.map((message) => {
                  const mine = message.sender_id === currentUserId;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${mine ? "rounded-br-sm bg-[#0B4DA2] text-white" : "rounded-bl-sm bg-white text-ink"}`}>
                        {!mine && <div className="mb-1 text-[10px] font-black uppercase text-muted">{message.sender?.legal_name || message.sender?.email || "DFG"}</div>}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.is_deleted ? "This message was deleted." : message.body}</div>
                        <div className={`mt-2 text-[10px] ${mine ? "text-blue-100" : "text-muted"}`}>{new Date(message.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-border bg-white p-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(event);
                    }
                  }}
                  placeholder="Write a secure message..."
                  rows={1}
                  className="min-h-11 flex-1 resize-none rounded-xl border border-border px-4 py-3 text-sm focus:border-[#0B4DA2] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[#0B4DA2] text-white hover:bg-[#083a7a] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <MessageSquarePlus className="mx-auto h-10 w-10 text-muted" />
                <div className="mt-3 text-sm font-black text-ink">Select a conversation</div>
                <div className="mt-1 text-sm text-muted">Messages outside case work will appear here.</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ConversationComposer({ onCreated }: { onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<"direct" | "group" | "broadcast">("direct");
  const [query, setQuery] = useState("");
  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("all_clients");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (mode === "broadcast") return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conversations/recipients?q=${encodeURIComponent(query)}`, { credentials: "include" });
        const data = await res.json();
        if (res.ok) setRecipients(data.recipients || []);
      } catch {
        setRecipients([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, mode]);

  function toggleRecipient(profile: Profile) {
    setSelected((prev) => prev.some((item) => item.id === profile.id)
      ? prev.filter((item) => item.id !== profile.id)
      : [...prev, profile]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          title,
          audience,
          participantIds: selected.map((item) => item.id),
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create conversation");
      toast.success(mode === "broadcast" ? `Broadcast queued for ${data.recipientCount || 0} recipients.` : "Conversation created.");
      onCreated(data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create conversation");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {(["direct", "group", "broadcast"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-full px-3 py-2 text-xs font-black capitalize ${mode === item ? "bg-[#0B4DA2] text-white" : "bg-slate-100 text-muted"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {mode !== "direct" && (
          <label className="block">
            <span className="text-xs font-black uppercase text-muted">Thread title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Monthly document reminder" />
          </label>
        )}
        {mode === "broadcast" ? (
          <label className="block">
            <span className="text-xs font-black uppercase text-muted">Audience</span>
            <select value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm">
              {BROADCAST_AUDIENCES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        ) : (
          <div className={mode === "direct" ? "lg:col-span-2" : ""}>
            <label className="block">
              <span className="text-xs font-black uppercase text-muted">Recipients</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                <Search size={15} className="text-muted" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="flex-1 text-sm outline-none" placeholder="Search by client or staff name" />
              </div>
            </label>
            {!!selected.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.map((item) => (
                  <button key={item.id} type="button" onClick={() => toggleRecipient(item)} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#0B4DA2]">
                    {item.legal_name || item.email} x
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-border">
              {recipients.map((item) => (
                <button key={item.id} type="button" onClick={() => toggleRecipient(item)} className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-slate-50">
                  <span>
                    <span className="block text-sm font-bold text-ink">{item.legal_name || item.email}</span>
                    <span className="block text-xs text-muted">{item.email} - {item.role}</span>
                  </span>
                  <span className="text-xs font-black text-[#0B4DA2]">{selected.some((selectedItem) => selectedItem.id === item.id) ? "Selected" : "Add"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-black uppercase text-muted">Message</span>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm" placeholder="Write the first message..." />
      </label>
      <div className="mt-3 flex justify-end">
        <button disabled={sending || !message.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#0B4DA2] px-4 py-3 text-sm font-black text-white hover:bg-[#083a7a] disabled:cursor-not-allowed disabled:opacity-40">
          <Send size={16} />
          Send
        </button>
      </div>
    </form>
  );
}

function ConversationIcon({ type }: { type: Conversation["type"] }) {
  if (type === "broadcast") return <Megaphone className="h-8 w-8 rounded-full bg-red-50 p-2 text-[#C8102E]" />;
  if (type === "group") return <UsersRound className="h-8 w-8 rounded-full bg-blue-50 p-2 text-[#0B4DA2]" />;
  return <MessageSquarePlus className="h-8 w-8 rounded-full bg-blue-50 p-2 text-[#0B4DA2]" />;
}

function labelForType(type: Conversation["type"]) {
  if (type === "broadcast") return "Broadcast announcement";
  if (type === "group") return "Group conversation";
  if (type === "case") return "Case conversation";
  return "Direct conversation";
}

function participantSummary(participants: Array<{ profile?: Profile | null }>) {
  if (!participants.length) return "No participants";
  return participants.map((participant) => participant.profile?.legal_name || participant.profile?.email || "Unknown").join(", ");
}
