"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, UploadCloud, Library, UserRound,
  MessagesSquare, ListChecks, Compass, Briefcase,
  GraduationCap, LogOut, Sun, Moon, Lock,
} from "lucide-react";

interface AppShellProps {
  user: { name: string; email: string };
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isDark: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

const LIVE_NAV = [
  { key: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "/upload",    label: "Upload",    Icon: UploadCloud },
  { key: "/library",  label: "Library",   Icon: Library },
  { key: "/profile",  label: "Profile",   Icon: UserRound },
];

const LOCKED_NAV = [
  { label: "Chat",       Icon: MessagesSquare },
  { label: "Quizzes",   Icon: ListChecks },
  { label: "Study Plan", Icon: Compass },
  { label: "Career",    Icon: Briefcase },
];

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
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

export default function AppShell({ user, title, subtitle, actions, isDark, onToggleDark, onSignOut, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-app)", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: "var(--sidebar-w)", flex: "none",
        background: "var(--surface-card)",
        borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
        padding: "16px 14px 0", gap: 0,
      }}>
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "6px 10px 18px",
          borderBottom: "1px solid var(--line)", marginBottom: 12,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "var(--gradient-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <GraduationCap size={14} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
            {" "}Scholar
          </span>
        </div>

        {/* Live nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {LIVE_NAV.map(({ key, label, Icon }) => {
            const active = pathname === key;
            return (
              <button key={key} onClick={() => router.push(key)} style={{
                display: "flex", alignItems: "center", gap: 10,
                height: 38, padding: "0 10px",
                borderRadius: "var(--radius-sm)", border: "none",
                background: active ? "var(--gradient-primary)" : "transparent",
                color: active ? "#fff" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", textAlign: "left",
                transition: "background var(--dur-fast), color var(--dur-fast)",
              }}>
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Coming soon */}
        <div style={{
          margin: "14px 10px 8px",
          fontSize: 10.5, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--text-muted)",
        }}>
          Coming soon
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {LOCKED_NAV.map(({ label, Icon }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10,
              height: 38, padding: "0 10px",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)", fontSize: 14, fontWeight: 600,
              opacity: 0.6, cursor: "default",
            }}>
              <Icon size={16} strokeWidth={1.75} />
              {label}
              <Lock size={11} strokeWidth={2} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Dark mode toggle */}
        <button onClick={onToggleDark} style={{
          display: "flex", alignItems: "center", gap: 8,
          height: 36, padding: "0 10px", marginBottom: 10,
          border: "1px solid var(--line)", borderRadius: "var(--radius-md)",
          background: "transparent", cursor: "pointer",
          fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
          color: "var(--text-muted)",
        }}>
          {isDark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
          {isDark ? "Light mode" : "Dark mode"}
        </button>

        {/* User footer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 10px 16px",
          borderTop: "1px solid var(--line)",
        }}>
          <Avatar name={user.name} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{user.name}</div>
            <div style={{
              fontSize: 11.5, color: "var(--text-muted)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{user.email}</div>
          </div>
          <button onClick={onSignOut} style={{
            border: "none", background: "none", cursor: "pointer",
            color: "var(--text-muted)", padding: 4,
            borderRadius: "var(--radius-sm)", display: "flex",
          }}>
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Topbar */}
        <header style={{
          height: "var(--topbar-h)", flex: "none",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface-card)",
          display: "flex", alignItems: "center",
          padding: "0 32px", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0, fontSize: 18, fontWeight: 700,
              letterSpacing: "-0.025em", color: "var(--text-primary)", lineHeight: 1.2,
            }}>{title}</h1>
            {subtitle && (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 1 }}>{subtitle}</div>
            )}
          </div>
          {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: "auto", padding: "32px" }}>
          <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
