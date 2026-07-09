"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs } from "@/lib/docs-store";
import { api, type Flashcard } from "@/lib/api";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader,
  PanelTopOpen,
  RotateCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-cyan-200 [animation:aisch-spin_0.7s_linear_infinite]" />
        <p className="mt-4 text-sm font-black text-white/52">Opening flashcards...</p>
      </div>
    </div>
  );
}

function StudyCard({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      onClick={onFlip}
      className="group relative flex h-72 w-full flex-col justify-center overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-violet-300/12 via-white/[0.05] to-cyan-300/10 p-8 text-left shadow-2xl shadow-black/20 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-200/14 blur-2xl" />
      <span className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/45">
        <RotateCw size={12} /> {flipped ? "Back" : "Front"}
      </span>
      <p className="relative max-w-2xl text-xl font-black leading-8 text-white sm:text-2xl">
        {flipped ? card.back : card.front}
      </p>
      <p className="relative mt-6 text-xs font-bold text-white/34">Tap the card to flip</p>
    </button>
  );
}

export default function FlashcardsPage() {
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs } = useDocs(accessToken);
  const readyDocs = useMemo(() => docs.filter((d) => d.status === "ready"), [docs]);

  const [documentId, setDocumentId] = useState<string>("");
  const [cardCount, setCardCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "known" | "learning">("all");

  useEffect(() => {
    if (!documentId && readyDocs.length > 0) setDocumentId(readyDocs[0].id);
  }, [readyDocs, documentId]);

  async function loadCards(docId: string) {
    if (!accessToken || !docId) return;
    setCardsLoading(true);
    try {
      const res = await api.listFlashcards(accessToken, { document_id: docId });
      setCards(res.data);
      setIndex(0);
      setFlipped(false);
    } finally {
      setCardsLoading(false);
    }
  }

  useEffect(() => {
    if (documentId) loadCards(documentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, accessToken]);

  async function handleGenerate() {
    if (!accessToken || !documentId) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await api.generateFlashcards(accessToken, { document_id: documentId, card_count: cardCount });
      setCards((prev) => [...res.data, ...prev]);
    } catch (err) {
      const message = (err as { error?: { message?: string } })?.error?.message ?? "Failed to generate flashcards.";
      setGenError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleReview(id: string, isKnown: boolean) {
    if (!accessToken) return;
    const updated = await api.reviewFlashcard(accessToken, id, isKnown);
    setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    await api.deleteFlashcard(accessToken, id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setIndex((i) => Math.max(0, Math.min(i, cards.length - 2)));
  }

  const visible = useMemo(() => {
    if (filter === "known") return cards.filter((c) => c.is_known);
    if (filter === "learning") return cards.filter((c) => !c.is_known);
    return cards;
  }, [cards, filter]);

  const known = cards.filter((c) => c.is_known).length;

  if (loading || !user) return <LoadingScreen />;

  const current = visible[Math.min(index, visible.length - 1)];

  return (
    <AppShell user={user} title="Flashcards" subtitle="Adaptive cards generated from your documents" isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-100/70">Memory engine</p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Generate cards from a document</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
              >
                {readyDocs.length === 0 && <option value="">No ready documents</option>}
                {readyDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title ?? d.original_file_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={30}
                value={cardCount}
                onChange={(e) => setCardCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                aria-label="Card count"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !documentId}
                className="aisch-button-primary inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black disabled:opacity-50"
              >
                {generating ? <Loader size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {generating ? "Generating" : "Generate"}
              </button>
            </div>
            {genError && <p className="mt-3 text-xs font-bold text-rose-200">{genError}</p>}
          </section>

          <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
            {cardsLoading ? (
              <div className="flex h-72 items-center justify-center">
                <Loader size={24} className="animate-spin text-white/40" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center gap-4 text-center">
                <PanelTopOpen size={40} className="text-white/25" />
                <p className="max-w-sm text-sm font-semibold text-white/45">
                  {cards.length === 0
                    ? "No flashcards yet — pick a document above and generate your first set."
                    : "No cards match this filter."}
                </p>
              </div>
            ) : (
              <>
                <StudyCard card={current} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setIndex((i) => Math.max(0, i - 1));
                      setFlipped(false);
                    }}
                    disabled={index === 0}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/60 transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-30"
                    aria-label="Previous card"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex flex-1 items-center justify-center gap-2">
                    <button
                      onClick={() => handleReview(current.id, false)}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-amber-200/20 bg-amber-200/10 px-4 text-sm font-black text-amber-100 transition-colors hover:bg-amber-200/16"
                    >
                      Still learning
                    </button>
                    <button
                      onClick={() => handleReview(current.id, true)}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200/20 bg-emerald-200/10 px-4 text-sm font-black text-emerald-100 transition-colors hover:bg-emerald-200/16"
                    >
                      <CheckCircle2 size={15} /> Know it
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIndex((i) => Math.min(visible.length - 1, i + 1));
                      setFlipped(false);
                    }}
                    disabled={index >= visible.length - 1}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/60 transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-30"
                    aria-label="Next card"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <p className="mt-3 text-center text-xs font-bold text-white/34">
                  Card {index + 1} of {visible.length}
                </p>
              </>
            )}
          </section>

          {cards.length > 0 && (
            <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-white/42">{cards.length} card{cards.length !== 1 ? "s" : ""} in this deck</p>
                <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
                  {(["all", "learning", "known"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        setIndex(0);
                        setFlipped(false);
                      }}
                      className={`h-9 rounded-xl px-4 text-xs font-black capitalize transition-all duration-300 ${
                        filter === f ? "bg-cyan-100 text-slate-950 shadow-lg shadow-cyan-300/10" : "text-white/48 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cards.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-black text-white">{c.front}</p>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-200/15 bg-rose-200/10 text-rose-100/70 transition-colors hover:bg-rose-200/16 hover:text-rose-100"
                        aria-label="Delete flashcard"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-semibold text-white/40">{c.back}</p>
                    <span
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${
                        c.is_known
                          ? "border-emerald-200/20 bg-emerald-200/10 text-emerald-100"
                          : "border-amber-200/20 bg-amber-200/10 text-amber-100"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {c.is_known ? "Known" : "Still learning"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="aisch-surface-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Recall signal</p>
                <h3 className="mt-2 text-xl font-black text-white">Deck progress</h3>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-200 text-slate-950">
                <PanelTopOpen size={19} />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                <p className="text-2xl font-black text-white">{cards.length}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/34">Total</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center">
                <p className="text-2xl font-black text-white">{known}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/34">Known</p>
              </div>
            </div>
          </section>

          <section className="aisch-surface overflow-hidden rounded-[32px] p-5 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-200 text-slate-950">
              <Sparkles size={20} />
            </span>
            <h3 className="mt-5 text-xl font-black">How it works</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/50">
              Pick a ready document, choose how many cards to generate, then flip through the deck. Mark each
              card &ldquo;Know it&rdquo; or &ldquo;Still learning&rdquo; to track recall over time.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
