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
};
