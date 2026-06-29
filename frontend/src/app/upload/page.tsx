"use client";

import { useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs, type Document, type DocumentStatus } from "@/lib/docs-store";
import { FileText, UploadCloud, X, Info, AlertCircle } from "lucide-react";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded:   "Queued",
  processing: "Processing",
  ready:      "Ready",
  failed:     "Failed",
  deleted:    "Deleted",
};

const STATUS_COLORS: Record<DocumentStatus, [string, string]> = {
  uploaded:   ["var(--status-uploaded)",   "var(--status-uploaded-bg)"],
  processing: ["var(--status-processing)", "var(--status-processing-bg)"],
  ready:      ["var(--status-ready)",      "var(--status-ready-bg)"],
  failed:     ["var(--status-failed)",     "var(--status-failed-bg)"],
  deleted:    ["var(--text-muted)",        "var(--line-soft)"],
};

function fmt(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileItem({ doc, onRemove }: { doc: Document; onRemove: (id: string) => void }) {
  const [fc, bg] = STATUS_COLORS[doc.status];
  const spinning = doc.status === "processing" || doc.status === "uploaded";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid var(--line-soft)" }}>
      <div style={{ width: 40, height: 48, borderRadius: "var(--radius-sm)", background: "var(--indigo-050)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--indigo-400)" }}>
        <FileText size={20} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {doc.title ?? doc.original_file_name}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)", flex: "none" }}>
            {fmt(doc.file_size_bytes)}
          </span>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: fc }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: fc, display: "inline-block", animation: spinning ? "aisch-pulse 1.5s ease infinite" : "none" }} />
          {STATUS_LABELS[doc.status]}
          {doc.total_pages ? ` · ${doc.total_pages} pages` : ""}
        </span>
        {doc.status === "failed" && doc.error_message && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--status-failed)" }}>{doc.error_message}</p>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flex: "none", alignItems: "center" }}>
        <span style={{ padding: "4px 10px", background: bg, color: fc, borderRadius: "var(--radius-pill)", fontSize: 11.5, fontWeight: 700 }}>
          {STATUS_LABELS[doc.status]}
        </span>
        <button onClick={() => onRemove(doc.id)} style={{ width: 30, height: 30, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", borderRadius: "var(--radius-sm)" }}>
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs, uploadDoc, removeDoc } = useDocs(accessToken);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type !== "application/pdf") {
          setUploadError(`"${file.name}" is not a PDF.`);
          continue;
        }
        if (file.size > 50 * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds 50 MB.`);
          continue;
        }
        await uploadDoc(file);
      }
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      setUploadError(msg ?? "Upload failed — please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <AppShell user={user} title="Upload documents" subtitle="Add PDFs to your study library" isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${drag ? "var(--indigo-400)" : "var(--line-strong)"}`,
            background: drag ? "var(--indigo-050)" : "var(--surface-card)",
            borderRadius: "var(--radius-xl)", padding: "48px 32px",
            textAlign: "center", cursor: uploading ? "wait" : "pointer",
            transition: "all var(--dur-base) var(--ease-standard)",
            boxShadow: drag ? "var(--shadow-focus)" : "none",
          }}
        >
          <div style={{ width: 72, height: 72, borderRadius: 20, background: uploading ? "var(--gradient-primary)" : drag ? "var(--gradient-primary)" : "var(--indigo-050)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", transition: "all 0.3s var(--ease-out)", boxShadow: drag ? "var(--shadow-primary)" : "none", color: drag || uploading ? "#fff" : "var(--indigo-400)" }}>
            {uploading
              ? <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite" }} />
              : <UploadCloud size={32} strokeWidth={1.75} />}
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {uploading ? "Uploading…" : drag ? "Release to upload" : "Drop your PDFs here"}
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)" }}>
            {uploading ? "File is being uploaded and queued for processing." : <>or <span style={{ color: "var(--indigo-500)", fontWeight: 600 }}>browse your files</span> — PDF only, up to 50 MB</>}
          </p>
          <div style={{ display: "inline-flex", gap: 8, padding: "6px 14px", background: "var(--line-soft)", borderRadius: "var(--radius-pill)", fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
            .PDF supported
          </div>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "14px 18px", background: "var(--status-failed-bg)", border: "1px solid var(--status-failed)", borderRadius: "var(--radius-md)", color: "var(--status-failed)", fontSize: 13.5 }}>
            <AlertCircle size={16} strokeWidth={2} style={{ flex: "none", marginTop: 2 }} />
            {uploadError}
          </div>
        )}

        {/* File list */}
        {docs.length > 0 && (
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                {docs.length} document{docs.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {docs.filter((d) => d.status === "ready").length} ready
              </span>
            </div>
            {docs.map((d) => (
              <FileItem key={d.id} doc={d} onRemove={removeDoc} />
            ))}
          </div>
        )}

        {docs.length === 0 && !uploading && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Info size={16} strokeWidth={1.75} />
            Your uploads will appear here. Text is extracted automatically — processing typically takes under a minute.
          </p>
        )}
      </div>
    </AppShell>
  );
}
