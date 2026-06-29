"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  GraduationCap, UploadCloud, Search, Brain,
  ShieldCheck, Zap, PlayCircle, FileText, Check,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, []);

  const features = [
    { Icon: UploadCloud, title: "Smart Upload", desc: "Drag & drop your PDFs. Our AI extracts, indexes, and prepares every document instantly." },
    { Icon: Search, title: "Deep Search", desc: "Find any concept across all your documents in seconds with semantic AI search." },
    { Icon: Brain, title: "AI Study Tools", desc: "Auto-generated quizzes, summaries, and flashcards — coming in the next phase." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", fontFamily: "var(--font-sans)" }}>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(248,250,252,0.85)", backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--line)",
        padding: "0 48px", display: "flex", alignItems: "center", gap: 32, height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 18, letterSpacing: "-0.03em", color: "var(--text-primary)", flex: "none" }}>
          <div style={{ width: 28, height: 28, background: "var(--gradient-primary)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={15} color="#fff" strokeWidth={2} />
          </div>
          <span>
            <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
            {" "}Scholar
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {["Features", "Pricing", "Blog"].map((l) => (
          <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14.5, fontWeight: 500, color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>{l}</a>
        ))}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/auth")} style={{ height: 36, padding: "0 16px", background: "transparent", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>
            Log in
          </button>
          <button onClick={() => router.push("/auth")} style={{ height: 36, padding: "0 16px", background: "var(--gradient-primary)", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        background: "var(--gradient-hero)",
        padding: "80px 48px 100px",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 64, minHeight: "calc(100vh - 64px)",
        flexWrap: "wrap",
      }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", background: "var(--indigo-100)",
            borderRadius: "var(--radius-pill)", marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--indigo-500)", animation: "aisch-pulse 1.8s ease infinite" }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--indigo-600)", letterSpacing: "0.02em" }}>Now in early access</span>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, color: "var(--text-primary)", margin: "0 0 22px" }}>
            Study smarter with{" "}
            <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI-powered</span>
            {" "}research
          </h1>

          <p style={{ fontSize: 18, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 36px", maxWidth: 480 }}>
            Upload your PDFs, textbooks, and lecture notes. AI Scholar organises, indexes, and helps you study — so nothing falls through the cracks.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/auth")} style={{
              height: 52, padding: "0 28px",
              background: "var(--gradient-primary)", border: "none",
              borderRadius: "var(--radius-lg)", fontFamily: "var(--font-sans)",
              fontSize: 16, fontWeight: 600, color: "#fff", cursor: "pointer",
              boxShadow: "var(--shadow-primary)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Zap size={18} strokeWidth={2} /> Start for free
            </button>
            <button onClick={() => router.push("/auth")} style={{
              height: 52, padding: "0 28px",
              background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)",
              border: "1px solid var(--line-strong)", borderRadius: "var(--radius-lg)",
              fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 600,
              color: "var(--text-primary)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <PlayCircle size={18} strokeWidth={1.75} /> See it in action
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} strokeWidth={1.75} /> No credit card · Free forever on basic plan
          </p>
        </div>

        {/* Hero illustration */}
        <div style={{ position: "relative", width: 400, height: 340, flex: "none" }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "var(--radius-2xl)" }}>
            <div style={{ position: "absolute", width: 280, height: 280, top: -20, right: -20, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)", filter: "blur(40px)" }} />
            <div style={{ position: "absolute", width: 220, height: 220, bottom: 0, left: 20, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", filter: "blur(30px)" }} />
          </div>
          <div style={{
            position: "absolute", top: 30, left: 20, right: 20,
            background: "rgba(255,255,255,0.72)", backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: "var(--radius-2xl)", padding: "24px 24px 20px",
            boxShadow: "0 24px 48px rgba(99,102,241,0.12), 0 4px 12px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: "var(--radius-md)", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>Organic Chemistry Notes</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>organic-chem.pdf · 2.4 MB</div>
              </div>
              <div style={{ marginLeft: "auto", padding: "4px 10px", background: "var(--status-ready-bg)", color: "var(--status-ready)", borderRadius: "var(--radius-pill)", fontSize: 11.5, fontWeight: 700 }}>Ready</div>
            </div>
            {[70, 55, 85, 40].map((w, i) => (
              <div key={i} style={{ height: 7, borderRadius: 4, background: i === 0 ? "var(--gradient-primary)" : "var(--line)", width: w + "%", marginBottom: i < 3 ? 9 : 0, opacity: i === 0 ? 1 : 0.5 }} />
            ))}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              {["Concepts", "Formulas", "Practice"].map((tag) => (
                <span key={tag} style={{ padding: "4px 10px", background: "var(--indigo-050)", color: "var(--indigo-600)", borderRadius: "var(--radius-pill)", fontSize: 12, fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={{
            position: "absolute", bottom: 20, right: 10,
            background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: "var(--radius-lg)", padding: "10px 14px",
            boxShadow: "var(--shadow-md)", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Processing complete</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>3 documents ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: "80px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", padding: "5px 14px", background: "var(--indigo-050)", borderRadius: "var(--radius-pill)", marginBottom: 16 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--indigo-600)", letterSpacing: "0.06em", textTransform: "uppercase" }}>How it works</span>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0 }}>
            Everything you need to ace your studies
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {features.map(({ Icon, title, desc }) => (
            <div key={title} style={{ background: "var(--surface-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", padding: 28, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
                <Icon size={22} color="#fff" strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>{title}</h3>
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
