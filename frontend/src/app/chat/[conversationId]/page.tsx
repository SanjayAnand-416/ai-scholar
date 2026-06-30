"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { api, type Message, type Source } from "@/lib/api";
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Clipboard,
  Code2,
  FileText,
  Lightbulb,
  Loader,
  MessageSquareText,
  Quote,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function CitationChip({ source }: { source: Source }) {
  const label =
    source.start_page === source.end_page
      ? `p. ${source.start_page}`
      : `pp. ${source.start_page}-${source.end_page}`;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 font-mono text-xs font-black text-cyan-100">
      <BookOpen size={12} strokeWidth={2.2} />
      {label}
    </span>
  );
}

function InlineMarkdown({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={`${part}-${index}`} className={`font-black ${isUser ? "text-slate-950" : "text-white"}`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={`${part}-${index}`} className={`rounded-md px-1.5 py-0.5 font-mono text-[0.9em] ${isUser ? "bg-slate-950/10 text-slate-950" : "border border-white/10 bg-black/20 text-cyan-100"}`}>{part.slice(1, -1)}</code>;
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  const blocks = content.split(/```/g);

  return (
    <div className={`space-y-3 ${isUser ? "text-slate-950" : "text-white/82"}`}>
      {blocks.map((block, index) => {
        const isCode = index % 2 === 1;
        if (isCode) {
          const [maybeLang, ...codeLines] = block.split("\n");
          const hasLanguage = maybeLang.trim().length > 0 && !maybeLang.includes(" ");
          const language = hasLanguage ? maybeLang.trim() : "code";
          const code = hasLanguage ? codeLines.join("\n") : block;

          return (
            <div key={`${index}-${language}`} className="overflow-hidden rounded-2xl border border-white/10 bg-[#070a10] shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100/70">
                  <Code2 size={14} /> {language}
                </span>
                <Clipboard size={14} className="text-white/30" />
              </div>
              <pre className="max-h-[420px] overflow-auto p-4 text-left font-mono text-xs leading-6 text-white/78">
                <code>{code.trim()}</code>
              </pre>
            </div>
          );
        }

        const lines = block.split("\n");
        const nodes: ReactNode[] = [];
        let list: string[] = [];

        const flushList = () => {
          if (!list.length) return;
          nodes.push(
            <ul key={`list-${nodes.length}`} className="space-y-2 pl-1">
              {list.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="flex gap-2">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${isUser ? "bg-slate-700" : "bg-cyan-200"}`} />
                  <span><InlineMarkdown text={item} isUser={isUser} /></span>
                </li>
              ))}
            </ul>,
          );
          list = [];
        };

        lines.forEach((line, lineIndex) => {
          const trimmed = line.trim();
          if (!trimmed) {
            flushList();
            return;
          }
          const bullet = trimmed.match(/^[-*]\s+(.+)$/);
          const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
          if (bullet || ordered) {
            list.push((bullet?.[1] ?? ordered?.[1] ?? "").trim());
            return;
          }
          flushList();
          const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
          if (heading) {
            nodes.push(
              <p key={`h-${lineIndex}`} className="pt-1 text-base font-black">
                <InlineMarkdown text={heading[2]} isUser={isUser} />
              </p>,
            );
            return;
          }
          nodes.push(
            <p key={`p-${lineIndex}`} className="whitespace-pre-wrap break-words">
              <InlineMarkdown text={trimmed} isUser={isUser} />
            </p>,
          );
        });
        flushList();

        return <div key={`block-${index}`} className="space-y-3">{nodes}</div>;
      })}
    </div>
  );
}

