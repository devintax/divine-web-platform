"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

interface Message { id: string; role: string; content: string; created_at: string; }

const QUICK_REPLIES = [
  { label: "Business Formation", icon: "🏛", value: "I need to form a business" },
  { label: "Tax Preparation", icon: "🧾", value: "Tax preparation help" },
  { label: "Auto Insurance", icon: "🚗", value: "Auto insurance quote" },
  { label: "Notary Services", icon: "✍️", value: "Notary services needed" },
  { label: "Bookkeeping", icon: "📊", value: "Monthly bookkeeping" },
  { label: "Check Status", icon: "📁", value: "What is my application status?" },
  { label: "Speak to Human", icon: "👤", value: "I want to speak to a human agent" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/chat/message", { credentials: "include" })
      .then(r => r.json())
      .then(d => setMessages(d.messages || []))
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    const userMsg: Message = { id: "tmp-" + Date.now(), role: "user", content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setTyping(true);
    try {
      await new Promise(r => setTimeout(r, 800)); // typing delay
      const res = await fetch("/api/chat/message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const botMsg: Message = { id: "bot-" + Date.now(), role: "bot", content: data.reply, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, botMsg]);
      if (data.offHours) toast.info("Our office is closed. We'll respond next business morning.");
    } catch (e: any) {
      toast.error(e.message || "Could not send message");
    }
    setTyping(false);
    setSending(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] md:h-[calc(100dvh-3rem)] -mx-4 md:-mx-0 md:max-w-3xl md:mx-auto">
      <Card className="flex flex-col flex-1 overflow-hidden !p-0 mx-4 md:mx-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-white">
          <div className="w-8 h-8 rounded-full bg-[#0B4DA2] text-white grid place-items-center text-sm font-black">D</div>
          <div className="flex-1">
            <div className="text-sm font-black text-ink">Divine Assistant</div>
            <div className="text-[10px] text-green-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-soft">
          {messages.length === 0 && (
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%] text-sm text-ink shadow-sm">
              👋 Hi! I&apos;m the Divine Financial Group assistant. How can I help you today? Pick a topic below or just type your question.
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "bg-[#0B4DA2] text-white rounded-2xl rounded-br-sm"
                  : "bg-white text-ink rounded-2xl rounded-bl-sm"
              }`}>{m.content}</div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0.15s" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0.3s" }}></span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-white px-3 py-2 overflow-x-auto">
          <div className="flex gap-2">
            {QUICK_REPLIES.map(q => (
              <button key={q.label} onClick={() => send(q.value)} disabled={sending}
                className="whitespace-nowrap px-3 h-8 rounded-full text-xs font-bold border border-border bg-white text-muted hover:bg-soft transition-colors">
                {q.icon} {q.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border bg-white px-3 py-3 flex gap-2 items-end" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about our services, check your status..."
            rows={1}
            className="flex-1 resize-none border border-border rounded-2xl px-4 py-2.5 text-base focus:outline-none focus:border-[#0B4DA2] max-h-[120px]"
          />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#0B4DA2] text-white grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#083a7a] transition-colors flex-shrink-0"
            aria-label="Send message">
            ➤
          </button>
        </form>
      </Card>
    </div>
  );
}
