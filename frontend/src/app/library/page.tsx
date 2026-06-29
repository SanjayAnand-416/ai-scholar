"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs, type Document, type DocumentStatus } from "@/lib/docs-store";
import { api } from "@/lib/api";
import { Search, FileText, Trash2, Inbox, Plus, MessageSquare, Loader } from "lucide-react";

const STATUS_COLORS: Record<DocumentStatus, [string, string]> = {
  uploaded:   ["var(--status-uploaded)",   "var(--status-uploaded-bg)"],
  processing: ["var(--status-processing)", "var(--status-processing-bg)"],
  ready:      ["var(--status-ready)",      "var(--status-ready-bg)"],
  failed:     ["var(--status-failed)",     "var(--status-failed-bg)"],
  deleted:    ["var(--text-muted)",        "var(--line-soft)"],
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded:   "Queued",
  processing: "Processing",
  ready:      "Ready",
  failed:     "Failed",
  deleted:    "Deleted",
};

function fmt(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCard({
  doc,
  onDelete,
  onChat,
  chatting,
}: {
  doc: Document;
  onDelete: (id: string) => void;
  onChat: (id: string) => void;
  chatting: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [fc, bg] = STATUS_COLORS[doc.status];
  const spinning = doc.status === "processing" || doc.status === "uploaded";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface-card)", border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)", padding: "20px",
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all var(--dur-base) var(--ease-standard)",
        display: "flex", flexDirection: "column", gap: 14,
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: 100, borderRadius: "var(--radius-md)", background: "var(--gradient-card)", border: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", color: "var(--indigo-200)" }}>
        <FileText size={32} strokeWidth={1.5} />
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: bg, color: fc, borderRadius: "var(--radius-pill)", fontSize: 11, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: fc, animation: spinning ? "aisch-pulse 1.5s ease infinite" : "none" }} />
            {STATUS_LABELS[doc.status]}
          </span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)", marginBottom: 5, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
          {doc.title ?? doc.original_file_name}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }}>
          {fmt(doc.file_size_bytes)}{doc.total_pages ? ` · ${doc.total_pages} pp` : ""}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={doc.status !== "ready" || chatting}
          onClick={() => onChat(doc.id)}
          style={{
            flex: 1, height: 34, border: "none",
            borderRadius: "var(--radius-sm)",
            background: doc.status === "ready" ? "var(--gradient-primary)" : "var(--line-soft)",
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
            color: doc.status === "ready" ? "#fff" : "var(--text-muted)",
            cursor: doc.status === "ready" && !chatting ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: doc.status === "ready" ? "0 4px 10px rgba(99,102,241,0.25)" : "none",
            transition: "all var(--dur-base)",
          }}
        >
          {chatting ? <Loader size={13} strokeWidth={2} style={{ animation: "aisch-spin 0.7s linear infinite" }} /> : <MessageSquare size={13} strokeWidth={2} />}
          {chatting ? "Opening…" : "Chat"}
        </button>
        <button onClick={() => onDelete(doc.id)} style={{ width: 34, height: 34, border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--bg-app)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--status-failed)" }}>
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

const STATUSES: Array<DocumentStatus | "all"> = ["all", "ready", "processing", "failed"];

export default function LibraryPage() {
  const router = useRouter();
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs, loading: docsLoading, removeDoc } = useDocs(accessToken);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<DocumentStatus | "all">("all");
  const [sort, setSort] = useState("newest");
  const [chattingId, setChattingId] = useState<string | null>(null);

  async function handleChat(documentId: string) {
    if (!accessToken) return;
    setChattingId(documentId);
    try {
      const conv = await api.createConversation(accessToken, { document_id: documentId });
      router.push(`/chat/${conv.id}?doc_id=${documentId}`);
    } catch {
      setChattingId(null);
    }
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite" }} />
      </div>
    );
  }

  let visible = docs.filter((d) =>
    !q || (d.title ?? d.original_file_name).toLowerCase().includes(q.toLowerCase())
  );
  if (filter !== "all") visible = visible.filter((d) => d.status === filter);
  if (sort === "name") visible = [...visible].sort((a, b) => (a.title ?? a.original_file_name).localeCompare(b.title ?? b.original_file_name));
  else if (sort === "oldest") visible = [...visible].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const uploadBtn = (
    <button onClick={() => router.push("/upload")} style={{ height: 38, padding: "0 16px", background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
      <Plus size={16} strokeWidth={2} /> Upload PDF
    </button>
  );

  return (
    <AppShell user={user} title="Document library" subtitle="All your uploaded study materials" actions={uploadBtn} isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <Search size={16} strokeWidth={1.75} />
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" style={{ width: "100%", height: 40, padding: "0 14px 0 36px", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-primary)", background: "var(--surface-card)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--line-soft)", borderRadius: "var(--radius-md)", padding: 4 }}>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{ height: 32, padding: "0 12px", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === s ? "var(--surface-card)" : "transparent", color: filter === s ? "var(--text-primary)" : "var(--text-muted)", boxShadow: filter === s ? "var(--shadow-sm)" : "none", transition: "all var(--dur-fast)" }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ height: 40, padding: "0 12px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Loading state */}
      {docsLoading && docs.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
          <div style={{ width: 28, height: 28, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite", margin: "0 auto 12px" }} />
          Loading your documents…
        </div>
      )}

      {/* Empty state */}
      {!docsLoading && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "72px 24px", background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <Inbox size={40} strokeWidth={1.5} />
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            {q || filter !== "all" ? "No matching documents" : "Your library is empty"}
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)" }}>
            {q || filter !== "all" ? "Try a different search or filter." : "Upload your first PDF to get started."}
          </p>
          {!q && filter === "all" && (
            <button onClick={() => router.push("/upload")} style={{ padding: "10px 22px", background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", boxShadow: "var(--shadow-primary)" }}>
              Upload PDF
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {visible.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            {visible.length} document{visible.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {visible.map((d) => (
              <DocCard
                key={d.id}
                doc={d}
                onDelete={removeDoc}
                onChat={handleChat}
                chatting={chattingId === d.id}
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
