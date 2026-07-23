/* =============================================================================
   DocuMind — API Client Library
   Type-safe API communication with the FastAPI backend
   ============================================================================= */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let globalUserId = 'anonymous';

export function setApiUserId(id: string | null | undefined) {
  globalUserId = id || 'anonymous';
}

/* ─── Types ───────────────────────────────────────────────────────────────── */

export interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  file_hash: string | null;
  page_count: number;
  total_chunks: number;
  status: "uploading" | "processing" | "chunking" | "embedding" | "ready" | "error";
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  chunk_id: string;
  page_number: number | null;
  page_numbers: number[];
  text_snippet: string;
  relevance_score: number;
  source_index?: number;
  search_type?: string;
  has_parent?: boolean;
}

export interface QueryResponse {
  query_id: string;
  query: string;
  answer: string;
  citations: Citation[];
  sub_queries: string[];
  agent_steps: Array<Record<string, unknown>>;
  latency_ms: number;
  cached: boolean;
  confidence_score: number | null;
}

export interface SearchResult {
  chunk_id: string;
  content: string;
  page_number: number | null;
  score: number;
  search_type: string;
  metadata: Record<string, unknown>;
}

export interface EvaluationMetrics {
  summary: {
    total_queries: number;
    avg_faithfulness: number | null;
    avg_answer_relevancy: number | null;
    avg_context_precision: number | null;
    avg_context_recall: number | null;
    avg_overall_score: number | null;
  };
  evaluations: Array<{
    id: string;
    query_id: string;
    document_id: string | null;
    faithfulness: number | null;
    answer_relevancy: number | null;
    context_precision: number | null;
    context_recall: number | null;
    overall_score: number | null;
    created_at: string | null;
  }>;
  timeline: Array<{
    date: string;
    faithfulness: number | null;
    answer_relevancy: number | null;
    context_precision: number | null;
    context_recall: number | null;
    overall_score: number | null;
    query_id: string;
  }>;
}

export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface HealthStatus {
  status: string;
  version: string;
  services: {
    database: { status: string; pgvector_version?: string };
    redis: { status: string; used_memory?: string };
  };
}

export interface Conversation {
  id: string;
  document_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  sub_queries: string[];
  confidence_score: number | null;
  latency_ms: number | null;
  cached: boolean;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  document_id: string;
  title: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface UsageResponse {
  tier: string;
  daily_used: number;
  daily_limit: number;
  remaining: number;
  total_queries: number;
  reset_date: string;
}

export interface TierUpdateResponse {
  user_id: string;
  tier: string;
  daily_limit: number;
  message: string;
}

/* ─── Helper ──────────────────────────────────────────────────────────────── */

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": globalUserId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/* ─── Document APIs ───────────────────────────────────────────────────────── */

export async function uploadDocument(file: File): Promise<{ id: string; original_name: string; status: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    headers: {
      "X-User-Id": globalUserId,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || `Upload error: ${response.status}`);
  }

  return response.json();
}

export async function listDocuments(skip = 0, limit = 20): Promise<{ documents: Document[]; total: number }> {
  return apiFetch(`/api/documents?skip=${skip}&limit=${limit}`);
}

export async function getDocument(id: string): Promise<Document> {
  return apiFetch(`/api/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<{ id: string; message: string }> {
  return apiFetch(`/api/documents/${id}`, { method: "DELETE" });
}

/* ─── Query APIs ──────────────────────────────────────────────────────────── */

export async function queryDocument(
  query: string,
  documentId: string,
): Promise<QueryResponse> {
  return apiFetch("/api/query", {
    method: "POST",
    body: JSON.stringify({
      query,
      document_id: documentId,
      stream: false,
    }),
  });
}

export function streamQuery(
  query: string,
  documentId: string,
  onEvent: (event: SSEEvent) => void,
  onError: (error: Error) => void,
  conversationId?: string,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-User-Id": globalUserId
    },
    body: JSON.stringify({
      query,
      document_id: documentId,
      conversation_id: conversationId || null,
      stream: true,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Query failed" }));
        throw new Error(error.detail || `Query error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            try {
              onEvent({
                event: currentEvent,
                data: JSON.parse(data),
              });
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err);
      }
    });

  return controller;
}

/* ─── Search APIs ─────────────────────────────────────────────────────────── */

export async function searchDocument(
  query: string,
  documentId: string,
  topK = 10,
  searchType = "hybrid",
): Promise<{ results: SearchResult[]; total: number; search_type: string; latency_ms: number }> {
  return apiFetch("/api/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      document_id: documentId,
      top_k: topK,
      search_type: searchType,
    }),
  });
}

/* ─── Evaluation APIs ─────────────────────────────────────────────────────── */

export async function getEvaluationMetrics(
  documentId?: string,
  limit = 100,
): Promise<EvaluationMetrics> {
  const params = new URLSearchParams();
  if (documentId) params.set("document_id", documentId);
  params.set("limit", String(limit));
  return apiFetch(`/api/eval/metrics?${params}`);
}

export async function getCacheStats(): Promise<Record<string, unknown>> {
  return apiFetch("/api/eval/cache-stats");
}

/* ─── Health ──────────────────────────────────────────────────────────────── */

export async function getHealth(): Promise<HealthStatus> {
  return apiFetch("/health");
}

/* ─── Conversation APIs ───────────────────────────────────────────────────── */

export async function createConversation(
  documentId: string,
  title?: string,
): Promise<Conversation> {
  return apiFetch("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ document_id: documentId, title }),
  });
}

export async function listConversations(
  documentId?: string,
): Promise<{ conversations: Conversation[]; total: number }> {
  const params = new URLSearchParams();
  if (documentId) params.set("document_id", documentId);
  return apiFetch(`/api/conversations?${params}`);
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationDetail> {
  return apiFetch(`/api/conversations/${conversationId}`);
}

export async function updateConversation(
  conversationId: string,
  title: string,
): Promise<Conversation> {
  return apiFetch(`/api/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(
  conversationId: string,
): Promise<{ id: string; message: string }> {
  return apiFetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
}

/* ─── Usage & Billing APIs ────────────────────────────────────────────────── */

export async function getUsage(): Promise<UsageResponse> {
  return apiFetch("/api/usage");
}

export async function upgradeTier(tier: "free" | "pro"): Promise<TierUpdateResponse> {
  return apiFetch("/api/usage/upgrade", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}
