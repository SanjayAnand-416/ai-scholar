"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Library,
  LockKeyhole,
  MessageSquareText,
  Network,
  PanelTopOpen,
  Play,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
} from "lucide-react";

const navItems = [
  { label: "Features", id: "features" },
  { label: "Workflow", id: "workflow" },
  { label: "Platform", id: "platform" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
];

const metrics = [
  { value: "42", label: "sources indexed" },
  { value: "1.2k", label: "cited answers" },
  { value: "84%", label: "readiness score" },
];

const featureCards = [
  {
    Icon: FileText,
    title: "Grounded PDF Chat",
    desc: "Ask questions against uploaded documents and keep page-level evidence close to the answer.",
    stat: "Citations on",
  },
  {
    Icon: BrainCircuit,
    title: "Study Intelligence",
    desc: "Turn dense reading into summaries, practice prompts, recall loops, and next-best actions.",
    stat: "Adaptive",
  },
  {
    Icon: PanelTopOpen,
    title: "Reusable Study Assets",
    desc: "Shape source material into flashcards, notes, concept maps, and review-ready knowledge blocks.",
    stat: "Reusable",
  },
  {
    Icon: BarChart3,
    title: "Progress Signals",
    desc: "See readiness, activity, document health, and learning momentum in one calm command center.",
    stat: "Live",
  },
];

const workflow = [
  { Icon: UploadCloud, label: "Upload", desc: "Add PDFs and course material." },
  { Icon: Search, label: "Index", desc: "Extract text and prepare retrieval." },
  { Icon: MessageSquareText, label: "Ask", desc: "Chat with grounded context." },
  { Icon: Target, label: "Review", desc: "Practice from weak concepts." },
];

const platformPanels = [
  {
    Icon: Library,
    title: "Library",
    desc: "Organized study sources, processing status, and document actions.",
  },
  {
    Icon: Bot,
    title: "Assistant",
    desc: "A focused AI workspace for citations, prompts, and grounded answers.",
  },
  {
    Icon: Network,
    title: "Knowledge Graph",
    desc: "Concept relationships designed to expand as the product grows.",
  },
];

const testimonials = [
  {
    quote: "AI Scholar makes research review feel organized instead of scattered. The interface is calm, but the workflow is powerful.",
    name: "Maya S.",
    role: "Graduate researcher",
  },
  {
    quote: "The best part is having uploads, chat, and revision in one place. It feels like a proper study operating system.",
    name: "Arjun M.",
    role: "Engineering student",
  },
  {
    quote: "I can move from a source to a cited answer quickly, then turn that into a review loop before exams.",
    name: "Elena B.",
    role: "Pre-med student",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$0",
    desc: "For trying the core document workflow.",
    features: ["PDF uploads", "Grounded chat", "Basic library", "Profile workspace"],
  },
  {
    name: "Scholar",
    price: "$14",
    desc: "For learners building a daily study system.",
    features: ["More documents", "Priority processing", "Study assets", "Progress signals"],
    featured: true,
  },
  {
    name: "Research",
    price: "$29",
    desc: "For heavier reading, research, and exam prep.",
    features: ["Large libraries", "Advanced retrieval", "Team-ready exports", "Premium support"],
  },
];

const faqs = [
  {
    q: "Does the landing page change the app workflow?",
    a: "No. It is a visual and UX refactor only. Authentication, routing, and backend behavior stay unchanged.",
  },
  {
    q: "Can users still get to sign in and sign up?",
    a: "Yes. Primary and secondary calls to action continue to route to the existing authentication page.",
  },
  {
    q: "Is this designed for mobile?",
    a: "Yes. The layout collapses into single-column sections with full-width touch-friendly actions.",
  },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router, supabase.auth]);

  const goToAuth = () => router.push("/auth");

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <BackgroundFX />
      <Header onAuth={goToAuth} />

      <section id="hero" className="relative z-10">
        <div className="mx-auto grid min-h-[calc(100vh-76px)] max-w-[1440px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1fr)] lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 shadow-lg shadow-black/10 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/40" />
              Citation-ready learning OS
            </div>
            <h1 className="text-5xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Study from every source in one polished AI workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-white/58 sm:text-lg">
              Upload PDFs, ask grounded questions, organize study materials, and track learning momentum in a SaaS experience that feels as refined as the AI Scholar sidebar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={goToAuth} className="aisch-button-primary inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black sm:h-14 sm:px-7 sm:text-base">
                Start studying <ArrowRight size={18} />
              </button>
              <button onClick={() => scrollToSection("platform")} className="aisch-button-secondary inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black sm:h-14 sm:px-7 sm:text-base">
                <Play size={18} /> View platform
              </button>
            </div>
            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="aisch-surface-soft rounded-[22px] p-4">
                  <p className="text-3xl font-black text-white">{metric.value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/38">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      <TrustBand />
      <FeatureSection />
      <WorkflowSection />
      <PlatformSection />
      <TestimonialsSection />
      <PricingSection onAuth={goToAuth} />
      <FAQSection />
      <FinalCTA onAuth={goToAuth} />
      <Footer onAuth={goToAuth} />
    </main>
  );
}

