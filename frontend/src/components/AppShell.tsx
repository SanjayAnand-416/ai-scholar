"use client";

import type { ComponentType, KeyboardEvent, ReactNode, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  BrainCircuit,
  ChevronRight,
  FileText,
  FolderOpen,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Library,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Moon,
  Network,
  PanelTopOpen,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TimerReset,
  Trophy,
  UploadCloud,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

interface AppShellProps {
  user: { name: string; email: string };
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  isDark: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
  children: ReactNode;
  /**
   * When true the <main> element becomes overflow-hidden with no padding so
   * the child page can own its own layout and scrolling completely.
   */
  fullHeight?: boolean;
}

type PreviewTone = "blue" | "cyan" | "emerald" | "violet" | "rose" | "amber";

type NavItem = {
  label: string;
  route: string;
  Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  eyebrow: string;
  description: string;
  metric: string;
  accent: PreviewTone;
  preview: "dashboard" | "assistant" | "notes" | "flashcards" | "quiz" | "maps" | "research" | "progress" | "resources" | "pricing" | "contact";
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    route: "/dashboard",
    Icon: LayoutDashboard,
    eyebrow: "Command center",
    description: "Live study statistics, document health, and next best actions in one calm cockpit.",
    metric: "84% weekly focus",
    accent: "blue",
    preview: "dashboard",
  },
  {
    label: "AI Study Assistant",
    route: "/library",
    Icon: BrainCircuit,
    eyebrow: "Grounded tutor",
    description: "Ask questions against your library with citation-aware answers and session memory.",
    metric: "12 active chats",
    accent: "cyan",
    preview: "assistant",
  },
  {
    label: "Smart Notes",
    route: "/library",
    Icon: BookOpenCheck,
    eyebrow: "Structured recall",
    description: "Turn dense readings into crisp outlines, linked ideas, and review-ready summaries.",
    metric: "38 notes refined",
    accent: "emerald",
    preview: "notes",
  },
  {
    label: "Flashcards",
    route: "/flashcards",
    Icon: PanelTopOpen,
    eyebrow: "Memory engine",
    description: "Adaptive cards surface weak concepts at the right moment for long-term retention.",
    metric: "126 cards queued",
    accent: "violet",
    preview: "flashcards",
  },
  {
    label: "Quiz Generator",
    route: "/quiz",
    Icon: Target,
    eyebrow: "Assessment studio",
    description: "Generate quizzes from PDFs and track score trends by concept, source, and attempt.",
    metric: "91% latest score",
    accent: "rose",
    preview: "quiz",
  },
  {
    label: "Mind Maps",
    route: "/knowledge-graph",
    Icon: Network,
    eyebrow: "Concept graph",
    description: "Explore how ideas connect across documents, classes, and research sessions.",
    metric: "54 linked ideas",
    accent: "cyan",
    preview: "maps",
  },
  {
    label: "Research Assistant",
    route: "/upload",
    Icon: FileText,
    eyebrow: "Citation workflow",
    description: "Upload papers, extract claims, compare sources, and keep evidence close at hand.",
    metric: "8 PDFs indexed",
    accent: "amber",
    preview: "research",
  },
  {
    label: "Progress",
    route: "/profile",
    Icon: Trophy,
    eyebrow: "Momentum",
    description: "Review study streaks, achievements, completion pace, and upcoming milestones.",
    metric: "17 day streak",
    accent: "emerald",
    preview: "progress",
  },
  {
    label: "Resources",
    route: "/library",
    Icon: Library,
    eyebrow: "Knowledge vault",
    description: "Browse saved PDFs, generated materials, and reusable study assets.",
    metric: "42 resources",
    accent: "blue",
    preview: "resources",
  },
  {
    label: "Pricing",
    route: "/",
    Icon: Sparkles,
    eyebrow: "Plans",
    description: "Choose the workspace capacity and AI tools that match your learning rhythm.",
    metric: "Pro workspace",
    accent: "violet",
    preview: "pricing",
  },
  {
    label: "Contact",
    route: "/",
    Icon: MessageCircle,
    eyebrow: "Concierge",
    description: "Get help with setup, feedback, account questions, and research workflows.",
    metric: "Fast support",
    accent: "cyan",
    preview: "contact",
  },
];

const NAV_GROUPS = [
  { label: "Workspace", items: NAV_ITEMS.slice(0, 3) },
  { label: "Create", items: NAV_ITEMS.slice(3, 7) },
  { label: "Account", items: NAV_ITEMS.slice(7) },
];

