"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { api, type ProfilePatch } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  Camera,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  KeyRound,
  Loader,
  LogOut,
  Pencil,
  Save,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";

const DEGREES = ["B.Tech", "B.Sc", "B.A", "B.Com", "BBA", "M.Tech", "M.Sc", "MBA", "PhD"];
const BRANCHES = ["Computer Science", "Electronics", "Mechanical", "Civil", "Electrical", "Chemical", "Biotechnology", "Mathematics", "Physics", "Economics"];
const YEARS = ["2024", "2025", "2026", "2027", "2028", "2029"];
const GOALS = ["Software Engineering", "Data Science & AI", "Product Management", "Research / Academia", "Civil Services", "Finance & Consulting", "Entrepreneurship", "Still exploring"];

type Tab = "view" | "edit";

function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-indigo-200 font-black text-slate-950 shadow-2xl shadow-cyan-950/20 ring-1 ring-white/40"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials || "AS"}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-cyan-200 [animation:aisch-spin_0.7s_linear_infinite]" />
        <p className="mt-4 text-sm font-black text-white/52">Opening profile...</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, Icon }: { label: string; value?: string | null; Icon?: typeof UserRound }) {
  const RowIcon = Icon;

  return (
    <div className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.045] p-4 transition-all duration-300 hover:bg-white/[0.065] sm:grid-cols-[180px_1fr] sm:items-center">
      <span className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-white/34">
        {RowIcon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.07] text-cyan-100/70">
            <RowIcon size={16} />
          </span>
        )}
        {label}
      </span>
      <span className={`min-w-0 break-words text-sm font-bold ${value ? "text-white/82" : "text-white/34"}`}>{value || "Not set"}</span>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/76">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`aisch-field h-12 w-full rounded-2xl px-4 text-sm font-semibold outline-none ${error ? "border-rose-200/45 bg-rose-200/10" : ""}`}
      />
      {error && (
        <span className="mt-2 flex items-center gap-2 text-xs font-bold text-rose-100">
          <AlertCircle size={14} /> {error}
        </span>
      )}
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/76">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-semibold outline-none">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Notice({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const isError = type === "error";

  return (
    <div className={`mt-5 flex gap-3 rounded-[22px] border px-4 py-3 text-sm font-bold leading-6 ${isError ? "border-rose-200/20 bg-rose-200/10 text-rose-100" : "border-emerald-200/20 bg-emerald-200/10 text-emerald-100"}`} role={isError ? "alert" : "status"}>
      {isError ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle size={17} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

export default function ProfilePage() {
  const supabase = createClient();
  const { user, profile, isDark, toggleDark, signOut, loading, setProfile } = useAppUser();
  const [tab, setTab] = useState<Tab>("view");
  const [draft, setDraft] = useState<ProfilePatch>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!profile) return;
    queueMicrotask(() => {
      setDraft({
        full_name: profile.full_name ?? "",
        college_name: profile.college_name ?? "",
        degree: profile.degree ?? "",
        branch: profile.branch ?? "",
        graduation_year: profile.graduation_year ?? undefined,
        career_goal: profile.career_goal ?? "",
      });
    });
  }, [profile]);

  const fullName = profile?.full_name || user?.name || "You";
  const storageUsed = 1.8;
  const storageTotal = 5;
  const pct = Math.round((storageUsed / storageTotal) * 100);
  const profileLine = useMemo(
    () => [profile?.degree, profile?.branch, profile?.graduation_year ? String(profile.graduation_year) : null].filter(Boolean).join(" · "),
    [profile],
  );
  const completion = useMemo(() => {
    const fields = [profile?.full_name, profile?.college_name, profile?.degree, profile?.branch, profile?.graduation_year, profile?.career_goal];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);
  const fullNameError = touched && !(draft.full_name ?? "").trim() ? "Full name is required." : null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (fullNameError || !(draft.full_name ?? "").trim()) return;

    setError(null);
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const updated = await api.patchProfile(session.access_token, draft);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setTab("view");
        setTouched(false);
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function set(k: keyof ProfilePatch) {
    return (value: string) => {
      setError(null);
      setDraft((current) => ({ ...current, [k]: value }));
    };
  }

  if (loading || !user) return <LoadingScreen />;

  return (
    <AppShell user={user} title="Your profile" subtitle="Personal details and account settings" isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="aisch-surface overflow-hidden rounded-[32px]">
          <div className="relative border-b border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/16 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="relative w-fit">
                <Avatar name={fullName} size={84} />
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#101827] bg-cyan-200 text-slate-950 shadow-lg shadow-cyan-300/20">
                  <Camera size={13} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">Scholar identity</p>
                <h2 className="mt-3 truncate text-3xl font-black tracking-tight text-white sm:text-4xl">{fullName}</h2>
                <p className="mt-2 text-sm font-semibold text-white/46">{profileLine || user.email}</p>
                <div className="mt-5 grid max-w-xl grid-cols-3 gap-2">
                  {[
                    ["Profile", `${completion}%`],
                    ["Storage", `${pct}%`],
                    ["Plan", "v0.1"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                      <p className="text-xl font-black text-white">{value}</p>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/34">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {tab === "view" && (
                <button onClick={() => setTab("edit")} className="aisch-button-secondary inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black">
                  <Pencil size={15} /> Edit profile
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 border-b border-white/10 px-5 py-3 sm:px-7">
            {(["view", "edit"] as Tab[]).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setTab(item);
                  setError(null);
                  setTouched(false);
                }}
                className={`h-10 rounded-2xl px-4 text-sm font-black transition-all duration-300 ${
                  tab === item ? "bg-cyan-100 text-slate-950 shadow-lg shadow-cyan-300/10" : "text-white/42 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {item === "view" ? "Overview" : "Edit profile"}
              </button>
            ))}
          </div>

          {tab === "view" ? (
            <div className="space-y-3 p-5 sm:p-7">
              <InfoRow Icon={UserRound} label="Full name" value={profile?.full_name} />
              <InfoRow Icon={GraduationCap} label="College" value={profile?.college_name} />
              <InfoRow Icon={BookOpenCheck} label="Degree" value={profile?.degree} />
              <InfoRow Icon={Sparkles} label="Branch / Major" value={profile?.branch} />
              <InfoRow Icon={CheckCircle} label="Graduation" value={profile?.graduation_year ? String(profile.graduation_year) : null} />
              <InfoRow Icon={Shield} label="Career goal" value={profile?.career_goal} />
              <InfoRow Icon={KeyRound} label="Email" value={user.email} />
            </div>
          ) : (
            <form onSubmit={handleSave} className="p-5 sm:p-7">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldInput label="Full name" value={draft.full_name ?? ""} onChange={set("full_name")} error={fullNameError} />
                </div>
                <div className="md:col-span-2">
                  <FieldInput label="College name" value={draft.college_name ?? ""} onChange={set("college_name")} placeholder="e.g. IIT Bombay" />
                </div>
                <FieldSelect label="Degree" value={draft.degree ?? ""} onChange={set("degree")} options={DEGREES} placeholder="Select" />
                <FieldSelect label="Branch" value={draft.branch ?? ""} onChange={set("branch")} options={BRANCHES} placeholder="Select" />
                <FieldSelect
                  label="Graduation year"
                  value={draft.graduation_year ? String(draft.graduation_year) : ""}
                  onChange={(value) => setDraft((current) => ({ ...current, graduation_year: value ? Number(value) : undefined }))}
                  options={YEARS}
                  placeholder="Select"
                />
                <FieldSelect label="Career goal" value={draft.career_goal ?? ""} onChange={set("career_goal")} options={GOALS} placeholder="Select" />
              </div>

              {error && <Notice type="error">{error}</Notice>}
              {saved && <Notice type="success">Profile saved successfully.</Notice>}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setTab("view");
                    setError(null);
                    setTouched(false);
                  }}
                  className="aisch-button-secondary h-11 rounded-2xl px-5 text-sm font-black"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="aisch-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Saving" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="space-y-6">
          <section className="aisch-surface-soft rounded-[32px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Storage</p>
            <div className="mt-5 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">{storageUsed} GB</span>
              <span className="text-sm font-bold text-white/42">of {storageTotal} GB</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-200 to-indigo-300 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-sm font-semibold text-white/42">{pct}% used · {(storageTotal - storageUsed).toFixed(1)} GB free</p>
          </section>

          <section className="aisch-surface-soft rounded-[32px] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Account</p>
            <div className="mt-4 space-y-2">
              {[
                { Icon: KeyRound, label: "Change password", sub: "Manage credentials" },
                { Icon: Bell, label: "Notifications", sub: "Study reminders" },
                { Icon: Shield, label: "Privacy & data", sub: "Security controls" },
              ].map(({ Icon, label, sub }) => (
                <button key={label} className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-cyan-100">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-white">{label}</span>
                    <span className="mt-0.5 block text-xs font-bold text-white/36">{sub}</span>
                  </span>
                  <ChevronRight size={17} className="text-white/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                </button>
              ))}
              <button onClick={signOut} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-rose-200/20 bg-rose-200/10 px-4 py-3 text-sm font-black text-rose-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-200/14">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
