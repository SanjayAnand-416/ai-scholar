"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs } from "@/lib/docs-store";
import { api, type StudyPlan, type StudyPlanItemStatus } from "@/lib/api";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  GraduationCap,
  Loader,
  Plus,
  SkipForward,
} from "lucide-react";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-cyan-200 [animation:aisch-spin_0.7s_linear_infinite]" />
        <p className="mt-4 text-sm font-black text-white/52">Opening study planner...</p>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<StudyPlanItemStatus, string> = {
  pending: "border-white/10 bg-white/[0.06] text-white/50",
  in_progress: "border-cyan-200/20 bg-cyan-200/10 text-cyan-100",
  completed: "border-emerald-200/20 bg-emerald-200/10 text-emerald-100",
  skipped: "border-white/10 bg-white/[0.04] text-white/30",
};

export default function StudyPlanPage() {
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs } = useDocs(accessToken);
  const readyDocs = useMemo(() => docs.filter((d) => d.status === "ready"), [docs]);

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<StudyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [itemDocId, setItemDocId] = useState("");
  const [itemTopic, setItemTopic] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [itemMinutes, setItemMinutes] = useState(30);
  const [addingItem, setAddingItem] = useState(false);

  async function loadPlans() {
    if (!accessToken) return;
    setPlansLoading(true);
    try {
      const res = await api.listStudyPlans(accessToken);
      setPlans(res.data);
      if (res.data.length > 0 && !selectedId) setSelectedId(res.data[0].id);
      if (res.data.length === 0) setShowCreate(true);
    } finally {
      setPlansLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedId) {
      setSelected(null);
      return;
    }
    setPlanLoading(true);
    api
      .getStudyPlan(accessToken, selectedId)
      .then(setSelected)
      .finally(() => setPlanLoading(false));
  }, [accessToken, selectedId]);

  async function handleCreatePlan() {
    if (!accessToken) return;
    setCreating(true);
    setCreateError(null);
    try {
      const plan = await api.createStudyPlan(accessToken, {
        title: title || undefined,
        goal: goal || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setPlans((prev) => [plan, ...prev]);
      setSelectedId(plan.id);
      setSelected(plan);
      setShowCreate(false);
      setTitle("");
      setGoal("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      const message = (err as { error?: { message?: string } })?.error?.message ?? "Failed to create study plan.";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleAddItem() {
    if (!accessToken || !selected) return;
    if (!itemDocId && !itemTopic) return;
    setAddingItem(true);
    try {
      const item = await api.createStudyPlanItem(accessToken, selected.id, {
        document_id: itemDocId || undefined,
        topic: itemTopic || undefined,
        scheduled_date: itemDate || undefined,
        estimated_minutes: itemMinutes || undefined,
      });
      setSelected((prev) => (prev ? { ...prev, items: [...prev.items, item] } : prev));
      setItemDocId("");
      setItemTopic("");
      setItemDate("");
      setItemMinutes(30);
    } finally {
      setAddingItem(false);
    }
  }

  async function handleItemStatus(itemId: string, status: StudyPlanItemStatus) {
    if (!accessToken) return;
    const updated = await api.patchStudyPlanItem(accessToken, itemId, { status });
    setSelected((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? updated : i)) } : prev));
  }

  if (loading || !user) return <LoadingScreen />;

  const completedCount = selected?.items.filter((i) => i.status === "completed").length ?? 0;

  return (
    <AppShell user={user} title="Study Planner" subtitle="Schedule documents and topics toward a goal" isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {showCreate && (
            <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/70">Pacing engine</p>
              <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Create a study plan</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Plan title"
                  className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none sm:col-span-2"
                />
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Goal (e.g. Pass DBMS midterm)"
                  className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none sm:col-span-2"
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                />
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleCreatePlan}
                  disabled={creating}
                  className="aisch-button-primary inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black disabled:opacity-50"
                >
                  {creating ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  {creating ? "Creating" : "Create plan"}
                </button>
                {plans.length > 0 && (
                  <button onClick={() => setShowCreate(false)} className="aisch-button-secondary inline-flex h-12 items-center rounded-2xl px-5 text-sm font-black">
                    Cancel
                  </button>
                )}
              </div>
              {createError && <p className="mt-3 text-xs font-bold text-rose-200">{createError}</p>}
            </section>
          )}

          {!showCreate && planLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader size={24} className="animate-spin text-white/40" />
            </div>
          )}

          {!showCreate && !planLoading && selected && (
            <>
              <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/70">{selected.status}</p>
                    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{selected.title || "Untitled plan"}</h2>
                    {selected.goal && <p className="mt-2 text-sm font-semibold text-white/50">{selected.goal}</p>}
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-200 text-slate-950">
                    <GraduationCap size={20} />
                  </span>
                </div>
                {(selected.start_date || selected.end_date) && (
                  <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white/40">
                    <CalendarDays size={13} />
                    {selected.start_date ?? "?"} → {selected.end_date ?? "?"}
                  </p>
                )}
              </section>

              <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
                <h3 className="text-lg font-black text-white">Add an item</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <select value={itemDocId} onChange={(e) => setItemDocId(e.target.value)} className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none">
                    <option value="">No document (topic-only)</option>
                    {readyDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title ?? d.original_file_name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={itemTopic}
                    onChange={(e) => setItemTopic(e.target.value)}
                    placeholder="Topic label (e.g. Concurrency)"
                    className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                  />
                  <input
                    type="date"
                    value={itemDate}
                    onChange={(e) => setItemDate(e.target.value)}
                    className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                  />
                  <input
                    type="number"
                    min={5}
                    value={itemMinutes}
                    onChange={(e) => setItemMinutes(Math.max(5, Number(e.target.value) || 5))}
                    placeholder="Minutes"
                    className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                    aria-label="Estimated minutes"
                  />
                </div>
                <button
                  onClick={handleAddItem}
                  disabled={addingItem || (!itemDocId && !itemTopic)}
                  className="aisch-button-primary mt-4 inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-black disabled:opacity-50"
                >
                  {addingItem ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
                  Add item
                </button>
              </section>

              <section className="space-y-3">
                {selected.items.length === 0 && (
                  <div className="aisch-surface-soft flex h-32 items-center justify-center rounded-[28px] text-sm font-semibold text-white/40">
                    No items yet — add your first one above.
                  </div>
                )}
                {selected.items.map((item) => (
                  <div key={item.id} className="aisch-surface-soft flex items-center justify-between gap-4 rounded-[24px] p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{item.topic || "Document study block"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-white/40">
                        {item.scheduled_date && <span>{item.scheduled_date}</span>}
                        {item.estimated_minutes && <span>· {item.estimated_minutes} min</span>}
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${STATUS_STYLE[item.status]}`}>{item.status}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {item.status !== "completed" && (
                        <button
                          onClick={() => handleItemStatus(item.id, item.status === "pending" ? "in_progress" : "completed")}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100 transition-colors hover:bg-cyan-200/16"
                          aria-label="Advance status"
                        >
                          {item.status === "pending" ? <ChevronRight size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                      )}
                      {item.status === "pending" && (
                        <button
                          onClick={() => handleItemStatus(item.id, "skipped")}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/40 transition-colors hover:bg-white/[0.09]"
                          aria-label="Skip item"
                        >
                          <SkipForward size={14} />
                        </button>
                      )}
                      {item.status === "completed" && (
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-200 text-slate-950">
                          <CheckCircle2 size={15} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <section className="aisch-surface-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-white">Your plans</h3>
              <button
                onClick={() => {
                  setShowCreate(true);
                  setSelectedId(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-200/10 text-amber-100 transition-colors hover:bg-amber-200/16"
                aria-label="New plan"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {plansLoading && <Loader size={18} className="animate-spin text-white/40" />}
              {!plansLoading && plans.length === 0 && <p className="text-xs font-semibold text-white/40">No plans yet.</p>}
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedId(p.id);
                    setShowCreate(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                    selectedId === p.id && !showCreate ? "border-amber-200/30 bg-amber-200/10 text-white" : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07]"
                  }`}
                >
                  <CircleDashed size={14} className="shrink-0 opacity-50" />
                  <span className="truncate">{p.title || "Untitled plan"}</span>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="aisch-surface-soft rounded-[32px] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Progress</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                  <p className="text-2xl font-black text-white">{selected.items.length}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/34">Items</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                  <p className="text-2xl font-black text-white">{completedCount}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/34">Done</p>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
