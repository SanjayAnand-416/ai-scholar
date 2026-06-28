"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? "/profile" : "/auth");
    });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </main>
  );
}
