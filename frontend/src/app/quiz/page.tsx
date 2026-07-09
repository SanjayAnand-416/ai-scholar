"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppUser } from "@/components/useAppUser";
import { useDocs } from "@/lib/docs-store";
import { api, type GraphNode, type Quiz, type QuizAttempt, type QuizDifficulty } from "@/lib/api";
import {
  CheckCircle2,
  ChevronRight,
  Loader,
  RotateCcw,
  Target,
  Wand2,
  XCircle,
} from "lucide-react";

type Stage = "setup" | "taking" | "results";
type Scope = "document" | "topic";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/10 border-t-cyan-200 [animation:aisch-spin_0.7s_linear_infinite]" />
        <p className="mt-4 text-sm font-black text-white/52">Opening quiz generator...</p>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { user, accessToken, isDark, toggleDark, signOut, loading } = useAppUser();
  const { docs } = useDocs(accessToken);
  const readyDocs = useMemo(() => docs.filter((d) => d.status === "ready"), [docs]);
  const [topics, setTopics] = useState<GraphNode[]>([]);

  const [scope, setScope] = useState<Scope>("document");
  const [documentId, setDocumentId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<QuizDifficulty | "">("");
  const [questionCount, setQuestionCount] = useState(5);

  const [stage, setStage] = useState<Stage>("setup");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealedQuiz, setRevealedQuiz] = useState<Quiz | null>(null);
  const [finalAttempt, setFinalAttempt] = useState<QuizAttempt | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!documentId && readyDocs.length > 0) setDocumentId(readyDocs[0].id);
  }, [readyDocs, documentId]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .getKnowledgeGraph(accessToken)
      .then((g) => setTopics(g.nodes.filter((n) => n.type === "topic")))
      .catch(() => setTopics([]));
  }, [accessToken]);

  async function handleGenerate() {
    if (!accessToken) return;
    if (scope === "document" && !documentId) return;
    if (scope === "topic" && !topicId) return;

    setGenerating(true);
    setGenError(null);
    try {
      const newQuiz = await api.generateQuiz(accessToken, {
        document_id: scope === "document" ? documentId : undefined,
        topic_id: scope === "topic" ? topicId : undefined,
        difficulty: difficulty || undefined,
        question_count: questionCount,
      });
      const newAttempt = await api.startQuizAttempt(accessToken, newQuiz.id);
      setQuiz(newQuiz);
      setAttempt(newAttempt);
      setIndex(0);
      setSelected("");
      setUserAnswers({});
      setStage("taking");
    } catch (err) {
      const message = (err as { error?: { message?: string } })?.error?.message ?? "Failed to generate quiz.";
      setGenError(message);
    } finally {
      setGenerating(false);
    }
  }

  const currentQuestion = quiz?.questions[index] ?? null;
  const isLast = quiz ? index === quiz.questions.length - 1 : false;

  async function handleNext() {
    if (!accessToken || !attempt || !currentQuestion) return;
    setSubmitting(true);
    try {
      await api.submitQuizAnswer(accessToken, attempt.id, currentQuestion.id, selected || null);
      setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: selected }));

      if (isLast) {
        const completed = await api.completeQuizAttempt(accessToken, attempt.id);
        const reveal = await api.getQuiz(accessToken, quiz!.id, true);
        setFinalAttempt(completed);
        setRevealedQuiz(reveal);
        setStage("results");
      } else {
        setIndex((i) => i + 1);
        setSelected("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setStage("setup");
    setQuiz(null);
    setAttempt(null);
    setRevealedQuiz(null);
    setFinalAttempt(null);
    setUserAnswers({});
    setGenError(null);
  }

  if (loading || !user) return <LoadingScreen />;

  return (
    <AppShell user={user} title="Quiz Generator" subtitle="Test yourself on any document or topic" isDark={isDark} onToggleDark={toggleDark} onSignOut={signOut}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {stage === "setup" && (
            <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100/70">Assessment studio</p>
              <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Generate a quiz</h2>

              <div className="mt-5 flex gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
                {(["document", "topic"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    disabled={s === "topic" && topics.length === 0}
                    className={`h-9 flex-1 rounded-xl px-4 text-xs font-black capitalize transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30 ${
                      scope === s ? "bg-cyan-100 text-slate-950 shadow-lg shadow-cyan-300/10" : "text-white/48 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    By {s}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {scope === "document" ? (
                  <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none sm:col-span-2">
                    {readyDocs.length === 0 && <option value="">No ready documents</option>}
                    {readyDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title ?? d.original_file_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none sm:col-span-2">
                    {topics.length === 0 && <option value="">No topics yet</option>}
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as QuizDifficulty | "")}
                  className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                >
                  <option value="">Any difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                  aria-label="Question count"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || (scope === "document" ? !documentId : !topicId)}
                className="aisch-button-primary mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black disabled:opacity-50 sm:w-auto sm:px-6"
              >
                {generating ? <Loader size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {generating ? "Generating" : "Generate quiz"}
              </button>
              {genError && <p className="mt-3 text-xs font-bold text-rose-200">{genError}</p>}
            </section>
          )}

          {stage === "taking" && quiz && currentQuestion && (
            <section className="aisch-surface overflow-hidden rounded-[32px] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100/70">{quiz.title}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-white/50">
                  Question {index + 1} of {quiz.questions.length}
                </span>
              </div>

              <p className="text-xl font-black leading-8 text-white">{currentQuestion.question_text}</p>

              <div className="mt-6 space-y-2">
                {currentQuestion.question_type === "mcq" &&
                  currentQuestion.options?.choices.map((choice) => (
                    <button
                      key={choice}
                      onClick={() => setSelected(choice)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
                        selected === choice
                          ? "border-cyan-200/40 bg-cyan-200/12 text-white"
                          : "border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/[0.08]"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}

                {currentQuestion.question_type === "true_false" &&
                  ["True", "False"].map((choice) => (
                    <button
                      key={choice}
                      onClick={() => setSelected(choice)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
                        selected === choice
                          ? "border-cyan-200/40 bg-cyan-200/12 text-white"
                          : "border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/[0.08]"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}

                {(currentQuestion.question_type === "fill_blank" || currentQuestion.question_type === "short_answer") && (
                  <input
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    placeholder="Type your answer..."
                    className="aisch-field h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
                  />
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={submitting || !selected}
                className="aisch-button-primary mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black disabled:opacity-50"
              >
                {submitting ? <Loader size={16} className="animate-spin" /> : isLast ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
                {submitting ? "Saving" : isLast ? "Finish quiz" : "Next question"}
              </button>
            </section>
          )}

          {stage === "results" && revealedQuiz && finalAttempt && (
            <>
              <section className="aisch-surface overflow-hidden rounded-[32px] p-5 text-center sm:p-8">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-200 text-slate-950">
                  <Target size={26} />
                </span>
                <h2 className="mt-5 text-3xl font-black text-white">
                  {finalAttempt.score} / {finalAttempt.total_questions}
                </h2>
                <p className="mt-2 text-sm font-bold text-white/45">{revealedQuiz.title}</p>
                <button
                  onClick={handleRestart}
                  className="aisch-button-secondary mx-auto mt-6 inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-black"
                >
                  <RotateCcw size={15} /> New quiz
                </button>
              </section>

              <section className="space-y-3">
                {revealedQuiz.questions.map((q, i) => {
                  const yourAnswer = userAnswers[q.id] || "";
                  const correct = yourAnswer.trim().toLowerCase() === (q.correct_answer ?? "").trim().toLowerCase();
                  return (
                    <div key={q.id} className="aisch-surface-soft rounded-[28px] p-5">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${correct ? "bg-emerald-200 text-slate-950" : "bg-rose-200 text-slate-950"}`}>
                          {correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-white">
                            {i + 1}. {q.question_text}
                          </p>
                          <p className="mt-2 text-xs font-bold text-white/50">
                            Your answer: <span className={correct ? "text-emerald-200" : "text-rose-200"}>{yourAnswer || "(skipped)"}</span>
                          </p>
                          {!correct && <p className="mt-1 text-xs font-bold text-emerald-200">Correct answer: {q.correct_answer}</p>}
                          {q.explanation && <p className="mt-2 text-xs font-semibold leading-5 text-white/40">{q.explanation}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <section className="aisch-surface-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/62">Assessment</p>
                <h3 className="mt-2 text-xl font-black text-white">How it works</h3>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-200 text-slate-950">
                <Target size={19} />
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/50">
              Pick a document or a topic that spans several documents, choose difficulty and length, then
              answer one question at a time. Scoring and correct answers are computed server-side and only
              revealed once you finish.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