function AvatarBubble({ role }: { role: Message["role"] }) {
  const isUser = role === "user";

  return (
    <div
      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-lg ${
        isUser
          ? "border-cyan-200/25 bg-cyan-100 text-slate-950 shadow-cyan-300/10"
          : "border-white/10 bg-white/[0.07] text-cyan-100 shadow-black/10"
      }`}
      aria-hidden="true"
    >
      {isUser ? <MessageSquareText size={18} /> : <Bot size={18} />}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const visibleSources = msg.sources.filter((s) => s.start_page);
  const sender = isUser ? "You" : "AI Scholar";

  return (
    <article className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <AvatarBubble role={msg.role} />}

      <div className={`min-w-0 ${isUser ? "order-1 max-w-[min(760px,86%)]" : "max-w-[min(900px,88%)]"}`}>
        <div className={`mb-1.5 flex items-center gap-2 text-xs font-bold ${isUser ? "justify-end text-cyan-100/58" : "text-white/36"}`}>
          <span>{sender}</span>
          <span className="h-1 w-1 rounded-full bg-current opacity-50" />
          <time dateTime={msg.created_at}>{formatTime(msg.created_at)}</time>
        </div>

        <div
          className={`rounded-[24px] px-4 py-3.5 text-[15px] font-semibold leading-7 shadow-lg sm:px-5 ${
            isUser
              ? "rounded-br-md bg-gradient-to-r from-cyan-200 to-indigo-300 text-slate-950 shadow-cyan-300/15"
              : "rounded-bl-md border border-white/10 bg-white/[0.07] text-white/82 shadow-black/10 backdrop-blur-xl"
          }`}
        >
          <MarkdownContent content={msg.content} isUser={isUser} />
        </div>

        {visibleSources.length > 0 && (
          <div className="mt-2.5 rounded-[20px] border border-white/10 bg-white/[0.045] p-3 shadow-sm backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/34">
              <Quote size={13} />
              Sources
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleSources.map((source, i) => (
                <CitationChip key={`${source.chunk_id ?? i}-${i}`} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && <AvatarBubble role={msg.role} />}
    </article>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <AvatarBubble role="assistant" />
      <div className="rounded-[24px] rounded-bl-md border border-white/10 bg-white/[0.07] px-5 py-4 shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="mb-2 text-xs font-black text-white/38">AI Scholar is reading your sources</div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-cyan-200" style={{ animation: `aisch-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
  const prompts = [
    "Summarize this document in 5 bullet points.",
    "What are the most important concepts to revise?",
    "Create quiz questions from this PDF.",
  ];

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="max-w-2xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.07] text-cyan-100 shadow-xl shadow-black/10">
          <FileText size={34} strokeWidth={1.7} />
        </div>
        <h2 className="mt-7 text-3xl font-black tracking-tight text-white">Start the conversation</h2>
        <p className="mx-auto mt-3 max-w-xl text-base font-semibold leading-7 text-white/46">
          Ask grounded questions about your document. AI Scholar will answer with citations when source passages are available.
        </p>
        <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="aisch-surface-soft rounded-[24px] p-4 text-sm font-bold leading-6 text-white/68 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085] hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingHistory() {
  return (
    <div className="flex min-h-full items-center justify-center text-white/44">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.055] p-6 text-center shadow-2xl shadow-black/10 backdrop-blur-xl">
        <Loader className="mx-auto mb-4 animate-spin text-cyan-200" size={30} />
        <p className="text-sm font-black text-white/60">Loading conversation</p>
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-12 rounded-2xl bg-white/[0.07] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContextPanel({
  docTitle,
  messages,
  loadingHistory,
  onPrompt,
}: {
  docTitle: string | null;
  messages: Message[];
  loadingHistory: boolean;
  onPrompt: (p: string) => void;
}) {
  const assistantCount = messages.filter((m) => m.role === "assistant").length;
  const citationCount = messages.reduce((n, m) => n + m.sources.filter((s) => s.start_page).length, 0);
  const prompts = [
    "Find contradictions or caveats.",
    "Explain this for exam revision.",
    "Make a 10-question practice test.",
  ];

  return (
    <aside className="hidden min-h-0 w-[340px] shrink-0 flex-col gap-4 overflow-y-auto xl:flex">
      <div className="aisch-surface-soft rounded-[28px] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan-100">
            <FileText size={19} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Document</p>
            <h3 className="mt-2 truncate text-lg font-black text-white">{docTitle ?? "Current document"}</h3>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {(
            [
              ["Messages", messages.length],
              ["Answers", assistantCount],
              ["Citations", citationCount],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center">
              <div className="text-xl font-black text-white">{loadingHistory ? "-" : value}</div>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/34">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="aisch-surface-soft rounded-[28px] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-cyan-200/80">
          <Lightbulb size={16} />
          Suggested Prompts
        </div>
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-left text-sm font-bold leading-6 text-white/64 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="aisch-surface overflow-hidden rounded-[28px] p-5 text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
          <ShieldCheck size={19} />
        </div>
        <h3 className="mt-5 text-lg font-black">Grounded answers</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/48">
          Answers are generated from document context and include source chips when citations are returned.
        </p>
      </div>
    </aside>
  );
}

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
  const [awayFromBottom, setAwayFromBottom] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const conversationId = params.conversationId;

  const subtitle = useMemo(
    () => (docTitle ? "Ask grounded questions with page citations" : "Ask anything about your document"),
    [docTitle],
  );

  useEffect(() => {
    if (!accessToken || !conversationId) return;
    const docId = searchParams.get("doc_id");
    let cancelled = false;

    (async () => {
      try {
        const [msgRes] = await Promise.all([
          api.listMessages(accessToken, conversationId),
          docId
            ? api
                .getDocument(accessToken, docId)
                .then((doc) => {
                  if (!cancelled) setDocTitle(doc.title ?? doc.original_file_name);
                })
                .catch(() => null)
            : Promise.resolve(),
        ]);
        if (!cancelled) setMessages(msgRes.data);
      } catch {
        // keep page usable if conversation fetch fails
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, conversationId, searchParams]);

  useEffect(() => {
    if (!userScrolledUp.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: loadingHistory ? "auto" : "smooth", block: "end" });
      });
    }
  }, [messages, sending, loadingHistory]);

  function scrollToBottom() {
    userScrolledUp.current = false;
    setAwayFromBottom(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function handleScrollContainer() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isAway = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
    userScrolledUp.current = isAway;
    setAwayFromBottom(isAway);
  }

  function autoResizeTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || !accessToken || sending) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    userScrolledUp.current = false;
    setAwayFromBottom(false);
    setSendError(null);
    setSending(true);

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
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        res.user_message,
        res.assistant_message,
      ]);
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      const msg = (err as { error?: { message?: string } })?.error?.message;
      setSendError(msg ?? "Failed to send. Please try again.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function applyPrompt(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      autoResizeTextarea(textareaRef.current);
    });
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-cyan-200 [animation:aisch-spin_0.7s_linear_infinite]" />
          <p className="mt-4 text-sm font-black text-white/52">Opening chat...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      title={docTitle ? "Document Chat" : "Chat"}
      subtitle={subtitle}
      isDark={isDark}
      onToggleDark={toggleDark}
      onSignOut={signOut}
      fullHeight
      actions={
        <button onClick={() => router.push("/library")} className="aisch-button-secondary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
          <ArrowLeft size={16} strokeWidth={2.2} /> Library
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 overflow-hidden p-3 sm:p-5 lg:p-6">
        <div className="flex min-h-0 w-full gap-5 overflow-hidden">
          <section className="aisch-surface flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px]">
            <div className="shrink-0 border-b border-white/10 bg-white/[0.04] px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-200 to-indigo-300 text-slate-950 shadow-lg shadow-cyan-300/15">
                    <Sparkles size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">AI Document Assistant</p>
                    <h2 className="mt-1 truncate text-lg font-black text-white sm:text-xl">{docTitle ?? "Ask about your document"}</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1.5 text-xs font-black text-emerald-100">
                    <CheckCircle2 size={13} /> Citations enabled
                  </span>
                  <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 text-xs font-black text-cyan-100">
                    {messages.length} messages
                  </span>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 bg-black/10">
              <div
                ref={scrollContainerRef}
                onScroll={handleScrollContainer}
                className="h-full overflow-y-auto overscroll-contain px-3 py-4 scroll-smooth sm:px-5"
              >
                {loadingHistory && <LoadingHistory />}

                {!loadingHistory && messages.length === 0 && !sending && <EmptyState onPrompt={applyPrompt} />}

                {!loadingHistory && (messages.length > 0 || sending) && (
                  <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-4">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {sending && <TypingIndicator />}
                    <div ref={bottomRef} className="h-px" />
                  </div>
                )}
              </div>

              {awayFromBottom && (
                <button
                  onClick={scrollToBottom}
                  className="aisch-button-secondary absolute bottom-4 left-1/2 z-10 inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-2xl px-4 text-xs font-black shadow-2xl shadow-black/20"
                >
                  <ArrowDown size={15} /> Latest
                </button>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#10131a]/92 p-3 backdrop-blur-xl sm:p-4">
              {sendError && (
                <div className="mb-3 rounded-2xl border border-rose-200/20 bg-rose-200/10 px-4 py-3 text-sm font-bold text-rose-100">
                  {sendError}
                </div>
              )}
              <div className="flex items-end gap-2 rounded-[24px] border border-white/10 bg-white/[0.065] p-2 shadow-inner transition-all duration-300 focus-within:border-cyan-200/30 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-cyan-200/10">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResizeTextarea(e.currentTarget);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your document..."
                  rows={1}
                  className="aisch-chat-input max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/34"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                    input.trim() && !sending ? "aisch-button-primary" : "cursor-not-allowed bg-white/[0.08] text-white/30"
                  }`}
                  aria-label="Send message"
                >
                  {sending ? <Loader size={19} className="animate-spin" /> : <Send size={19} strokeWidth={2.2} />}
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] font-bold text-white/30">Enter to send · Shift+Enter for a new line</p>
            </div>
          </section>

          <ContextPanel docTitle={docTitle} messages={messages} loadingHistory={loadingHistory} onPrompt={applyPrompt} />
        </div>
      </div>
    </AppShell>
  );
}
