"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Pill } from "@/components/ui";

const CATEGORIES = ["all", "tax", "formation", "insurance", "notary", "bookkeeping", "general", "faq"];

export default function KnowledgeBasePanel() {
  const [articles, setArticles] = useState<any[]>([]);
  const [category, setCategory] = useState("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/knowledge-base?category=${category}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setArticles(data.articles || []);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  async function saveArticle() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, content, category: newCategory }),
    });
    if (res.ok) {
      setTitle("");
      setContent("");
      setNewCategory("general");
      await load();
    }
    setSaving(false);
  }

  async function archiveArticle(id: string) {
    await fetch("/api/admin/knowledge-base", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-ink">Knowledge Base</h1>
        <p className="text-xs text-muted mt-1">Staff-maintained answers for client support and AI concierge grounding.</p>
      </div>
      <Card className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Article title" className="border border-border rounded-xl px-3 py-2 text-sm" />
          <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm">
            {CATEGORIES.filter((item) => item !== "all").map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Article content" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-28" />
        <button disabled={saving} onClick={saveArticle} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold">{saving ? "Saving..." : "Add Article"}</button>
      </Card>
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((item) => (
          <button key={item} onClick={() => setCategory(item)} className={`px-3 py-1 rounded-full text-xs font-bold border ${category === item ? "bg-[#0B4DA2] text-white border-[#0B4DA2]" : "bg-white text-muted border-border"}`}>
            {item}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {loading ? <p className="text-sm text-muted">Loading articles...</p> : articles.length === 0 ? <Card><p className="text-sm text-muted">No articles yet.</p></Card> : articles.map((article) => (
          <Card key={article.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black text-ink">{article.title}</div>
                <Pill tone="gray">{article.category || "general"}</Pill>
              </div>
              <button onClick={() => archiveArticle(article.id)} className="text-xs font-bold text-red-600">Archive</button>
            </div>
            <p className="text-sm text-muted whitespace-pre-wrap">{article.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
