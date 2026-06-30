"use client";

import type { ComponentType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs, type Document, type DocumentStatus } from "@/lib/docs-store";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileText,
  Files,
  HardDrive,
  Inbox,
  Layers3,
  Library,
  Loader,
  Plus,
  Sparkles,
  UploadCloud,
  UserRound,
  Zap,
} from "lucide-react";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const statusStyles: Record<DocumentStatus, string> = {
  ready: "border-emerald-200/20 bg-emerald-200/10 text-emerald-100",
  processing: "border-amber-200/20 bg-amber-200/10 text-amber-100",
  uploaded: "border-cyan-200/20 bg-cyan-200/10 text-cyan-100",
  failed: "border-rose-200/20 bg-rose-200/10 text-rose-100",
  deleted: "border-white/10 bg-white/[0.04] text-white/38",
};

const chartBars = [46, 68, 54, 82, 72, 91, 78, 96];

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
        <p className="mt-4 text-sm font-black text-white/52">Opening workspace...</p>
      </div>
    </div>
  );
}

function PanelTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">{eyebrow}</p>
        <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  Icon,
  label,
  value,
  sub,
  tone,
}: {
  Icon: IconType;
  label: string;
  value: number | string;
  sub: string;
  tone: string;
}) {
  return (
    <article className="aisch-surface-soft group overflow-hidden rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-white/44">{label}</p>
          <p className="mt-5 text-4xl font-black tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm font-semibold text-white/42">{sub}</p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone}`}>
          <Icon size={21} strokeWidth={2.1} />
        </span>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 transition-all duration-500 group-hover:w-full" />
      </div>
    </article>
  );
}

function StorageCard({ docs }: { docs: Document[] }) {
  const totalBytes = docs.reduce((sum, doc) => sum + (doc.file_size_bytes ?? 0), 0);
  const usedGB = +(totalBytes / 1024 ** 3).toFixed(2);
  const totalGB = 5;
  const pct = Math.min(100, Math.round((usedGB / totalGB) * 100));

  return (
    <article className="aisch-surface-soft rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white/44">Storage</p>
          <p className="mt-5 text-4xl font-black tracking-tight text-white">
            {usedGB} GB <span className="text-base font-black text-white/36">/ {totalGB} GB</span>
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-semibold text-white/42">{pct}% used</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
          <HardDrive size={21} strokeWidth={2.1} />
        </span>
      </div>
    </article>
  );
}

function TrendCard() {
  return (
    <div className="aisch-surface overflow-hidden rounded-[28px] p-5 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">Study trend</p>
          <h3 className="mt-2 text-xl font-black">Focus signals</h3>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
          <BarChart3 size={19} />
        </span>
      </div>
      <div className="mt-5 flex h-36 items-end gap-2 rounded-[22px] border border-white/10 bg-black/15 p-4">
        {chartBars.map((height, index) => (
          <div key={`${height}-${index}`} className="flex-1 rounded-t-xl bg-gradient-to-t from-indigo-500 to-cyan-300 transition-all duration-300 hover:opacity-80" style={{ height: `${height}%` }} />
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-white/48">Document activity and review loops are represented as a lightweight dashboard chart.</p>
    </div>
  );
}

function DocRow({ doc, onView }: { doc: Document; onView: () => void }) {
  const status = doc.status.charAt(0).toUpperCase() + doc.status.slice(1);

  return (
    <button
      onClick={onView}
      className="group flex w-full items-center gap-3 rounded-[22px] border border-transparent p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.06]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan-100 shadow-lg shadow-black/10">
        <FileText size={20} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-black text-white">{doc.title ?? doc.original_file_name}</span>
        <span className="mt-1 block truncate font-mono text-xs font-semibold text-white/36">
          {doc.original_file_name} · {fmt(doc.file_size_bytes)}
        </span>
      </span>
      <span className={`hidden rounded-full border px-3 py-1 text-xs font-black sm:inline-flex ${statusStyles[doc.status]}`}>
        {status}
      </span>
      <ChevronRight size={18} className="text-white/28 transition-colors group-hover:text-cyan-200" />
    </button>
  );
}

function RecentSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading recent documents">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.045] p-3">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.08] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded-full bg-white/[0.1] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
            <div className="h-3 w-1/2 rounded-full bg-white/[0.07] [animation:aisch-pulse_1.4s_ease-in-out_infinite]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyDocuments({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/14 bg-white/[0.045] px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.07] text-white/42 shadow-sm">
        <Inbox size={30} strokeWidth={1.7} />
      </div>
      <h4 className="mt-6 text-2xl font-black text-white">No documents yet</h4>
      <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-white/44">
        Upload your first PDF to unlock grounded chat, study signals, and recent activity.
      </p>
      <button onClick={onUpload} className="aisch-button-primary mt-7 inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-black">
        <UploadCloud size={17} /> Upload PDF
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs, loading: docsLoading } = useDocs(accessToken);

  if (loading || !user) return <LoadingScreen />;

  const ready = docs.filter((doc) => doc.status === "ready").length;
  const processing = docs.filter((doc) => doc.status === "processing" || doc.status === "uploaded").length;
  const recent = docs.slice(0, 5);
  const firstName = user.name.split(" ")[0];
  const readiness = docs.length ? Math.round((ready / docs.length) * 100) : 0;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const uploadBtn = (
    <button onClick={() => router.push("/upload")} className="aisch-button-primary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black sm:px-5">
      <Plus size={17} strokeWidth={2.4} /> Upload PDF
    </button>
  );

  const activity = [
    { Icon: CheckCircle2, label: `${ready} document${ready !== 1 ? "s" : ""} ready to chat`, tone: "border-emerald-200/20 bg-emerald-200/10 text-emerald-100" },
    { Icon: Loader, label: `${processing} document${processing !== 1 ? "s" : ""} processing`, tone: "border-amber-200/20 bg-amber-200/10 text-amber-100" },
    { Icon: UploadCloud, label: `${docs.length} total upload${docs.length !== 1 ? "s" : ""}`, tone: "border-cyan-200/20 bg-cyan-200/10 text-cyan-100" },
  ];

  return (
    <AppShell
      user={user}
      title="Dashboard"
      subtitle="Your AI learning command center"
      actions={uploadBtn}
      isDark={isDark}
      onToggleDark={toggleDark}
      onSignOut={signOut}
    >
      <section className="aisch-surface mb-6 w-full max-w-full overflow-hidden rounded-[32px] p-5 text-white sm:p-7 lg:mb-8">
        <div className="relative min-w-0 max-w-full">
          <div className="relative min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100/72">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/40" />
              {today}
            </div>
            <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {greeting}, {firstName}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/56 sm:text-lg">
              Your documents, readiness, upload activity, and next actions are organized into one focused AI workspace.
            </p>
            <div className="mt-7 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button onClick={() => router.push("/upload")} className="aisch-button-primary inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black">
                <UploadCloud size={18} /> Add source
              </button>
              <button onClick={() => router.push("/library")} className="aisch-button-secondary inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black">
                Open library <ArrowRight size={18} />
              </button>
            </div>
            <div className="mt-5 grid max-w-2xl grid-cols-3 gap-2">
              {[
                ["Ready", ready],
                ["Processing", processing],
                ["Readiness", `${readiness}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                  <p className="text-xs font-bold text-white/38">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 lg:mb-8">
        <StatCard Icon={Files} label="Total documents" value={docs.length} sub="Across all subjects" tone="border-indigo-200/20 bg-indigo-200/10 text-indigo-100" />
        <StatCard Icon={CheckCircle2} label="Ready to use" value={ready} sub="Fully processed" tone="border-emerald-200/20 bg-emerald-200/10 text-emerald-100" />
        <StatCard Icon={Loader} label="Processing" value={processing} sub={processing ? "Being indexed" : "Queue empty"} tone="border-amber-200/20 bg-amber-200/10 text-amber-100" />
        <StorageCard docs={docs} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="aisch-surface-soft rounded-[32px] p-4 sm:p-6">
            <PanelTitle
              eyebrow="Recent sources"
              title="Uploads ready for study"
              action={
                <button onClick={() => router.push("/library")} className="aisch-button-secondary hidden items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black sm:inline-flex">
                  View all <ArrowRight size={16} />
                </button>
              }
            />

            {docsLoading && docs.length === 0 ? (
              <RecentSkeleton />
            ) : docs.length === 0 ? (
              <EmptyDocuments onUpload={() => router.push("/upload")} />
            ) : (
              <div className="space-y-2">
                {recent.map((doc) => (
                  <DocRow key={doc.id} doc={doc} onView={() => router.push("/library")} />
                ))}
              </div>
            )}
          </div>

          <TrendCard />
        </div>

        <aside className="space-y-6">
          <div className="aisch-surface-soft rounded-[32px] p-5">
            <PanelTitle eyebrow="Quick actions" title="Move fast" />
            <div className="space-y-3">
              {[
                { Icon: UploadCloud, label: "Upload PDF", detail: "Add a new source", action: () => router.push("/upload"), active: true },
                { Icon: Library, label: "Library", detail: "Browse documents", action: () => router.push("/library") },
                { Icon: UserRound, label: "Profile", detail: "Update identity", action: () => router.push("/profile") },
              ].map(({ Icon, label, detail, action, active }) => (
                <button
                  key={label}
                  onClick={action}
                  className={`group flex min-h-16 w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                    active
                      ? "border-cyan-200/30 bg-cyan-100/12 text-white shadow-lg shadow-black/12"
                      : "border-white/10 bg-white/[0.045] text-white/76 hover:border-white/15 hover:bg-white/[0.08]"
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-cyan-200 text-slate-950" : "bg-white/[0.07] text-cyan-100"}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{label}</span>
                    <span className="mt-0.5 block text-xs font-bold text-white/36">{detail}</span>
                  </span>
                  <ChevronRight className="opacity-40 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="aisch-surface-soft rounded-[32px] p-5">
            <PanelTitle eyebrow="Activity" title="Workspace pulse" />
            <div className="space-y-4">
              {activity.map(({ Icon, label, tone }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tone}`}>
                    <Icon size={17} strokeWidth={2.1} className={Icon === Loader ? "animate-spin" : ""} />
                  </span>
                  <p className="pt-1.5 text-sm font-bold leading-6 text-white/64">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="aisch-surface overflow-hidden rounded-[32px] p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">Next AI layer</p>
                <h3 className="mt-2 text-xl font-black">Practice engine</h3>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
                <Zap size={19} />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[62, 84, 48].map((height) => (
                <div key={height} className="flex h-20 items-end rounded-2xl bg-white/[0.08] p-2">
                  <div className="w-full rounded-xl bg-gradient-to-t from-indigo-500 to-cyan-300" style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-white/52">
              <Layers3 size={16} className="text-cyan-300" />
              Quiz, flashcards, and planner signals
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.08] text-cyan-100">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="text-sm font-black text-white">Workspace quality</p>
                <p className="mt-1 text-xs font-bold text-white/38">Sidebar-aligned visual system</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