const QUICK_CARDS = [
  { label: "Recent Activity", value: "3 papers summarized", Icon: TimerReset, tone: "from-cyan-300/20 to-white/[0.03]" },
  { label: "Continue Learning", value: "Neural retrieval systems", Icon: Play, tone: "from-emerald-300/20 to-white/[0.03]" },
  { label: "Saved PDFs", value: "8 ready for chat", Icon: FolderOpen, tone: "from-blue-300/20 to-white/[0.03]" },
  { label: "Recent AI Chats", value: "Citation review open", Icon: MessagesSquare, tone: "from-violet-300/20 to-white/[0.03]" },
  { label: "Study Streak", value: "17 days polished", Icon: Zap, tone: "from-amber-300/20 to-white/[0.03]" },
];

const ACTIONS = [
  { label: "Upload PDF", route: "/upload", Icon: UploadCloud },
  { label: "Ask AI", route: "/library", Icon: WandSparkles },
  { label: "Resume Session", route: "/library", Icon: ArrowRight },
];

const toneClasses: Record<PreviewTone, string> = {
  blue: "from-blue-400/25 via-indigo-300/10 to-white/[0.03]",
  cyan: "from-cyan-300/25 via-sky-300/10 to-white/[0.03]",
  emerald: "from-emerald-300/25 via-teal-300/10 to-white/[0.03]",
  violet: "from-violet-300/25 via-fuchsia-300/10 to-white/[0.03]",
  rose: "from-rose-300/25 via-pink-300/10 to-white/[0.03]",
  amber: "from-amber-300/25 via-orange-300/10 to-white/[0.03]",
};

const panel = "rounded-[24px] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl";

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-cyan-100 font-black text-slate-950 shadow-lg shadow-cyan-950/20 ring-1 ring-white/50"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials || "AS"}
    </div>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <span className="relative h-5 w-5" aria-hidden="true">
      <motion.span
        className="absolute left-0 top-[4px] h-[2px] w-5 rounded-full bg-current"
        animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      />
      <motion.span
        className="absolute left-0 top-[10px] h-[2px] w-5 rounded-full bg-current"
        animate={open ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.span
        className="absolute left-0 top-[16px] h-[2px] w-5 rounded-full bg-current"
        animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      />
    </span>
  );
}

function MiniChart({ accent }: { accent: PreviewTone }) {
  const bars = [42, 68, 54, 86, 72, 94, 78];
  return (
    <div className="flex h-36 items-end gap-3 rounded-[22px] border border-white/10 bg-black/15 p-5">
      {bars.map((height, index) => (
        <motion.div
          key={height}
          className={`flex-1 rounded-t-full bg-gradient-to-t ${toneClasses[accent]}`}
          initial={{ height: 10, opacity: 0.3 }}
          animate={{ height: `${height}%`, opacity: 1 }}
          transition={{ delay: index * 0.04, type: "spring", stiffness: 180, damping: 22 }}
        />
      ))}
    </div>
  );
}

