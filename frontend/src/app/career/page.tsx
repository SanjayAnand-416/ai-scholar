"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs } from "@/lib/docs-store";
import { api, type CareerProfile, type SkillLevel, type UserSkill } from "@/lib/api";
import { CheckCircle2, Loader, Plus, Target, Trash2 } from "lucide-react";

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-cyan-200/50";

export default function CareerPage() {
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs } = useDocs(accessToken);
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState<SkillLevel>("intermediate");

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([api.getCareerProfile(accessToken), api.listSkills(accessToken)])
      .then(([career, savedSkills]) => { setProfile(career); setSkills(savedSkills); })
      .catch(() => setError("Could not load your career workspace."))
      .finally(() => setBusy(false));
  }, [accessToken]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !profile) return;
    setSaving(true); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const updated = await api.patchCareerProfile(accessToken, {
        headline: String(form.get("headline") || "") || null,
        target_role: String(form.get("target_role") || "") || null,
        target_company: String(form.get("target_company") || "") || null,
        linkedin_url: String(form.get("linkedin_url") || "") || null,
        github_url: String(form.get("github_url") || "") || null,
        resume_document_id: String(form.get("resume_document_id") || "") || null,
      });
      setProfile(updated);
    } catch {
      setError("Could not save the career profile. Check the links and try again.");
    } finally { setSaving(false); }
  }

  async function addSkill(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || !skill.trim()) return;
    try {
      const saved = await api.saveSkill(accessToken, { skill_name: skill.trim(), proficiency_level: level });
      setSkills((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.skill_name.localeCompare(b.skill_name)));
      setSkill("");
    } catch { setError("Could not save this skill."); }
  }

  async function removeSkill(id: string) {
    if (!accessToken) return;
    await api.deleteSkill(accessToken, id);
    setSkills((current) => current.filter((item) => item.id !== id));
  }

  if (loading || busy) return <div className="flex min-h-screen items-center justify-center bg-[#05070d]"><Loader className="animate-spin text-cyan-200" /></div>;
  if (!user || !profile) return null;

  return <AppShell user={{ name: user.email?.split("@")[0] ?? "Scholar", email: user.email ?? "" }} title="Career profile" subtitle="Set your direction and build an evidence-backed skill inventory." isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <form onSubmit={saveProfile} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-cyan-200/10 p-3 text-cyan-100"><Target size={22} /></div><div><h2 className="text-xl font-black text-white">Your career direction</h2><p className="mt-1 text-sm text-white/45">This becomes the source of truth for future gap analysis.</p></div></div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-white/70 sm:col-span-2">Professional headline<input name="headline" className={inputClass} defaultValue={profile.headline ?? ""} placeholder="e.g. Computer science student focused on backend engineering" /></label>
          <label className="text-sm font-bold text-white/70">Target role<input name="target_role" className={inputClass} defaultValue={profile.target_role ?? ""} placeholder="e.g. Software Engineer" /></label>
          <label className="text-sm font-bold text-white/70">Target company<input name="target_company" className={inputClass} defaultValue={profile.target_company ?? ""} placeholder="Optional" /></label>
          <label className="text-sm font-bold text-white/70">GitHub URL<input name="github_url" type="url" className={inputClass} defaultValue={profile.github_url ?? ""} placeholder="https://github.com/username" /></label>
          <label className="text-sm font-bold text-white/70">LinkedIn URL<input name="linkedin_url" type="url" className={inputClass} defaultValue={profile.linkedin_url ?? ""} placeholder="https://linkedin.com/in/username" /></label>
          <label className="text-sm font-bold text-white/70 sm:col-span-2">Resume evidence<select name="resume_document_id" className={inputClass} defaultValue={profile.resume_document_id ?? ""}><option value="">No uploaded resume selected</option>{docs.filter((document) => document.status === "ready").map((document) => <option key={document.id} value={document.id}>{document.title ?? document.original_file_name}</option>)}</select><span className="mt-1 block text-xs font-medium text-white/35">Upload a text-based resume in the library first; analysis will be added in the next Phase 3 slice.</span></label>
        </div>
        {error && <p className="mt-4 text-sm font-bold text-rose-200">{error}</p>}
        <button disabled={saving} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-200 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60"><CheckCircle2 size={16} />{saving ? "Saving…" : "Save direction"}</button>
      </form>
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-8"><h2 className="text-xl font-black text-white">Skills inventory</h2><p className="mt-1 text-sm text-white/45">Add skills you can later validate with projects and a resume.</p>
        <form onSubmit={addSkill} className="mt-6 space-y-3"><input value={skill} onChange={(event) => setSkill(event.target.value)} className={inputClass} placeholder="e.g. Python" /><select value={level} onChange={(event) => setLevel(event.target.value as SkillLevel)} className={inputClass}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><button className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-200/10 px-4 py-2.5 text-sm font-black text-cyan-100"><Plus size={16} />Add skill</button></form>
        <div className="mt-6 space-y-2">{skills.length === 0 ? <p className="text-sm text-white/38">No skills yet. Start with the tools you use confidently.</p> : skills.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2"><div><p className="font-bold text-white">{item.skill_name}</p><p className="text-xs capitalize text-white/42">{item.proficiency_level ?? "Unrated"}</p></div><button onClick={() => removeSkill(item.id)} aria-label={`Remove ${item.skill_name}`} className="p-2 text-white/35 hover:text-rose-200"><Trash2 size={16} /></button></div>)}</div>
      </section>
    </div>
  </AppShell>;
}
