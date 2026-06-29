"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { api, type Message, type Source } from "@/lib/api";
import { ArrowLeft, Send, BookOpen, FileText } from "lucide-react";

// ─── Citation chip ────────────────────────────────────────────────────────────

function CitationChip({ source }: { source: Source }) {
  const label =
    source.start_page === source.end_page
      ? `p. ${source.start_page}`
      : `pp. ${source.start_page}–${source.end_page}`;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", background: "var(--indigo-050)",
      border: "1px solid var(--indigo-200)", borderRadius: "var(--radius-pill)",
      fontSize: 11.5, fontWeight: 600, color: "var(--indigo-500)",
      fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
    }}>
      <BookOpen size={10} strokeWidth={2} />
      {label}
    </span>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: 6, maxWidth: "80%", alignSelf: isUser ? "flex-end" : "flex-start" }}>
      <div style={{
        padding: "12px 16px",
        background: isUser ? "var(--gradient-primary)" : "var(--surface-card)",
        border: isUser ? "none" : "1px solid var(--line)",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        color: isUser ? "#fff" : "var(--text-primary)",
        fontSize: 14, lineHeight: 1.6,
        boxShadow: isUser ? "0 4px 12px rgba(99,102,241,0.25)" : "var(--shadow-sm)",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
      {/* Citations */}
      {msg.sources.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 4 }}>
          {msg.sources.filter((s) => s.start_page).map((s, i) => (
            <CitationChip key={i} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 16px", background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "4px 18px 18px 18px", boxShadow: "var(--shadow-sm)", alignSelf: "flex-start" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--indigo-300)", animation: `aisch-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const params = useParams<{ conversationId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, accessToken, isDark, toggleDark, signOut, loading: authLoading } = useAppUser();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationId = params.conversationId;

  // Load message history + doc title in parallel
  useEffect(() => {
    if (!accessToken || !conversationId) return;

    const docId = searchParams.get("doc_id");

    (async () => {
      try {
        const [msgRes] = await Promise.all([
          api.listMessages(accessToken, conversationId),
          docId
            ? api.getDocument(accessToken, docId).then((doc) =>
                setDocTitle(doc.title ?? doc.original_file_name)
              ).catch(() => null)
            : Promise.resolve(),
        ]);
        setMessages(msgRes.data);
      } catch {
        // Conversation not found or token expired — let history stay empty
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [accessToken, conversationId, searchParams]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const content = input.trim();
    if (!content || !accessToken || sending) return;

    setInput("");
    setSendError(null);
    setSending(true);

    // Optimistic user message
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      sources: [],
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.sendMessage(accessToken, conversationId, content);
      // Replace optimistic with real messages
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        res.user_message,
        res.assistant_message,
      ]);
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      const msg = (err as { error?: { message?: string } })?.error?.message;
      setSendError(msg ?? "Failed to send — please try again.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      title={docTitle ? `Chat — ${docTitle}` : "Chat"}
      subtitle="Ask anything about your document"
      isDark={isDark}
      onToggleDark={toggleDark}
      onSignOut={signOut}
      actions={
        <button onClick={() => router.push("/library")} style={{ height: 36, padding: "0 14px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
          <ArrowLeft size={15} strokeWidth={2} /> Library
        </button>
      }
    >
      {/* Chat area + input inside a flex column that fills the viewport height */}
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", maxWidth: 780, margin: "0 auto", gap: 0 }}>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, padding: "8px 4px 16px" }}>
          {loadingHistory && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0" }}>
              <div style={{ width: 24, height: 24, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite", margin: "0 auto 10px" }} />
              Loading history…
            </div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, color: "var(--text-muted)", padding: "40px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--indigo-050)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--indigo-300)" }}>
                <FileText size={28} strokeWidth={1.5} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Start the conversation</p>
                <p style={{ margin: 0, fontSize: 14 }}>Ask anything about your document — answers include page citations.</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Error banner */}
        {sendError && (
          <div style={{ padding: "10px 16px", background: "var(--status-failed-bg)", border: "1px solid var(--status-failed)", borderRadius: "var(--radius-md)", color: "var(--status-failed)", fontSize: 13, marginBottom: 8 }}>
            {sendError}
          </div>
        )}

        {/* Input bar */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", padding: "12px 0 4px", borderTop: "1px solid var(--line)" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your document…"
            rows={1}
            style={{
              flex: 1, padding: "12px 14px", fontFamily: "var(--font-sans)", fontSize: 14,
              color: "var(--text-primary)", background: "var(--surface-card)",
              border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)",
              outline: "none", resize: "none", maxHeight: 160, overflowY: "auto",
              lineHeight: 1.5, boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              width: 44, height: 44, flex: "none", border: "none",
              borderRadius: "var(--radius-md)",
              background: input.trim() && !sending ? "var(--gradient-primary)" : "var(--line-soft)",
              cursor: input.trim() && !sending ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: input.trim() && !sending ? "#fff" : "var(--text-muted)",
              boxShadow: input.trim() && !sending ? "0 4px 10px rgba(99,102,241,0.3)" : "none",
              transition: "all var(--dur-base)",
            }}
          >
            {sending
              ? <div style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite" }} />
              : <Send size={18} strokeWidth={2} />}
          </button>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "center", margin: "4px 0 0" }}>
          Press Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </AppShell>
  );
}
