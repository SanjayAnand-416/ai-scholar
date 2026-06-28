"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { api, Profile, ProfilePatch } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Editable fields only (email excluded per spec §6.2)
  const [form, setForm] = useState<ProfilePatch>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth");
        return;
      }
      try {
        const p = await api.getProfile(session.access_token);
        if (!mounted) return;
        setProfile(p);
        setForm({
          full_name: p.full_name ?? "",
          avatar_url: p.avatar_url ?? "",
          college_name: p.college_name ?? "",
          degree: p.degree ?? "",
          branch: p.branch ?? "",
          graduation_year: p.graduation_year ?? undefined,
          career_goal: p.career_goal ?? "",
        });
      } catch {
        if (mounted) setError("Failed to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth"); return; }
      const updated = await api.patchProfile(session.access_token, form);
      setProfile(updated);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as Record<string, unknown>)?.error
        ? JSON.stringify((err as Record<string, unknown>).error)
        : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  function field(
    label: string,
    key: keyof ProfilePatch,
    type: string = "text",
  ) {
    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          value={(form[key] as string) ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [key]: type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value,
            }))
          }
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>

        {profile && (
          <p className="text-sm text-gray-500">
            <span className="font-medium">Email (read-only):</span> {profile.email}
          </p>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-6 space-y-4">
          {field("Full name", "full_name")}
          {field("Avatar URL", "avatar_url")}
          {field("College", "college_name")}
          {field("Degree", "degree")}
          {field("Branch / Major", "branch")}
          {field("Graduation year", "graduation_year", "number")}
          {field("Career goal", "career_goal")}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Profile saved.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </main>
  );
}
