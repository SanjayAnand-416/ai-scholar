"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Globe,
  GraduationCap,
  Loader,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Mode = "login" | "signup";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function AuthNotice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const isError = tone === "error";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs font-bold leading-5 ${
        isError
          ? "border-rose-200/20 bg-rose-200/10 text-rose-100"
          : "border-emerald-200/20 bg-emerald-200/10 text-emerald-100"
      }`}
      role={isError ? "alert" : "status"}
    >
      {isError ? <AlertCircle className="mt-0.5 shrink-0" size={15} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={15} />}
      <span>{children}</span>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isLogin = mode === "login";

  const emailError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!isValidEmail(email)) return "Enter a valid email address.";
    return null;
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "Password is required.";
    if (!isLogin && password.length < 8) return "Use at least 8 characters.";
    return null;
  }, [isLogin, password]);

  const canSubmit = !emailError && !passwordError && !loading && !googleLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError) return;

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
    setError(null);
    setMessage(null);
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) setError(error.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070d] px-4 py-4 text-white sm:px-5 lg:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#05070d_0%,#0a1020_46%,#111827_100%)]" />
        <div className="absolute inset-0 aisch-dark-grid opacity-30" />
        <div className="absolute inset-0 aisch-luxury-grain opacity-25" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />
      </div>

      <section className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[980px] items-center gap-4 lg:grid-cols-[minmax(0,0.84fr)_minmax(360px,0.7fr)] xl:max-w-[1040px]">
        <div className="hidden min-h-[560px] flex-col justify-between rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl lg:flex">
          <button onClick={() => router.push("/")} className="group flex w-fit items-center gap-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.07] shadow-lg shadow-black/15 transition-transform duration-300 group-hover:scale-105">
              <GraduationCap size={20} />
            </span>
            <span>
              <span className="block text-xl font-black text-white">AI Scholar</span>
              <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Learning OS</span>
            </span>
          </button>

          <div className="space-y-5">
            <div>
              <p className="aisch-kicker">Secure study workspace</p>
              <h1 className="mt-3 max-w-md text-4xl font-black leading-[1.08] text-white">
                Your calm command center for cited AI learning.
              </h1>
              <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-white/55">
                Sign in to return to documents, grounded chats, upload queues, and progress signals in the same premium interface as the workspace.
              </p>
            </div>

            <div className="grid max-w-md grid-cols-3 gap-2.5">
              {[
                { label: "PDFs indexed", value: "42", Icon: FileText },
                { label: "Cited answers", value: "1.2k", Icon: BookOpenCheck },
                { label: "Secure auth", value: "Supa", Icon: ShieldCheck },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-[18px] border border-white/10 bg-white/[0.06] p-3 shadow-lg shadow-black/10">
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100/12 text-cyan-100">
                    <Icon size={15} />
                  </div>
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/36">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-cyan-300/14 via-white/[0.04] to-indigo-300/12 p-4 shadow-2xl shadow-black/16">
            <div className="mb-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Today</p>
                <p className="mt-1 text-base font-black text-white">Study readiness</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-200 text-slate-950">
                <Sparkles size={16} />
              </span>
            </div>
            <div className="space-y-2">
              {["Citation review", "Upload processing", "Exam revision"].map((item, index) => (
                <div key={item} className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-[11px] font-black text-cyan-100">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-xs font-bold text-white/66">{item}</span>
                  <CheckCircle2 size={14} className="text-emerald-200" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[380px] lg:max-w-none">
          <button onClick={() => router.push("/")} className="mx-auto mb-4 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.07] shadow-lg shadow-black/15">
              <GraduationCap size={19} />
            </span>
            <span className="text-xl font-black">AI Scholar</span>
          </button>

          <div className="aisch-surface overflow-hidden rounded-[28px]">
            <div className="border-b border-white/10 bg-white/[0.035] p-4 sm:p-5">
              <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/[0.055] p-1">
                {(["login", "signup"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item);
                      setError(null);
                      setMessage(null);
                      setTouched({ email: false, password: false });
                    }}
                    className={`h-8 rounded-xl px-3.5 text-xs font-black transition-all duration-300 ${
                      mode === item ? "bg-cyan-100 text-slate-950 shadow-lg shadow-cyan-300/10" : "text-white/48 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    {item === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              <p className="aisch-kicker">{isLogin ? "Welcome back" : "Begin your workspace"}</p>
              <h2 className="mt-2.5 text-2xl font-black leading-tight text-white sm:text-3xl">
                {isLogin ? "Sign in to AI Scholar" : "Create your account"}
              </h2>
              <p className="mt-2.5 text-xs font-semibold leading-5 text-white/50">
                {isLogin ? "Return to your citation-ready study workspace." : "Start building a focused AI library for your coursework."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 p-4 sm:p-5" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-white/76">Email address</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/34" size={15} />
                  <input
                    type="email"
                    required
                    value={email}
                    onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="you@university.edu"
                    aria-invalid={Boolean(touched.email && emailError)}
                    aria-describedby={touched.email && emailError ? "email-error" : undefined}
                    className={`aisch-field h-11 w-full rounded-xl px-10 text-xs font-semibold outline-none ${
                      touched.email && emailError ? "border-rose-200/45 bg-rose-200/10" : ""
                    }`}
                  />
                </span>
                {touched.email && emailError && (
                  <p id="email-error" className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-100">
                    <AlertCircle size={13} /> {emailError}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-xs font-black text-white/76">
                  Password
                  {isLogin && (
                    <button type="button" className="text-[11px] font-black text-cyan-100/70 transition-colors hover:text-cyan-100">
                      Forgot?
                    </button>
                  )}
                </span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/34" size={15} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                    aria-invalid={Boolean(touched.password && passwordError)}
                    aria-describedby={touched.password && passwordError ? "password-error" : undefined}
                    className={`aisch-field h-11 w-full rounded-xl px-10 pr-11 text-xs font-semibold outline-none ${
                      touched.password && passwordError ? "border-rose-200/45 bg-rose-200/10" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/42 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
                {touched.password && passwordError && (
                  <p id="password-error" className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-100">
                    <AlertCircle size={13} /> {passwordError}
                  </p>
                )}
              </label>

              {isLogin ? (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-xs font-semibold text-white/56">
                  <span>Remember me on this device</span>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-cyan-200" />
                </label>
              ) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-white/42">
                  By continuing you agree to the Terms and Privacy Policy.
                </p>
              )}

              {error && <AuthNotice tone="error">{error}</AuthNotice>}
              {message && <AuthNotice tone="success">{message}</AuthNotice>}

              <button
                type="submit"
                disabled={!canSubmit}
                className="aisch-button-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : null}
                {loading ? "Please wait" : isLogin ? "Log in" : "Create account"}
                {!loading ? <ArrowRight size={15} /> : null}
              </button>

              <div className="flex items-center gap-2.5">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">or</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading || googleLoading}
                className="aisch-button-secondary flex h-11 w-full items-center justify-center gap-2.5 rounded-xl text-xs font-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {googleLoading ? <Loader size={16} className="animate-spin" /> : <Globe size={16} />}
                {googleLoading ? "Connecting" : "Continue with Google"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs font-semibold text-white/42">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setMode(isLogin ? "signup" : "login");
                setError(null);
                setMessage(null);
                setTouched({ email: false, password: false });
              }}
              className="font-black text-cyan-100/80 transition-colors hover:text-cyan-100"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white/34">
            <ShieldCheck size={13} />
            Secured by Supabase Auth
          </p>
        </div>
      </section>
    </main>
  );
}
