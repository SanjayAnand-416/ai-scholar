const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

// ─── Shared types ──────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  college_name: string | null;
  degree: string | null;
  branch: string | null;
  graduation_year: number | null;
  career_goal: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePatch {
  full_name?: string;
  avatar_url?: string;
  college_name?: string;
  degree?: string;
  branch?: string;
  graduation_year?: number;
  career_goal?: string;
}

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed" | "deleted";

export interface Document {
  id: string;
  title: string | null;
  original_file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  status: DocumentStatus;
  total_pages: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  data: Document[];
  page: number;
  page_size: number;
  total: number;
}

export interface Conversation {
  id: string;
  document_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  data: Conversation[];
  page: number;
  page_size: number;
  total: number;
}

export interface Source {
  chunk_id: string | null;
  document_id: string | null;
  start_page: number | null;
  end_page: number | null;
  similarity_score: number | null;
  rank: number | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  sources: Source[];
}

export interface MessageListResponse {
  data: Message[];
  page: number;
  page_size: number;
  total: number;
}

export interface RAGResponse {
  user_message: Message;
  assistant_message: Message;
}

// ─── Knowledge graph ────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  type: "document" | "topic";
  label: string;
  subject: string | null;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "covers" | "similar" | "prerequisite" | "related";
  strength: number | null;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RebuildResponse {
  queued_count: number;
  estimated_seconds: number;
}

export interface SimilarDocument {
  document_id: string;
  title: string | null;
  similarity_score: number;
  shared_topics: string[];
}

export interface SimilarDocumentsResponse {
  data: SimilarDocument[];
  page: number;
  page_size: number;
  total: number;
}

// ─── Quizzes ────────────────────────────────────────────────────────────────

export type QuestionType = "mcq" | "true_false" | "fill_blank" | "short_answer";
export type QuizDifficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: { choices: string[] } | null;
  correct_answer: string | null;
  explanation: string | null;
}

export interface Quiz {
  id: string;
  user_id: string;
  document_id: string | null;
  topic_id: string | null;
  title: string | null;
  difficulty: QuizDifficulty | null;
  created_at: string;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number | null;
  total_questions: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
}

// ─── Study Plans ────────────────────────────────────────────────────────────

export type StudyPlanStatus = "active" | "completed" | "archived";
export type StudyPlanItemStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface StudyPlanItem {
  id: string;
  study_plan_id: string;
  document_id: string | null;
  topic: string | null;
  scheduled_date: string | null;
  estimated_minutes: number | null;
  status: StudyPlanItemStatus;
  completed_at: string | null;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  title: string | null;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: StudyPlanStatus;
  created_at: string;
  items: StudyPlanItem[];
}

export interface StudyPlanListResponse {
  data: StudyPlan[];
  page: number;
  page_size: number;
  total: number;
}

// ─── Flashcards ─────────────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string | null;
  topic_id: string | null;
  front: string;
  back: string;
  is_known: boolean;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface FlashcardListResponse {
  data: Flashcard[];
  page: number;
  page_size: number;
  total: number;
}

// ─── Career foundation ─────────────────────────────────────────────────────

