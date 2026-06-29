"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, Globe } from "lucide-react";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "48px 24px", background: "var(--bg-app)",
    }}>
      <div style={{ width: 416, maxWidth: "100%" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 32, height: 32, background: "var(--gradient-primary)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16 }}>🎓</span>
          </div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
            {" "}Scholar
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--surface-card)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: 32,
        }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text-primary)", margin: "0 0 6px" }}>
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: 14.5, color: "var(--text-muted)" }}>
            {isLogin ? "Sign in to your study library." : "Start building your study library in minutes."}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                style={{
                  width: "100%", height: 42, padding: "0 12px",
                  fontFamily: "var(--font-sans)", fontSize: 14.5,
                  color: "var(--text-primary)", background: "var(--surface-card)",
                  border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color var(--dur-fast)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--indigo-400)"; e.currentTarget.style.boxShadow = "var(--shadow-focus)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Password</label>
                {isLogin && (
                  <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12.5, color: "var(--indigo-600)", fontWeight: 500 }}>Forgot password?</a>
                )}
              </div>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                style={{
                  width: "100%", height: 42, padding: "0 12px",
                  fontFamily: "var(--font-sans)", fontSize: 14.5,
                  color: "var(--text-primary)", background: "var(--surface-card)",
                  border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color var(--dur-fast)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--indigo-400)"; e.currentTarget.style.boxShadow = "var(--shadow-focus)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* Remember / Terms */}
            {isLogin ? (
              <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--indigo-500)", cursor: "pointer" }} />
                <span style={{ fontSize: 13.5, color: "var(--text-secondary)", fontWeight: 500 }}>Remember me on this device</span>
              </label>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                By continuing you agree to the Terms and Privacy Policy.
              </p>
            )}

            {error && <p style={{ fontSize: 13.5, color: "var(--status-error)", margin: 0, padding: "10px 12px", background: "var(--status-error-bg)", borderRadius: "var(--radius-sm)" }}>{error}</p>}
            {message && <p style={{ fontSize: 13.5, color: "var(--status-success)", margin: 0, padding: "10px 12px", background: "var(--status-success-bg)", borderRadius: "var(--radius-sm)" }}>{message}</p>}

            <button type="submit" disabled={loading} style={{
              height: 46, width: "100%",
              background: loading ? "var(--indigo-300)" : "var(--gradient-primary)",
              border: "none", borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-sans)", fontSize: 15.5, fontWeight: 600, color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "var(--shadow-primary)",
              transition: "opacity var(--dur-fast)",
            }}>
              {loading ? "Please wait…" : isLogin ? "Log in" : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>or</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          <button onClick={handleGoogle} style={{
            height: 46, width: "100%",
            background: "var(--surface-card)", border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)",
            fontSize: 15, fontWeight: 600, color: "var(--text-primary)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "background var(--dur-fast)",
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--indigo-050)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface-card)"}
          >
            <Globe size={18} strokeWidth={1.75} color="var(--text-secondary)" />
            Continue with Google
          </button>
        </div>

        {/* Switch mode */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(isLogin ? "signup" : "login"); setError(null); setMessage(null); }}
            style={{ color: "var(--indigo-600)", fontWeight: 600 }}>
            {isLogin ? "Sign up" : "Log in"}
          </a>
        </p>

        <p style={{ textAlign: "center", marginTop: 14, fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <ShieldCheck size={13} strokeWidth={1.75} />
          Secured by Supabase Auth
        </p>
      </div>
    </div>
  );
}
