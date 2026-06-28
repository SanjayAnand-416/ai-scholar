const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

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

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
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

export const api = {
  getProfile: (token: string) =>
    apiFetch<Profile>("/v1/profile", token),

  patchProfile: (token: string, patch: ProfilePatch) =>
    apiFetch<Profile>("/v1/profile", token, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};
