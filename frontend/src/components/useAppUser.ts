"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/api";
import { api } from "@/lib/api";

export interface AppUser {
  id: string;
  name: string;
  email: string;
}

export function useAppUser() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dark = localStorage.getItem("aisch-dark") === "1";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth"); return; }
      setAccessToken(session.access_token);
      const email = session.user.email ?? "";
      let name = session.user.user_metadata?.full_name ?? email.split("@")[0];
      try {
        const p = await api.getProfile(session.access_token);
        setProfile(p);
        if (p.full_name) name = p.full_name;
      } catch {}
      setUser({ id: session.user.id, name, email });
      setLoading(false);
    })();

    // Keep accessToken fresh when Supabase refreshes the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setAccessToken(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggleDark = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("aisch-dark", next ? "1" : "0");
  }, [isDark]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/");
  }, []);

  return { user, profile, accessToken, isDark, toggleDark, signOut, loading, setProfile };
}
