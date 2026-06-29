"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { api, ProfilePatch } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { Pencil, CheckCircle, KeyRound, Bell, Shield, LogOut, Camera } from "lucide-react";

const DEGREES  = ["B.Tech","B.Sc","B.A","B.Com","BBA","M.Tech","M.Sc","MBA","PhD"];
const BRANCHES = ["Computer Science","Electronics","Mechanical","Civil","Electrical","Chemical","Biotechnology","Mathematics","Physics","Economics"];
const YEARS    = ["2024","2025","2026","2027","2028","2029"];
const GOALS    = ["Software Engineering","Data Science & AI","Product Management","Research / Academia","Civil Services","Finance & Consulting","Entrepreneurship","Still exploring"];

type Tab = "view" | "edit";

function Avatar({ name, size = 64 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--gradient-primary)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", flex: "none",
      letterSpacing: "-0.02em",
    }}>
      {initials}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <span style={{ width: 160, flex: "none", fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 15, color: value ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500 }}>{value || "Not set"}</span>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", height: 42, padding: "0 12px",
          fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-primary)",
          background: "var(--surface-card)", border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-md)", outline: "none", boxSizing: "border-box",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--indigo-400)"; e.currentTarget.style.boxShadow = "var(--shadow-focus)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", height: 42, padding: "0 12px",
          fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-primary)",
          background: "var(--surface-card)", border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-md)", outline: "none", boxSizing: "border-box", cursor: "pointer",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--indigo-400)"; e.currentTarget.style.boxShadow = "var(--shadow-focus)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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

  useEffect(() => {
    if (profile) {
      setDraft({
        full_name: profile.full_name ?? "",
        college_name: profile.college_name ?? "",
        degree: profile.degree ?? "",
        branch: profile.branch ?? "",
        graduation_year: profile.graduation_year ?? undefined,
        career_goal: profile.career_goal ?? "",
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const updated = await api.patchProfile(session.access_token, draft);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => { setSaved(false); setTab("view"); }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function set(k: keyof ProfilePatch) {
    return (v: string) => setDraft((d) => ({ ...d, [k]: v }));
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--indigo-200)", borderTopColor: "var(--indigo-500)", borderRadius: "50%", animation: "aisch-spin 0.7s linear infinite" }} />
      </div>
    );
  }

  const fullName = profile?.full_name || user.name || "You";
  const storageUsed = 1.8;
  const storageTotal = 5;
  const pct = Math.round((storageUsed / storageTotal) * 100);

  return (
    <AppShell user={user} title="Your profile" subtitle="Personal details and account settings" isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>
        {/* Main card */}
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "28px 28px 20px", background: "var(--gradient-card)", borderBottom: "1px solid var(--line)" }}>
            <div style={{ position: "relative" }}>
              <Avatar name={fullName} size={64} />
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--gradient-primary)", border: "2px solid var(--surface-card)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              }}>
                <Camera size={10} strokeWidth={2} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{fullName}</h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
                {[profile?.degree, profile?.branch, profile?.graduation_year ? String(profile.graduation_year) : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            {tab === "view" && (
              <button onClick={() => setTab("edit")} style={{
                height: 36, padding: "0 16px",
                border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)",
                background: "var(--surface-card)", fontFamily: "var(--font-sans)",
                fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                <Pencil size={14} strokeWidth={1.75} /> Edit
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ padding: "0 28px", borderBottom: "1px solid var(--line)", display: "flex", gap: 0 }}>
            {(["view", "edit"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "14px 0", marginRight: 24,
                border: "none", background: "none",
                fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                color: tab === t ? "var(--indigo-600)" : "var(--text-muted)",
                cursor: "pointer",
                borderBottom: tab === t ? "2px solid var(--indigo-500)" : "2px solid transparent",
                transition: "color var(--dur-fast)",
              }}>
                {t === "view" ? "Overview" : "Edit profile"}
              </button>
            ))}
          </div>

          {/* Content */}
          {tab === "view" ? (
            <div style={{ padding: "8px 28px 28px" }}>
              <InfoRow label="Full name"    value={profile?.full_name} />
              <InfoRow label="College"      value={profile?.college_name} />
              <InfoRow label="Degree"       value={profile?.degree} />
              <InfoRow label="Branch / Major" value={profile?.branch} />
              <InfoRow label="Graduation"   value={profile?.graduation_year ? String(profile.graduation_year) : null} />
              <InfoRow label="Career goal"  value={profile?.career_goal} />
              <InfoRow label="Email"        value={user.email} />
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ padding: "24px 28px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <FieldInput label="Full name" value={draft.full_name ?? ""} onChange={set("full_name")} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <FieldInput label="College name" value={draft.college_name ?? ""} onChange={set("college_name")} placeholder="e.g. IIT Bombay" />
                </div>
                <FieldSelect label="Degree" value={draft.degree ?? ""} onChange={set("degree")} options={DEGREES} placeholder="Select" />
                <FieldSelect label="Branch" value={draft.branch ?? ""} onChange={set("branch")} options={BRANCHES} placeholder="Select" />
                <FieldSelect label="Graduation year" value={draft.graduation_year ? String(draft.graduation_year) : ""} onChange={(v) => setDraft((d) => ({ ...d, graduation_year: v ? Number(v) : undefined }))} options={YEARS} placeholder="Select" />
                <FieldSelect label="Career goal" value={draft.career_goal ?? ""} onChange={set("career_goal")} options={GOALS} placeholder="Select" />
              </div>

              {error && <p style={{ margin: "16px 0 0", fontSize: 13.5, color: "var(--status-error)", padding: "10px 12px", background: "var(--status-error-bg)", borderRadius: "var(--radius-sm)" }}>{error}</p>}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                {saved && (
                  <span style={{ fontSize: 13.5, color: "var(--status-success)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={15} strokeWidth={1.75} /> Saved
                  </span>
                )}
                <button type="button" onClick={() => { setTab("view"); setError(null); }} style={{
                  height: 38, padding: "0 16px", border: "1px solid var(--line)", borderRadius: "var(--radius-md)",
                  background: "transparent", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                  color: "var(--text-secondary)", cursor: "pointer",
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{
                  height: 38, padding: "0 20px", border: "none",
                  borderRadius: "var(--radius-md)", background: saving ? "var(--indigo-300)" : "var(--gradient-primary)",
                  fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                  color: "#fff", cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving ? "none" : "var(--shadow-primary)",
                }}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Storage */}
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Storage</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{storageUsed} GB</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>of {storageTotal} GB</span>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg, var(--cyan-500), var(--indigo-400))", borderRadius: 999 }} />
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)" }}>{pct}% used · {storageTotal - storageUsed} GB free</p>
          </div>

          {/* Account */}
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Account</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { Icon: KeyRound, label: "Change password" },
                { Icon: Bell,     label: "Notifications" },
                { Icon: Shield,   label: "Privacy & data" },
              ].map(({ Icon, label }) => (
                <button key={label} style={{
                  display: "flex", alignItems: "center", gap: 9, height: 38, padding: "0 12px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-app)", cursor: "pointer", fontFamily: "var(--font-sans)",
                  fontSize: 13.5, fontWeight: 500, color: "var(--text-secondary)",
                }}>
                  <Icon size={15} strokeWidth={1.75} /> {label}
                </button>
              ))}
              <button onClick={signOut} style={{
                display: "flex", alignItems: "center", gap: 9, height: 38, padding: "0 12px",
                border: "1px solid rgba(239,68,68,0.25)", borderRadius: "var(--radius-sm)",
                background: "var(--status-error-bg)", cursor: "pointer", fontFamily: "var(--font-sans)",
                fontSize: 13.5, fontWeight: 600, color: "var(--status-error)", marginTop: 4,
              }}>
                <LogOut size={15} strokeWidth={1.75} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
