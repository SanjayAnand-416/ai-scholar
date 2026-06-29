"use client";

import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs, type Document, type DocumentStatus } from "@/lib/docs-store";
import {
  Files, CheckCircle, Loader, HardDrive,
  UploadCloud, Library, UserRound, ChevronRight,
  FileText, Inbox, Plus,
} from "lucide-react";

const statusColors: Record<DocumentStatus, [string, string]> = {
  ready:      ["var(--status-ready)",      "var(--status-ready-bg)"],
  processing: ["var(--status-processing)", "var(--status-processing-bg)"],
  uploaded:   ["var(--text-muted)",        "var(--line-soft)"],
  failed:     ["var(--status-failed)",     "var(--status-failed-bg)"],
  deleted:    ["var(--text-muted)",        "var(--line-soft)"],
};

function fmt(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({ icon, label, value, sub, accentBg }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; accentBg?: string }) {
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "20px 22px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "-0.01em" }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: accentBg || "var(--indigo-050)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--indigo-500)" }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  );
}

function StorageBar({ docs }: { docs: Document[] }) {
  const totalBytes = docs.reduce((s, d) => s + (d.file_size_bytes ?? 0), 0);
  const usedGB = +(totalBytes / (1024 ** 3)).toFixed(2);
  const totalGB = 5;
  const pct = Math.min(100, Math.round((usedGB / totalGB) * 100));
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "20px 22px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Storage</span>
        <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "var(--cyan-050)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan-500)" }}>
          <HardDrive size={17} strokeWidth={1.75} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 14 }}>
        {usedGB} GB <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>/ {totalGB} GB</span>
      </div>
      <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg, var(--cyan-500), var(--indigo-400))", borderRadius: 999, transition: "width 0.8s var(--ease-out)" }} />
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 7 }}>{pct}% used</div>
    </div>
  );
}

function DocRow({ doc, onView }: { doc: Document; onView: () => void }) {
  const [fc, bg] = statusColors[doc.status] || statusColors.uploaded;
  return (
    <div onClick={onView} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid var(--line-soft)", cursor: "pointer" }}>
      <div style={{ width: 38, height: 44, borderRadius: "var(--radius-sm)", background: "var(--indigo-050)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--indigo-400)" }}>
        <FileText size={18} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {doc.title ?? doc.original_file_name}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
          {doc.original_file_name} · {fmt(doc.file_size_bytes)}
        </div>
      </div>
      <span style={{ padding: "4px 10px", background: bg, color: fc, borderRadius: "var(--radius-pill)", fontSize: 11.5, fontWeight: 700, flex: "none" }}>
        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
      </span>
      <div style={{ color: "var(--text-muted)" }}><ChevronRight size={17} strokeWidth={1.75} /></div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs } = useDocs(accessToken);

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite" }} />
      </div>
    );
  }

  const ready      = docs.filter((d) => d.status === "ready").length;
  const processing = docs.filter((d) => d.status === "processing" || d.status === "uploaded").length;
  const recent     = docs.slice(0, 5);
  const firstName  = user.name.split(" ")[0];

  const activity = [
    { Icon: CheckCircle, label: `${ready} document${ready !== 1 ? "s" : ""} ready to chat`, color: "var(--status-ready)" },
    { Icon: Loader,      label: `${processing} document${processing !== 1 ? "s" : ""} processing`,   color: "var(--status-processing)" },
    { Icon: UploadCloud, label: `${docs.length} total upload${docs.length !== 1 ? "s" : ""}`,   color: "var(--indigo-400)" },
  ];

  const uploadBtn = (
    <button onClick={() => router.push("/upload")} style={{ height: 38, padding: "0 16px", background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
      <Plus size={16} strokeWidth={2} /> Upload PDF
    </button>
  );

  return (
    <AppShell user={user} title="Dashboard" subtitle="Your academic overview" actions={uploadBtn} isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13.5, color: "var(--text-muted)", fontWeight: 500 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Good morning, {firstName} 👋
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard icon={<Files size={17} strokeWidth={1.75} />} label="Total documents" value={docs.length} sub="across all subjects" />
        <StatCard icon={<CheckCircle size={17} strokeWidth={1.75} />} label="Ready to use" value={ready} sub="fully processed" accentBg="var(--status-ready-bg)" />
        <StatCard icon={<Loader size={17} strokeWidth={1.75} />} label="Processing" value={processing} sub={processing ? "being indexed…" : "queue empty"} accentBg="var(--status-processing-bg)" />
        <StorageBar docs={docs} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
        {/* Recent uploads */}
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Recent uploads</h2>
            <button onClick={() => router.push("/library")} style={{ border: "none", background: "none", fontSize: 13.5, fontWeight: 600, color: "var(--indigo-500)", cursor: "pointer" }}>View all →</button>
          </div>
          {docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "44px 0" }}>
              <div style={{ color: "var(--text-muted)", marginBottom: 12, display: "flex", justifyContent: "center" }}><Inbox size={32} strokeWidth={1.5} /></div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>No documents yet. Upload your first PDF.</p>
              <button onClick={() => router.push("/upload")} style={{ marginTop: 16, padding: "8px 18px", background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Upload PDF</button>
            </div>
          ) : recent.map((d) => <DocRow key={d.id} doc={d} onView={() => router.push("/library")} />)}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "18px 20px", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Quick actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { Icon: UploadCloud, label: "Upload PDF",   action: () => router.push("/upload"),   gradient: true },
                { Icon: Library,     label: "Library",      action: () => router.push("/library") },
                { Icon: UserRound,   label: "Profile",      action: () => router.push("/profile") },
              ].map(({ Icon, label, action, gradient }) => (
                <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", background: "var(--bg-app)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", textAlign: "left" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", flex: "none", background: gradient ? "var(--gradient-primary)" : "var(--indigo-050)", display: "flex", alignItems: "center", justifyContent: "center", color: gradient ? "#fff" : "var(--indigo-500)" }}>
                    <Icon size={15} strokeWidth={1.75} />
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "18px 20px", boxShadow: "var(--shadow-sm)", flex: 1 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {activity.map(({ Icon, label, color }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color, marginTop: 1 }}>
                    <Icon size={13} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
