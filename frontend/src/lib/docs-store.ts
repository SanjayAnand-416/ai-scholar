"use client";

/**
 * Real-API document store.
 * Replaces the mock localStorage implementation from Phase 0.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { api, type Document, type DocumentStatus } from "./api";

export type { Document, DocumentStatus };

const POLL_INTERVAL_MS = 4000;
const IN_PROGRESS: DocumentStatus[] = ["uploaded", "processing"];

function hasInProgress(docs: Document[]) {
  return docs.some((d) => IN_PROGRESS.includes(d.status));
}

export function useDocs(token: string | null) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const docsRef = useRef<Document[]>([]);

  const fetchDocs = useCallback(async (tok: string) => {
    try {
      const res = await api.listDocuments(tok);
      setDocs(res.data);
      docsRef.current = res.data;
      setError(null);
    } catch {
      setError("Failed to load documents.");
    }
  }, []);

  // Initial load + conditional polling — only while docs are in-progress
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchDocs(token).finally(() => setLoading(false));

    pollRef.current = setInterval(async () => {
      if (!hasInProgress(docsRef.current)) return; // skip when all settled
      const res = await api.listDocuments(token).catch(() => null);
      if (!res) return;
      setDocs(res.data);
      docsRef.current = res.data;
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, fetchDocs]);

  const uploadDoc = useCallback(async (file: File): Promise<Document> => {
    if (!token) throw new Error("Not authenticated");
    const doc = await api.uploadDocument(token, file, file.name.replace(/\.pdf$/i, ""));
    setDocs((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      return exists ? prev.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...prev];
    });
    return doc;
  }, [token]);

  const removeDoc = useCallback(async (id: string) => {
    if (!token) return;
    await api.deleteDocument(token, id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, [token]);

  return { docs, loading, error, uploadDoc, removeDoc, refetch: () => token && fetchDocs(token) };
}