export interface CareerProfile {
  id: string;
  user_id: string;
  headline: string | null;
  target_role: string | null;
  target_company: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  resume_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerProfilePatch {
  headline?: string | null;
  target_role?: string | null;
  target_company?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  resume_document_id?: string | null;
}

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface UserSkill {
  id: string;
  user_id: string;
  skill_name: string;
  category: string | null;
  proficiency_level: SkillLevel | null;
  evidence: string | null;
  created_at: string;
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body as T;
}

async function apiFormPost<T>(path: string, token: string, form: FormData, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body as T;
}

// ─── API surface ───────────────────────────────────────────────────────────

export const api = {
  // Profile
  getProfile: (token: string) =>
    apiFetch<Profile>("/v1/profile", token),

  patchProfile: (token: string, patch: ProfilePatch) =>
    apiFetch<Profile>("/v1/profile", token, { method: "PATCH", body: JSON.stringify(patch) }),

  // Documents
  uploadDocument: (token: string, file: File, title?: string) => {
    const form = new FormData();
    form.append("file", file);
    return apiFormPost<Document>("/v1/documents", token, form, title ? { title } : {});
  },

  listDocuments: (token: string, page = 1, pageSize = 50) =>
    apiFetch<DocumentListResponse>(`/v1/documents?page=${page}&page_size=${pageSize}`, token),

  getDocument: (token: string, id: string) =>
    apiFetch<Document>(`/v1/documents/${id}`, token),

  deleteDocument: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}/v1/documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw body;
    }
  },

  // Conversations
  createConversation: (token: string, body: { document_id?: string; title?: string }) =>
    apiFetch<Conversation>("/v1/conversations", token, { method: "POST", body: JSON.stringify(body) }),

  listConversations: (token: string, page = 1, pageSize = 20) =>
    apiFetch<ConversationListResponse>(`/v1/conversations?page=${page}&page_size=${pageSize}`, token),

  // Messages
  listMessages: (token: string, conversationId: string, page = 1, pageSize = 100) =>
    apiFetch<MessageListResponse>(`/v1/conversations/${conversationId}/messages?page=${page}&page_size=${pageSize}`, token),

  sendMessage: (token: string, conversationId: string, content: string) =>
    apiFetch<RAGResponse>(`/v1/conversations/${conversationId}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  // Knowledge graph
  getKnowledgeGraph: (token: string) =>
    apiFetch<KnowledgeGraph>("/v1/knowledge-graph", token),

  rebuildKnowledgeGraph: (token: string) =>
    apiFetch<RebuildResponse>("/v1/knowledge-graph/rebuild", token, { method: "POST" }),

  getSimilarDocuments: (token: string, documentId: string) =>
    apiFetch<SimilarDocumentsResponse>(`/v1/documents/${documentId}/similar`, token),

  // Quizzes
  generateQuiz: (token: string, body: { document_id?: string; topic_id?: string; difficulty?: QuizDifficulty; question_count?: number }) =>
    apiFetch<Quiz>("/v1/quizzes", token, { method: "POST", body: JSON.stringify(body) }),

  getQuiz: (token: string, quizId: string, reveal = false) =>
    apiFetch<Quiz>(`/v1/quizzes/${quizId}${reveal ? "?reveal=true" : ""}`, token),

  startQuizAttempt: (token: string, quizId: string) =>
    apiFetch<QuizAttempt>(`/v1/quizzes/${quizId}/attempts`, token, { method: "POST" }),

  submitQuizAnswer: (token: string, attemptId: string, questionId: string, selectedAnswer: string | null) =>
    apiFetch<QuizAnswer>(`/v1/quiz-attempts/${attemptId}/answers`, token, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer }),
    }),

  completeQuizAttempt: (token: string, attemptId: string) =>
    apiFetch<QuizAttempt>(`/v1/quiz-attempts/${attemptId}/complete`, token, { method: "POST" }),

  // Study plans
  createStudyPlan: (token: string, body: { title?: string; goal?: string; start_date?: string; end_date?: string }) =>
    apiFetch<StudyPlan>("/v1/study-plans", token, { method: "POST", body: JSON.stringify(body) }),

  listStudyPlans: (token: string, page = 1, pageSize = 20) =>
    apiFetch<StudyPlanListResponse>(`/v1/study-plans?page=${page}&page_size=${pageSize}`, token),

  getStudyPlan: (token: string, planId: string) =>
    apiFetch<StudyPlan>(`/v1/study-plans/${planId}`, token),

  createStudyPlanItem: (
    token: string,
    planId: string,
    body: { document_id?: string; topic?: string; scheduled_date?: string; estimated_minutes?: number },
  ) => apiFetch<StudyPlanItem>(`/v1/study-plans/${planId}/items`, token, { method: "POST", body: JSON.stringify(body) }),

  patchStudyPlanItem: (token: string, itemId: string, body: { status?: StudyPlanItemStatus; scheduled_date?: string; estimated_minutes?: number }) =>
    apiFetch<StudyPlanItem>(`/v1/study-plan-items/${itemId}`, token, { method: "PATCH", body: JSON.stringify(body) }),

  // Flashcards
  generateFlashcards: (token: string, body: { document_id?: string; topic_id?: string; card_count?: number }) =>
    apiFetch<FlashcardListResponse>("/v1/flashcards", token, { method: "POST", body: JSON.stringify(body) }),

  listFlashcards: (token: string, params: { document_id?: string; topic_id?: string; page?: number; page_size?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.document_id) q.set("document_id", params.document_id);
    if (params.topic_id) q.set("topic_id", params.topic_id);
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 100));
    return apiFetch<FlashcardListResponse>(`/v1/flashcards?${q.toString()}`, token);
  },

  reviewFlashcard: (token: string, id: string, isKnown: boolean) =>
    apiFetch<Flashcard>(`/v1/flashcards/${id}/review`, token, {
      method: "PATCH",
      body: JSON.stringify({ is_known: isKnown }),
    }),

  deleteFlashcard: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}/v1/flashcards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw body;
    }
  },

  // Career foundation
  getCareerProfile: (token: string) =>
    apiFetch<CareerProfile>("/v1/career/profile", token),

  patchCareerProfile: (token: string, patch: CareerProfilePatch) =>
    apiFetch<CareerProfile>("/v1/career/profile", token, { method: "PATCH", body: JSON.stringify(patch) }),

  listSkills: (token: string) =>
    apiFetch<UserSkill[]>("/v1/career/skills", token),

  saveSkill: (token: string, body: { skill_name: string; category?: string; proficiency_level?: SkillLevel; evidence?: string }) =>
    apiFetch<UserSkill>("/v1/career/skills", token, { method: "POST", body: JSON.stringify(body) }),

  deleteSkill: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}/v1/career/skills/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok && res.status !== 204) throw await res.json().catch(() => ({}));
  },
};
