/* =============================================================================
   DocuMind — Custom Hook: useDocuments
   Document management state and operations
   ============================================================================= */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Document,
  listDocuments,
  uploadDocument,
  deleteDocument,
  getDocument,
  setApiUserId,
} from "@/lib/api";

import { useAuth } from "@clerk/nextjs";

export function useDocuments() {
  const { isLoaded, userId } = useAuth();
  
  useEffect(() => {
    setApiUserId(userId);
  }, [userId]);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { documents: docs } = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      try {
        const result = await uploadDocument(file);
        await fetchDocuments();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [fetchDocuments]
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await deleteDocument(id);
        if (selectedDocument?.id === id) {
          setSelectedDocument(null);
        }
        await fetchDocuments();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [fetchDocuments, selectedDocument]
  );

  const select = useCallback(async (id: string) => {
    try {
      const doc = await getDocument(id);
      setSelectedDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    }
  }, []);

  const refreshSelected = useCallback(async () => {
    if (selectedDocument) {
      try {
        const doc = await getDocument(selectedDocument.id);
        setSelectedDocument(doc);
      } catch {
        // Silently clear the selected document if it was deleted or throws a 404
        setSelectedDocument(null);
      }
    }
  }, [selectedDocument]);

  // Initial fetch
  useEffect(() => {
    if (isLoaded) {
      fetchDocuments();
    }
  }, [fetchDocuments, isLoaded]);

  // Poll for processing documents
  useEffect(() => {
    const processingDocs = documents.filter(
      (d) => d.status !== "ready" && d.status !== "error"
    );

    if (processingDocs.length === 0) return;

    const interval = setInterval(() => {
      fetchDocuments();
      refreshSelected();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments, refreshSelected]);

  return {
    documents,
    selectedDocument,
    isLoading,
    isUploading,
    error,
    upload,
    remove,
    select,
    refresh: fetchDocuments,
  };
}