function MindMapPreview() {
  const nodes = [
    "left-[46%] top-[42%] h-20 w-20",
    "left-[12%] top-[18%] h-14 w-14",
    "right-[14%] top-[16%] h-16 w-16",
    "left-[20%] bottom-[16%] h-16 w-16",
    "right-[18%] bottom-[18%] h-14 w-14",
  ];

  return (
    <div className="relative h-72 overflow-hidden rounded-[24px] border border-white/10 bg-black/15">
      <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 420 280" aria-hidden="true">
        <motion.path d="M205 130 L70 62 M205 130 L348 62 M205 130 L92 230 M205 130 L335 220" stroke="rgba(125, 211, 252, .55)" strokeWidth="1.5" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1 }} />
      </svg>
      {nodes.map((node, index) => (
        <motion.div
          key={node}
          className={`absolute ${node} rounded-full border border-white/15 bg-white/[0.08] shadow-2xl shadow-cyan-500/10 backdrop-blur-xl`}
          animate={{ y: [0, index % 2 ? 8 : -8, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 4 + index * 0.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-2 rounded-full bg-cyan-200/15" />
        </motion.div>
      ))}
    </div>
  );
}

function PreviewGraphic({ item }: { item: NavItem }) {
  if (item.preview === "maps") {
    return <MindMapPreview />;
  }

  if (item.preview === "flashcards") {
    return (
      <div className="relative h-72 overflow-hidden rounded-[24px] border border-white/10 bg-black/15 p-6">
        {[0, 1, 2].map((card) => (
          <motion.div
            key={card}
            className="absolute left-8 right-8 rounded-[22px] border border-white/12 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
            initial={{ y: 44 + card * 28, rotate: -3 + card * 3, opacity: 0 }}
            animate={{ y: 22 + card * 34, rotate: -4 + card * 4, opacity: 1 }}
            transition={{ delay: card * 0.08, type: "spring", stiffness: 170, damping: 24 }}
          >
            <div className="mb-8 h-2 w-24 rounded-full bg-violet-200/55" />
            <div className="h-3 w-full rounded-full bg-white/20" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-white/12" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (item.preview === "quiz") {
    return (
      <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-bold text-white/70">Adaptive quiz</span>
          <span className="rounded-full bg-rose-200/15 px-3 py-1 text-xs font-black text-rose-100">91%</span>
        </div>
        <div className="space-y-3">
          {["Source accuracy", "Concept recall", "Reasoning"].map((label, index) => (
            <div key={label} className="rounded-2xl bg-white/[0.055] p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-bold text-white/55">
                <span>{label}</span>
                <span>{82 + index * 6}%</span>
              </div>
              <motion.div className="h-2 rounded-full bg-rose-200/25" initial={{ width: "24%" }} animate={{ width: `${82 + index * 6}%` }} transition={{ delay: index * 0.1, type: "spring", stiffness: 140, damping: 20 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <MiniChart accent={item.accent} />;
}

function DynamicPreview({ item }: { item: NavItem }) {
  return (
    <motion.section
      key={item.label}
      className={`${panel} relative min-h-[520px] overflow-hidden bg-gradient-to-br ${toneClasses[item.accent]} p-6 lg:p-8`}
      initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, scale: 0.985, filter: "blur(10px)" }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pointer-events-none absolute right-[-22%] top-[-18%] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="relative">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">{item.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-4xl">{item.label}</h2>
          </div>
          <motion.div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08]" whileHover={{ rotate: 5, scale: 1.05 }}>
            <item.Icon size={25} />
          </motion.div>
        </div>
        <p className="max-w-xl text-base font-semibold leading-7 text-white/68">{item.description}</p>

        <div className="my-7 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.065] p-4 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Signal</p>
            <p className="mt-2 text-2xl font-black text-white">{item.metric}</p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.065] p-4 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">AI confidence</p>
            <p className="mt-2 text-2xl font-black text-white">High</p>
          </div>
        </div>

        <PreviewGraphic item={item} />
      </div>
    </motion.section>
  );
}

function useFocusTrap(open: boolean, ref: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const first = focusable()[0];
    first?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = focusable();
      if (!nodes.length) return;

      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, ref, onClose]);
}

export default function AppShell({
  user,
  title,
  subtitle,
  actions,
  isDark,
  onToggleDark,
  onSignOut,
  children,
  fullHeight = false,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeFromRoute = useMemo(() => NAV_ITEMS.find((item) => pathname === item.route || (item.route === "/library" && pathname.startsWith("/chat"))) ?? NAV_ITEMS[0], [pathname]);
  const [activeItem, setActiveItem] = useState<NavItem>(activeFromRoute);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const navButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useFocusTrap(menuOpen, overlayRef, () => setMenuOpen(false));

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const navigate = (route: string) => {
    setMenuOpen(false);
    router.push(route);
  };

  const handleNavKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const nextIndex = event.key === "ArrowDown" ? (index + 1) % NAV_ITEMS.length : (index - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
    setActiveItem(NAV_ITEMS[nextIndex]);
    navButtonRefs.current[nextIndex]?.focus();
  };

  const shellTransition: Transition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.72, ease: [0.16, 1, 0.3, 1] };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-72 top-[-14rem] h-96 w-96 rounded-full bg-cyan-300/16 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-violet-300/14 blur-3xl" />
        <div className="absolute inset-0 aisch-dark-grid opacity-30" />
        <div className="absolute inset-0 aisch-luxury-grain opacity-25" />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-white/10 bg-white/[0.055] px-4 py-4 shadow-2xl shadow-black/10 backdrop-blur-2xl sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full min-w-0 max-w-[1440px] items-center gap-3 sm:gap-4">
            <motion.button
              onClick={() => {
                setActiveItem(activeFromRoute);
                setMenuOpen(true);
              }}
              className="group flex h-12 shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm font-black text-white shadow-lg shadow-black/10 transition-colors hover:bg-white/[0.11]"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              whileTap={{ scale: 0.97 }}
            >
              <MenuGlyph open={menuOpen} />
              <span className="hidden sm:inline">Menu</span>
            </motion.button>

            <button
              onClick={() => router.push("/dashboard")}
              className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white shadow-lg shadow-black/15 sm:flex"
              aria-label="Dashboard"
            >
              <GraduationCap size={21} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Live workspace
              </div>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white">{title}</h1>
              {subtitle && <p className="mt-0.5 truncate text-sm font-semibold text-white/42">{subtitle}</p>}
            </div>

            <div className="hidden h-11 w-[260px] shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white/36 shadow-sm xl:flex">
              <Search size={16} />
              Search documents, concepts...
            </div>
            <button
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/42 shadow-sm transition-colors hover:bg-white/[0.1] hover:text-white sm:flex"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </button>
            {actions && <div className="flex min-w-0 shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </header>

        <main
          className={
            fullHeight
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-8"
          }
        >
          <div
            className={
              fullHeight
                ? "flex min-h-0 flex-1 flex-col"
                : "mx-auto flex w-full min-h-0 flex-1 flex-col max-w-[1440px]"
            }
          >
            {children}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 overflow-hidden bg-slate-950/72 text-white backdrop-blur-xl"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(22px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={shellTransition}
            role="dialog"
            aria-modal="true"
            aria-label="AI Scholar navigation"
            ref={overlayRef}
          >
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(167,139,250,0.18),transparent_30%),linear-gradient(135deg,#05070d_0%,#0c111d_48%,#111827_100%)]"
              initial={{ x: "-18%" }}
              animate={{ x: 0 }}
              exit={{ x: "-10%" }}
              transition={shellTransition}
            />
            <div className="pointer-events-none absolute inset-0 aisch-luxury-grain opacity-40" />
            <div className="pointer-events-none absolute inset-0">
              {[12, 22, 34, 48, 64, 78].map((left, index) => (
                <motion.span
                  key={left}
                  className="absolute h-1 w-1 rounded-full bg-white/30"
                  style={{ left: `${left}%`, top: `${18 + (index % 3) * 24}%` }}
                  animate={{ y: [0, -18, 0], opacity: [0.18, 0.5, 0.18] }}
                  transition={{ duration: 4 + index, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>

            <motion.div
              className="relative flex h-full flex-col overflow-y-auto px-5 py-5 sm:px-8 lg:px-10"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={shellTransition}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              onDragEnd={(_, info) => {
                if (info.offset.x < -90) setMenuOpen(false);
              }}
            >
              <motion.header
                className="flex shrink-0 items-center justify-between border-b border-white/10 pb-5"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ delay: 0.1, duration: 0.35 }}
              >
                <button onClick={() => navigate("/dashboard")} className="group flex items-center gap-4 text-left">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] shadow-lg shadow-black/15 transition-transform duration-300 group-hover:scale-105">
                    <GraduationCap size={23} />
                  </span>
                  <span>
                    <span className="block text-xl font-black tracking-tight">AI Scholar</span>
                    <span className="mt-1 block text-xs font-bold uppercase tracking-[0.22em] text-white/38">Learning OS</span>
                  </span>
                </button>

                <motion.button
                  onClick={() => setMenuOpen(false)}
                  className="group flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white/80 shadow-lg shadow-black/10 backdrop-blur-xl transition-colors hover:bg-white/[0.1] hover:text-white"
                  aria-label="Close navigation menu"
                  whileTap={{ scale: 0.96 }}
                >
                  <X size={18} className="transition-transform duration-300 group-hover:rotate-90" />
                  <span className="hidden sm:inline">Close</span>
                </motion.button>
              </motion.header>

              <LayoutGroup>
                <div className="grid flex-1 gap-6 py-7 lg:grid-cols-[minmax(260px,0.72fr)_minmax(380px,1.22fr)_minmax(280px,0.86fr)] xl:gap-8">
                  <motion.nav
                    className={`${panel} min-w-0 self-start p-3`}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: prefersReducedMotion ? 0 : 0.045, delayChildren: 0.14 } },
                    }}
                    aria-label="Primary navigation"
                  >
                    <div className="mb-3 flex items-center justify-between px-3 pt-2">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/36">Navigation</p>
                        <p className="mt-1 text-sm font-semibold text-white/50">Study command menu</p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.07] text-white/55">
                        <Sparkles size={16} />
                      </span>
                    </div>

                    <div className="space-y-4">
                      {NAV_GROUPS.map((group) => (
                        <div key={group.label}>
                          <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/32">{group.label}</p>
                          <div className="space-y-1">
                            {group.items.map((item) => {
                              const index = NAV_ITEMS.indexOf(item);
                              const isActive = activeFromRoute.label === item.label;
                              const isPreviewed = activeItem.label === item.label;

                              return (
                                <motion.button
                                  key={item.label}
                                  ref={(node) => {
                                    navButtonRefs.current[index] = node;
                                  }}
                                  onClick={() => navigate(item.route)}
                                  onMouseEnter={() => setActiveItem(item)}
                                  onFocus={() => setActiveItem(item)}
                                  onKeyDown={(event) => handleNavKeyDown(event, index)}
                                  className={`group relative flex min-h-14 w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-all duration-300 ${
                                    isPreviewed ? "bg-white/[0.09] text-white shadow-lg shadow-black/10" : "text-white/58 hover:bg-white/[0.055] hover:text-white"
                                  }`}
                                  variants={{ hidden: { opacity: 0, x: -18 }, show: { opacity: 1, x: 0 } }}
                                  transition={{ type: "spring", stiffness: 190, damping: 24 }}
                                >
                                  {isPreviewed && <motion.span layoutId="preview-nav-bg" className="absolute inset-0 rounded-[18px] border border-white/10" />}
                                  <motion.span
                                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300 ${
                                      isPreviewed ? "border-cyan-200/25 bg-cyan-100/12 text-cyan-100" : "border-white/10 bg-white/[0.055] text-white/60"
                                    }`}
                                    whileHover={{ x: 4, rotate: 4 }}
                                  >
                                    <item.Icon size={17} />
                                  </motion.span>
                                  <span className="relative min-w-0 flex-1">
                                    <span className="block truncate text-[17px] font-black leading-6 tracking-tight xl:text-[18px]">{item.label}</span>
                                    <span className="mt-0.5 block truncate text-xs font-bold text-white/34">{item.eyebrow}</span>
                                    <span className={`absolute -bottom-1 left-0 h-[2px] rounded-full bg-cyan-200 transition-all duration-300 ${isPreviewed ? "w-14 opacity-80" : "w-0 opacity-0 group-hover:w-10 group-hover:opacity-60"}`} />
                                  </span>
                                  {isActive && <motion.span layoutId="active-nav-dot" className="relative h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/40" />}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.nav>

                  <div className="hidden min-w-0 md:block">
                    <AnimatePresence mode="wait">
                      <DynamicPreview item={activeItem} />
                    </AnimatePresence>
                  </div>

                  <motion.aside
                    className="space-y-4"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 28 }}
                    transition={{ delay: 0.24, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className={`${panel} p-4`}>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{user.name}</p>
                          <p className="truncate text-xs font-semibold text-white/40">{user.email}</p>
                        </div>
                        <button onClick={onSignOut} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center rounded-2xl text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white">
                          <LogOut size={17} />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      {QUICK_CARDS.map(({ label, value, Icon, tone }, index) => (
                        <motion.div
                          key={label}
                          className={`${panel} bg-gradient-to-br ${tone} p-4 transition-transform duration-300 hover:-translate-y-1`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.28 + index * 0.055, type: "spring", stiffness: 160, damping: 21 }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08] text-white/75">
                              <Icon size={17} />
                            </span>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">{label}</p>
                              <p className="mt-1 text-sm font-black text-white">{value}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className={`${panel} p-4`}>
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/40">Quick actions</p>
                      <div className="space-y-2">
                        {ACTIONS.map(({ label, route, Icon }) => (
                          <motion.button
                            key={label}
                            onClick={() => navigate(route)}
                            className="group flex h-12 w-full items-center justify-between rounded-2xl bg-white/[0.065] px-4 text-sm font-black text-white/80 transition-colors hover:bg-white/[0.11] hover:text-white"
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                          >
                            <span className="flex items-center gap-3">
                              <Icon size={17} className="transition-transform duration-300 group-hover:rotate-3" />
                              {label}
                            </span>
                            <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.aside>
                </div>
              </LayoutGroup>

              <motion.footer
                className="flex shrink-0 flex-col gap-4 border-t border-white/10 py-5 text-xs font-bold text-white/42 md:flex-row md:items-center md:justify-between"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ delay: 0.36, duration: 0.35 }}
              >
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {["Social", "Help Center", "Privacy", "Terms"].map((item) => (
                    <button key={item} className="transition-colors hover:text-white">
                      {item}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={onToggleDark} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 transition-colors hover:text-white">
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    {isDark ? "Light" : "Dark"}
                  </button>
                  <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 transition-colors hover:text-white">
                    <Languages size={14} />
                    EN
                  </button>
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} />
                    v0.1
                  </span>
                </div>
              </motion.footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
