"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs, type Document, type DocumentStatus } from "@/lib/docs-store";
import { api } from "@/lib/api";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Filter,
  Inbox,
  Library,
  Loader,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Queued",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
  deleted: "Deleted",
};

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  uploaded: "border-cyan-200/20 bg-cyan-200/10 text-cyan-100",
  processing: "border-amber-200/20 bg-amber-200/10 text-amber-100",
  ready: "border-emerald-200/20 bg-emerald-200/10 text-emerald-100",
  failed: "border-rose-200/20 bg-rose-200/10 text-rose-100",
  deleted: "border-white/10 bg-white/[0.04] text-white/38",
};

const STATUSES: Array<DocumentStatus | "all"> = ["all", "ready", "processing", "failed"];

function fmt(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-cyan-200 [animation:aisch-spin_0.7s_linear_infinite]" />
        <p className="mt-4 text-sm font-black text-white/52">Opening library...</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const spinning = status === "processing" || status === "uploaded";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${STATUS_CLASSES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${spinning ? "[animation:aisch-pulse_1.5s_ease_infinite]" : ""}`} />
      {STATUS_LABELS[status]}
    </span>
  );
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
  const canChat = doc.status === "ready" && !chatting;
  const progress = doc.status === "ready" ? 100 : doc.status === "failed" ? 100 : doc.status === "processing" ? 68 : 34;
  const failed = doc.status === "failed";

  return (
    <article className="aisch-surface-soft group flex min-h-[310px] flex-col overflow-hidden rounded-[28px] p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085]">
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-cyan-300/12 via-white/[0.04] to-indigo-300/10 p-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-200/14 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border ${failed ? "border-rose-200/20 bg-rose-200/10 text-rose-100" : "border-white/10 bg-white/[0.07] text-cyan-100/75"}`}>
            {failed ? <AlertCircle size={25} /> : <FileText size={25} strokeWidth={1.65} />}
          </span>
          <StatusBadge status={doc.status} />
        </div>

        <div className="relative mt-8">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ${failed ? "bg-rose-300" : "bg-gradient-to-r from-cyan-300 to-indigo-300"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-white/36">{doc.status === "ready" ? "Citation-ready" : failed ? "Needs review" : "Processing pipeline"}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <h3 className="line-clamp-2 text-base font-black leading-6 text-white">{doc.title ?? doc.original_file_name}</h3>
        <p className="mt-2 line-clamp-1 font-mono text-xs font-semibold text-white/34">
          {fmt(doc.file_size_bytes)}
          {doc.total_pages ? ` · ${doc.total_pages} pp` : ""}
          {doc.updated_at ? ` · updated ${new Date(doc.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
        </p>
        {doc.status === "failed" && doc.error_message ? <p className="mt-3 line-clamp-2 text-xs font-bold leading-5 text-rose-100">{doc.error_message}</p> : null}

        <div className="mt-auto flex gap-2 pt-5">
          <button
            disabled={!canChat}
            onClick={() => onChat(doc.id)}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all duration-300 ${
              canChat ? "aisch-button-primary" : "cursor-not-allowed bg-white/[0.06] text-white/30"
            }`}
          >
            {chatting ? <Loader size={15} className="animate-spin" /> : <MessageSquare size={15} />}
            {chatting ? "Opening" : "Chat"}
          </button>
          <button
            onClick={() => onDelete(doc.id)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200/15 bg-rose-200/10 text-rose-100/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-200/14 hover:text-rose-100"
            aria-label="Delete document"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="h-32 rounded-[24px] bg-white/[0.08] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
          <div className="mt-5 h-4 w-3/4 rounded-full bg-white/[0.1] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-white/[0.07] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
          <div className="mt-8 h-11 rounded-2xl bg-white/[0.07] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasQuery, onUpload }: { hasQuery: boolean; onUpload: () => void }) {
  return (
    <div className="aisch-surface rounded-[32px] px-6 py-16 text-center">
      <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.07] text-white/45">
        <Inbox size={34} />
      </div>
      <h3 className="mt-6 text-2xl font-black text-white">{hasQuery ? "No matching documents" : "Your library is empty"}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-white/44">
        {hasQuery ? "Try a different search, filter, or sort option." : "Upload your first PDF to unlock grounded chat and study tools."}
      </p>
      {!hasQuery && (
        <button onClick={onUpload} className="aisch-button-primary mt-7 inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-black">
          <UploadCloud size={17} /> Upload PDF
        </button>
      )}
    </div>
  );
}

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

  const visible = useMemo(() => {
    let next = docs.filter((doc) => !q || (doc.title ?? doc.original_file_name).toLowerCase().includes(q.toLowerCase()));
    if (filter !== "all") next = next.filter((doc) => doc.status === filter);
    if (sort === "name") return [...next].sort((a, b) => (a.title ?? a.original_file_name).localeCompare(b.title ?? b.original_file_name));
    if (sort === "oldest") return [...next].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return next;
  }, [docs, filter, q, sort]);

  if (loading || !user) return <LoadingScreen />;

  const ready = docs.filter((doc) => doc.status === "ready").length;
  const processing = docs.filter((doc) => doc.status === "processing" || doc.status === "uploaded").length;
  const failed = docs.filter((doc) => doc.status === "failed").length;
  const hasQuery = Boolean(q || filter !== "all");

  const uploadBtn = (
    <button onClick={() => router.push("/upload")} className="aisch-button-primary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
      <Plus size={16} /> Upload PDF
    </button>
  );

  return (
    <AppShell user={user} title="Document library" subtitle="All your uploaded study materials" actions={uploadBtn} isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">Knowledge vault</p>
                <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Study materials, ready when you are.</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/50">
                  Search, filter, and open citation-ready chats from one consistent workspace.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-[300px]">
                {[
                  ["Total", docs.length],
                  ["Ready", ready],
                  ["Review", failed],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/34">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_auto_auto] xl:items-center">
              <div className="relative min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/34" size={17} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search documents..."
                  className="aisch-field h-12 w-full rounded-2xl px-11 text-sm font-semibold outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`h-9 rounded-xl px-4 text-xs font-black capitalize transition-all duration-300 ${
                      filter === status ? "bg-cyan-100 text-slate-950 shadow-lg shadow-cyan-300/10" : "text-white/48 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <label className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/34" size={16} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="aisch-field h-12 w-full rounded-2xl px-11 pr-4 text-sm font-bold outline-none xl:w-[180px]">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A-Z</option>
                </select>
              </label>
            </div>
          </section>

          {docsLoading && docs.length === 0 ? (
            <LibrarySkeleton />
          ) : visible.length === 0 ? (
            <EmptyState hasQuery={hasQuery} onUpload={() => router.push("/upload")} />
          ) : (
            <section>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-white/42">
                  {visible.length} document{visible.length !== 1 ? "s" : ""} shown
                </p>
                {hasQuery && (
                  <button
                    onClick={() => {
                      setQ("");
                      setFilter("all");
                    }}
                    className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-black text-white/48 transition-colors hover:bg-white/[0.09] hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {visible.map((doc) => (
                  <DocCard key={doc.id} doc={doc} onDelete={removeDoc} onChat={handleChat} chatting={chattingId === doc.id} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="aisch-surface-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Library health</p>
                <h3 className="mt-2 text-xl font-black text-white">Document pipeline</h3>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
                <Library size={19} />
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: "Ready to chat", value: ready, Icon: CheckCircle2, tone: "border-emerald-200/20 bg-emerald-200/10 text-emerald-100" },
                { label: "Processing", value: processing, Icon: Loader, tone: "border-amber-200/20 bg-amber-200/10 text-amber-100" },
                { label: "Needs review", value: failed, Icon: AlertCircle, tone: "border-rose-200/20 bg-rose-200/10 text-rose-100" },
              ].map(({ label, value, Icon, tone }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tone}`}>
                    <Icon size={17} className={Icon === Loader ? "animate-spin" : ""} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-white">{value}</span>
                    <span className="mt-0.5 block text-xs font-bold text-white/38">{label}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="aisch-surface overflow-hidden rounded-[32px] p-5 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
              <Sparkles size={20} />
            </span>
            <h3 className="mt-5 text-xl font-black">Library workflow</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/50">
              Ready documents can open a grounded chat. Processing documents stay visible so upload status never feels hidden.
            </p>
            <button onClick={() => router.push("/upload")} className="aisch-button-secondary mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black">
              Upload more <ArrowRight size={16} />
            </button>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