function Header({ onAuth }: { onAuth: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070d]/72 shadow-2xl shadow-black/10 backdrop-blur-2xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button onClick={() => scrollToSection("hero")} className="group flex items-center gap-3 text-left" aria-label="AI Scholar home">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] shadow-lg shadow-black/15 transition-transform duration-300 group-hover:scale-105">
            <GraduationCap size={22} />
          </span>
          <span>
            <span className="block text-lg font-black text-white">AI Scholar</span>
            <span className="hidden text-[11px] font-black uppercase tracking-[0.22em] text-white/36 sm:block">Learning OS</span>
          </span>
        </button>

        <nav className="hidden flex-1 justify-center gap-1 lg:flex" aria-label="Landing navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="rounded-2xl px-4 py-2 text-sm font-black text-white/48 transition-all duration-300 hover:bg-white/[0.07] hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onAuth} className="aisch-button-secondary hidden h-11 items-center rounded-2xl px-5 text-sm font-black sm:inline-flex">
            Sign in
          </button>
          <button onClick={onAuth} className="aisch-button-primary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black sm:px-5">
            Get started <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#05070d_0%,#0a1020_48%,#111827_100%)]" />
      <div className="absolute left-[-10rem] top-20 h-96 w-96 rounded-full bg-cyan-300/16 blur-3xl" />
      <div className="absolute right-[-12rem] top-1/3 h-[30rem] w-[30rem] rounded-full bg-violet-300/14 blur-3xl" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-300/12 blur-3xl" />
      <div className="absolute inset-0 aisch-dark-grid opacity-30" />
      <div className="absolute inset-0 aisch-luxury-grain opacity-25" />
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="aisch-surface relative overflow-hidden rounded-[32px] p-4 sm:p-5">
        <div className="pointer-events-none absolute right-[-18%] top-[-20%] h-72 w-72 rounded-full bg-cyan-300/14 blur-3xl" />
        <div className="relative rounded-[26px] border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-200 to-indigo-300 text-slate-950 shadow-lg shadow-cyan-300/15">
                <Sparkles size={21} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">Live workspace</p>
                <h2 className="mt-1 text-xl font-black text-white">Research Methods.pdf</h2>
              </div>
            </div>
            <span className="w-fit rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1.5 text-xs font-black text-emerald-100">
              Ready to chat
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black text-white">Grounded answer</p>
                <ShieldCheck size={17} className="text-cyan-100/70" />
              </div>
              <div className="space-y-3">
                {["The paper defines retrieval quality through source coverage.", "Strong answers combine semantic search with citation checks.", "The next review block should focus on evaluation metrics."].map((line) => (
                  <div key={line} className="rounded-2xl bg-white/[0.055] p-3 text-sm font-semibold leading-6 text-white/66">
                    {line}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["p. 12", "p. 18", "p. 24"].map((chip) => (
                  <span key={chip} className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 font-mono text-xs font-black text-cyan-100">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/36">Readiness</p>
                <p className="mt-2 text-4xl font-black text-white">84%</p>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300" />
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-white/36">Study signals</p>
                {[68, 82, 54, 90, 76].map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className="mr-2 inline-block w-8 rounded-t-xl bg-gradient-to-t from-indigo-500 to-cyan-300 align-bottom"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <FloatingPill className="-bottom-5 left-5" label="AI confidence" value="High" />
      <FloatingPill className="-right-2 top-10" label="Next action" value="Generate quiz" />
    </div>
  );
}

function FloatingPill({ className, label, value }: { className: string; label: string; value: string }) {
  return (
    <div className={`aisch-float-slow absolute hidden rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:block ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/36">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function TrustBand() {
  return (
    <section className="relative z-10 border-y border-white/10 bg-white/[0.035] py-6 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/38">Built for modern learners</p>
        <div className="flex flex-wrap gap-2">
          {["Students", "Researchers", "Educators", "Study teams"].map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-bold text-white/52">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">{title}</h2>
      <p className="mt-5 text-base font-semibold leading-7 text-white/52 sm:text-lg">{desc}</p>
    </div>
  );
}

function FeatureSection() {
  return (
    <section id="features" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Feature system"
          title="Everything feels connected, because the interface is."
          desc="The landing page now mirrors the authenticated product: soft glass panels, strong hierarchy, restrained accents, and professional interaction states."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ Icon, title, desc, stat }) => (
            <article key={title} className="aisch-surface-soft group rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085]">
              <div className="mb-8 flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan-100">
                  <Icon size={21} />
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-white/42">{stat}</span>
              </div>
              <h3 className="text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/50">{desc}</p>
              <div className="mt-6 h-2 rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 transition-all duration-500 group-hover:w-full" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="relative z-10 border-y border-white/10 bg-white/[0.025] py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Workflow"
          title="A focused loop from upload to revision."
          desc="Each step uses consistent cards, icon treatments, spacing, and hover motion so the marketing page and app feel like one product."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflow.map(({ Icon, label, desc }, index) => (
            <article key={label} className="relative rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085]">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-xs font-black text-cyan-100/70">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-slate-950">
                  <Icon size={21} />
                </span>
              </div>
              <h3 className="text-xl font-black text-white">{label}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/50">{desc}</p>
              {index < workflow.length - 1 && <span className="absolute -right-3 top-1/2 hidden h-px w-6 bg-cyan-200/40 xl:block" />}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section id="platform" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="self-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">Platform preview</p>
          <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">A landing page that now speaks the same language as the workspace.</h2>
          <p className="mt-5 text-base font-semibold leading-7 text-white/52 sm:text-lg">
            The page uses the same visual grammar as the sidebar: translucent surfaces, compact controls, cyan focus, deep background, crisp typography, and subtle motion.
          </p>
          <button onClick={() => scrollToSection("pricing")} className="aisch-button-secondary mt-7 inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-black">
            Compare plans <ArrowRight size={17} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {platformPanels.map(({ Icon, title, desc }) => (
            <article key={title} className="aisch-surface-soft rounded-[28px] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan-100">
                <Icon size={21} />
              </span>
              <h3 className="mt-8 text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/50">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="relative z-10 border-y border-white/10 bg-white/[0.025] py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Learner trust"
          title="Calm enough for daily study. Polished enough for serious work."
          desc="Social proof cards are restrained, readable, and styled like product panels instead of generic marketing blocks."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="aisch-surface-soft rounded-[28px] p-6">
              <Quote size={23} className="text-cyan-100/70" />
              <p className="mt-5 min-h-32 text-base font-semibold leading-7 text-white/64">{item.quote}</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-indigo-200 text-sm font-black text-slate-950">
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <span className="block text-sm font-black text-white">{item.name}</span>
                  <span className="mt-0.5 block text-xs font-bold text-white/38">{item.role}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onAuth }: { onAuth: () => void }) {
  return (
    <section id="pricing" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple plans with premium presentation."
          desc="Plan cards now use consistent shadows, borders, radii, button states, and typography."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[28px] border p-6 shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
                plan.featured
                  ? "border-cyan-200/25 bg-gradient-to-br from-cyan-300/16 via-white/[0.07] to-indigo-300/14 shadow-cyan-950/20"
                  : "border-white/10 bg-white/[0.06] shadow-black/10"
              } backdrop-blur-xl`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                {plan.featured && <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-slate-950">Popular</span>}
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/50">{plan.desc}</p>
              <div className="mt-8 flex items-end gap-2">
                <span className="text-5xl font-black text-white">{plan.price}</span>
                <span className="pb-2 text-sm font-bold text-white/40">/ month</span>
              </div>
              <button onClick={onAuth} className={`${plan.featured ? "aisch-button-primary" : "aisch-button-secondary"} mt-8 h-12 w-full rounded-2xl text-sm font-black`}>
                Get started
              </button>
              <div className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm font-bold text-white/62">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200/14 text-emerald-100">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="relative z-10 border-y border-white/10 bg-white/[0.025] py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="FAQ" title="Clear answers before users commit." desc="Compact, accessible disclosure panels with the same rounded glass treatment as the rest of the page." />
        <div className="mt-12 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="group rounded-[24px] border border-white/10 bg-white/[0.06] shadow-lg shadow-black/10 backdrop-blur-xl">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-base font-black text-white">
                {faq.q}
                <ChevronDown className="shrink-0 text-white/42 transition-transform duration-300 group-open:rotate-180" size={20} />
              </summary>
              <p className="px-5 pb-5 text-sm font-semibold leading-7 text-white/52">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onAuth }: { onAuth: () => void }) {
  return (
    <section className="relative z-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="aisch-surface mx-auto max-w-[1440px] overflow-hidden rounded-[32px] p-6 text-center sm:p-10 lg:p-14">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/70">Start with one PDF</p>
        <h2 className="mx-auto mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl">
          Turn your next study session into a grounded AI workspace.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/54">
          Sign in, upload a document, and keep your reading, questions, citations, and revision loop in one place.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onAuth} className="aisch-button-primary inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black">
            Get started <ArrowRight size={18} />
          </button>
          <button onClick={() => scrollToSection("features")} className="aisch-button-secondary inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black">
            Explore features <Sparkles size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer({ onAuth }: { onAuth: () => void }) {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#05070d]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
              <GraduationCap size={21} />
            </span>
            <span>
              <span className="block text-lg font-black text-white">AI Scholar</span>
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-white/34">Learning OS</span>
            </span>
          </div>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/46">
            A premium AI study workspace for uploaded sources, grounded chat, and consistent learning momentum.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { title: "Product", links: ["Features", "Workflow", "Platform"] },
            { title: "Account", links: ["Sign in", "Get started", "Security"] },
            { title: "Legal", links: ["Privacy", "Terms", "Contact"] },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-black text-white">{group.title}</h3>
              <div className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <button key={link} onClick={link === "Sign in" || link === "Get started" ? onAuth : undefined} className="block text-sm font-bold text-white/40 transition-colors hover:text-white">
                    {link}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 border-t border-white/10 px-4 py-5 text-xs font-bold text-white/34 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>© 2026 AI Scholar. All rights reserved.</span>
        <span className="flex items-center gap-2">
          <LockKeyhole size={14} /> Secured by Supabase Auth
        </span>
      </div>
    </footer>
  );
}
