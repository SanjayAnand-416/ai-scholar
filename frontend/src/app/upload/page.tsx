"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs, type Document, type DocumentStatus } from "@/lib/docs-store";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  Info,
  Loader,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Queued",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
  deleted: "Deleted",
};

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  uploaded: "bg-cyan-200/10 text-cyan-100 border-cyan-200/20",
  processing: "bg-amber-200/10 text-amber-100 border-amber-200/20",
  ready: "bg-emerald-200/10 text-emerald-100 border-emerald-200/20",
  failed: "bg-rose-200/10 text-rose-100 border-rose-200/20",
  deleted: "bg-white/[0.04] text-white/38 border-white/10",
};

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
        <p className="mt-4 text-sm font-black text-white/52">Opening upload studio...</p>
      </div>
    </div>
  );
}

function FileItem({ doc, onRemove }: { doc: Document; onRemove: (id: string) => void }) {
  const spinning = doc.status === "processing" || doc.status === "uploaded";
  const ready = doc.status === "ready";
  const failed = doc.status === "failed";

  return (
    <article className="group rounded-[24px] border border-white/10 bg-white/[0.045] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07]">
      <div className="flex items-start gap-4">
        <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[20px] border ${ready ? "border-emerald-200/20 bg-emerald-200/10 text-emerald-100" : failed ? "border-rose-200/20 bg-rose-200/10 text-rose-100" : "border-white/10 bg-white/[0.06] text-cyan-100/75"}`}>
          {ready ? <CheckCircle2 size={22} /> : failed ? <AlertCircle size={22} /> : <FileText size={22} strokeWidth={1.75} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{doc.title ?? doc.original_file_name}</p>
              <p className="mt-1 truncate font-mono text-xs font-semibold text-white/34">
                {doc.original_file_name}
                {doc.file_size_bytes ? ` · ${fmt(doc.file_size_bytes)}` : ""}
              </p>
            </div>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${STATUS_CLASSES[doc.status]}`}>
              <span className={`h-1.5 w-1.5 rounded-full bg-current ${spinning ? "[animation:aisch-pulse_1.5s_ease_infinite]" : ""}`} />
              {STATUS_LABELS[doc.status]}
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ${failed ? "bg-rose-300" : "bg-gradient-to-r from-cyan-300 to-indigo-300"}`}
              style={{ width: ready ? "100%" : failed ? "100%" : spinning ? "62%" : "28%" }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {doc.total_pages ? <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-bold text-white/38">{doc.total_pages} pages</span> : null}
            {doc.status === "failed" && doc.error_message ? <span className="text-xs font-bold text-rose-100">{doc.error_message}</span> : null}
          </div>
        </div>

        <button
          onClick={() => onRemove(doc.id)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white/38 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
          aria-label="Remove document"
        >
          <X size={16} />
        </button>
      </div>
    </article>
  );
}

function SelectedFilePreview({ files }: { files: File[] }) {
  if (!files.length) return null;

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-4 text-left shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Selected files</p>
          <p className="mt-1 text-sm font-bold text-white/48">{files.length} file{files.length !== 1 ? "s" : ""} ready to upload</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100">
          <FileUp size={18} />
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {files.slice(0, 4).map((file) => (
          <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-cyan-100/70">
              <FileText size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-white">{file.name}</span>
              <span className="mt-0.5 block font-mono text-xs font-semibold text-white/34">{fmt(file.size)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadNotice({ type, children }: { type: "error" | "success" | "info"; children: ReactNode }) {
  const classes = {
    error: "border-rose-200/20 bg-rose-200/10 text-rose-100",
    success: "border-emerald-200/20 bg-emerald-200/10 text-emerald-100",
    info: "border-cyan-200/20 bg-cyan-200/10 text-cyan-100",
  }[type];
  const Icon = type === "error" ? AlertCircle : type === "success" ? CheckCircle2 : Info;

  return (
    <div className={`flex gap-3 rounded-[22px] border px-4 py-3 text-sm font-bold leading-6 ${classes}`} role={type === "error" ? "alert" : "status"}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function UploadPage() {
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs, uploadDoc, removeDoc } = useDocs(accessToken);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    setSelectedFiles(incoming);
    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);
    let uploadedCount = 0;

    try {
      for (const file of incoming) {
        if (file.type !== "application/pdf") {
          setUploadError(`"${file.name}" is not a PDF.`);
          continue;
        }
        if (file.size > 50 * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds 50 MB.`);
          continue;
        }
        await uploadDoc(file);
        uploadedCount += 1;
      }
      if (uploadedCount > 0) {
        setUploadSuccess(`${uploadedCount} PDF${uploadedCount !== 1 ? "s" : ""} uploaded and queued for processing.`);
      }
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      setUploadError(msg ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const readyCount = docs.filter((doc) => doc.status === "ready").length;
  const processingCount = docs.filter((doc) => doc.status === "processing" || doc.status === "uploaded").length;
  const failedCount = docs.filter((doc) => doc.status === "failed").length;
  const queueSummary = useMemo(
    () => [
      { label: "Ready", value: readyCount, tone: "text-emerald-100 bg-emerald-200/10 border-emerald-200/20" },
      { label: "Processing", value: processingCount, tone: "text-amber-100 bg-amber-200/10 border-amber-200/20" },
      { label: "Failed", value: failedCount, tone: "text-rose-100 bg-rose-200/10 border-rose-200/20" },
    ],
    [failedCount, processingCount, readyCount],
  );

  if (loading || !user) return <LoadingScreen />;

  return (
    <AppShell user={user} title="Upload documents" subtitle="Add PDFs to your study library" isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

          <section
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`aisch-surface group relative cursor-pointer overflow-hidden rounded-[32px] border-dashed p-5 text-center transition-all duration-300 sm:p-8 lg:p-10 ${
              drag ? "border-cyan-200/60 bg-cyan-200/10 shadow-cyan-300/10" : "border-white/14"
            } ${uploading ? "cursor-wait" : ""}`}
            aria-busy={uploading}
          >
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-200/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-violet-300/10 blur-3xl" />

            <div className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border transition-all duration-300 ${
              drag || uploading ? "border-cyan-200/40 bg-cyan-200 text-slate-950 shadow-2xl shadow-cyan-300/20" : "border-white/10 bg-white/[0.07] text-cyan-100/75 group-hover:scale-105"
            }`}>
              {uploading ? <Loader size={34} className="animate-spin" /> : drag ? <FileUp size={36} /> : <UploadCloud size={36} />}
            </div>

            <h2 className="relative mt-7 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {uploading ? "Uploading to your library" : drag ? "Release to upload" : "Drop PDFs into AI Scholar"}
            </h2>
            <p className="relative mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/50 sm:text-base sm:leading-7">
              {uploading
                ? "Your files are being uploaded and queued for text extraction. Keep this page open until the upload finishes."
                : "Browse or drag files into a secure, citation-ready workspace. PDF only, up to 50 MB per file."}
            </p>

            <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 font-mono text-xs font-black text-white/46">.PDF supported</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-4 py-2 text-xs font-black text-emerald-100">
                <ShieldCheck size={14} /> Secure upload
              </span>
            </div>

            {uploading && (
              <div className="relative mx-auto mt-7 max-w-xl">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 [animation:aisch-pulse_1.2s_ease-in-out_infinite]" />
                </div>
                <p className="mt-2 text-xs font-bold text-white/38">Uploading and preparing processing queue...</p>
              </div>
            )}
          </section>

          <SelectedFilePreview files={selectedFiles} />

          {uploadError && <UploadNotice type="error">{uploadError}</UploadNotice>}
          {uploadSuccess && <UploadNotice type="success">{uploadSuccess}</UploadNotice>}

          {docs.length > 0 ? (
            <section className="aisch-surface-soft rounded-[32px] p-4 sm:p-5">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Upload queue</p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    {docs.length} document{docs.length !== 1 ? "s" : ""}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {queueSummary.map((item) => (
                    <span key={item.label} className={`rounded-full border px-3 py-1 text-xs font-black ${item.tone}`}>
                      {item.value} {item.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                {docs.map((doc) => (
                  <FileItem key={doc.id} doc={doc} onRemove={removeDoc} />
                ))}
              </div>
            </section>
          ) : !uploading ? (
            <UploadNotice type="info">Your uploads will appear here. Text is extracted automatically after upload.</UploadNotice>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="aisch-surface-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Upload studio</p>
                <h3 className="mt-2 text-xl font-black text-white">Queue health</h3>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
                <Sparkles size={19} />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {queueSummary.map((item) => (
                <div key={item.label} className={`rounded-2xl border p-3 text-center ${item.tone}`}>
                  <p className="text-2xl font-black">{item.value}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.1em]">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="aisch-surface overflow-hidden rounded-[32px] p-5 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
              <Clock3 size={20} />
            </div>
            <h3 className="mt-5 text-xl font-black">What happens next</h3>
            <div className="mt-5 space-y-3">
              {["Upload PDF securely", "Extract readable text", "Queue citation-ready chat"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.08] text-xs font-black text-cyan-100">{index + 1}</span>
                  <span className="text-sm font-bold text-white/62">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-cyan-100">
                <Info size={17} />
              </span>
              <p className="text-sm font-semibold leading-6 text-white/48">
                Large PDFs may take a moment to process after upload. Documents become chat-ready when their status changes to Ready.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
