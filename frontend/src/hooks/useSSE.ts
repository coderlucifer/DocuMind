/* =============================================================================
   DocuMind — Custom Hook: useSSE
   Manages SSE streaming for the agentic RAG pipeline
   ============================================================================= */

"use client";

import { useState, useCallback, useRef } from "react";
import { streamQuery, SSEEvent, Citation } from "@/lib/api";

export interface AgentStep {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface StreamState {
  isStreaming: boolean;
  currentPhase: string;
  steps: AgentStep[];
  answer: string | null;
  citations: Citation[];
  subQueries: string[];
  confidence: number | null;
  latencyMs: number | null;
  cached: boolean;
  error: string | null;
  conversationId: string | null;
}

const INITIAL_STATE: StreamState = {
  isStreaming: false,
  currentPhase: "",
  steps: [],
  answer: null,
  citations: [],
  subQueries: [],
  confidence: null,
  latencyMs: null,
  cached: false,
  error: null,
  conversationId: null,
};

export function useSSE() {
  const [state, setState] = useState<StreamState>(INITIAL_STATE);
  const controllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    (query: string, documentId: string, conversationId?: string) => {
      // Reset state
      setState({ ...INITIAL_STATE, isStreaming: true, conversationId: conversationId || null });

      const controller = streamQuery(
        query,
        documentId,
        (event: SSEEvent) => {
          setState((prev) => {
            const step: AgentStep = {
              event: event.event,
              data: event.data,
              timestamp: Date.now(),
            };

            const newState = { ...prev, steps: [...prev.steps, step] };

            // Update phase based on event type
            switch (event.event) {
              case "planning":
                newState.currentPhase = "🔍 Analyzing query...";
                break;
              case "planned":
                newState.currentPhase = "📋 Query plan ready";
                newState.subQueries = (event.data.sub_queries as string[]) || [];
                break;
              case "retrieving":
                newState.currentPhase = "Searching documents...";
                break;
              case "retrieved":
                newState.currentPhase = `Found ${event.data.chunk_count} relevant passages`;
                break;
              case "generating":
                newState.currentPhase = "Synthesizing answer...";
                break;
              case "generated":
                newState.currentPhase = "Answer generated";
                break;
              case "token":
                newState.currentPhase = "Synthesizing answer...";
                // Append token to the answer
                newState.answer = (newState.answer || "") + String(event.data.token || "");
                break;
              case "critiquing":
                newState.currentPhase = "Evaluating quality...";
                break;
              case "critiqued":
                newState.currentPhase = `Confidence: ${((event.data.confidence as number) * 100).toFixed(0)}%`;
                break;
              case "re_retrieving":
                newState.currentPhase = "Re-retrieving for better results...";
                break;
              case "complete":
                newState.isStreaming = false;
                newState.currentPhase = "Complete";
                // Only set answer if it wasn't streamed, or if we want to ensure final cleanup
                if (event.data.answer) {
                  newState.answer = event.data.answer as string;
                }
                newState.citations = (event.data.citations as Citation[]) || [];
                newState.confidence = event.data.confidence_score as number;
                newState.latencyMs = event.data.latency_ms as number;
                newState.cached = event.data.cached as boolean;
                newState.subQueries = (event.data.sub_queries as string[]) || [];
                if (event.data.conversation_id) {
                  newState.conversationId = event.data.conversation_id as string;
                }
                break;
              case "error":
                newState.isStreaming = false;
                newState.currentPhase = "Error";
                newState.error = String(event.data.detail || event.data.error || "An unknown error occurred");
                break;
            }

            return newState;
          });
        },
        (error: Error) => {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            currentPhase: "Error",
            error: error.message,
          }));
        },
        conversationId,
      );

      controllerRef.current = controller;
    },
    []
  );

  const stopStream = useCallback(() => {
    controllerRef.current?.abort();
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      currentPhase: "Stopped",
    }));
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { ...state, startStream, stopStream, reset };
}
