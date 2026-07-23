/* =============================================================================
   DocuMind — Main Chat Page
   Chat interface with conversation history sidebar
   ============================================================================= */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useDocuments } from "@/hooks/useDocuments";
import { useSSE, StreamState } from "@/hooks/useSSE";
import {
  Citation,
  Conversation,
  ConversationMessage,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversation,
} from "@/lib/api";
import DocumentSidebar from "@/components/sidebar/DocumentList";
import ConversationList from "@/components/sidebar/ConversationList";
import UsageBanner from "@/components/sidebar/UsageBanner";
import PdfUploader from "@/components/pdf/PdfUploader";
import { 
  Brain, 
  MessageSquare, 
  BarChart2, 
  Send, 
  Target, 
  Zap, 
  Archive, 
  GitBranch, 
  AlertCircle, 
  Loader2,
  User,
  Bot
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: number | null;
  latencyMs?: number | null;
  subQueries?: string[];
  cached?: boolean;
}

export default function Home() {
  const docs = useDocuments();
  const sse = useSSE();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sse.currentPhase]);

  // Fetch conversations when a document is selected
  useEffect(() => {
    if (docs.selectedDocument) {
      fetchConversations(docs.selectedDocument.id);
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [docs.selectedDocument?.id]);

  const fetchConversations = useCallback(async (documentId: string) => {
    setIsLoadingConvs(true);
    try {
      const data = await listConversations(documentId);
      setConversations(data.conversations);
    } catch {
      // silently fail
    } finally {
      setIsLoadingConvs(false);
    }
  }, []);

  // When SSE completes, add the assistant message and refresh conversations
  useEffect(() => {
    if (sse.answer && !sse.isStreaming) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: sse.answer!,
          citations: sse.citations,
          confidence: sse.confidence,
          latencyMs: sse.latencyMs,
          subQueries: sse.subQueries,
          cached: sse.cached,
        },
      ]);

      // Capture the conversation ID from the completed stream
      if (sse.conversationId && !activeConversationId) {
        setActiveConversationId(sse.conversationId);
      }

      // Refresh conversation list
      if (docs.selectedDocument) {
        fetchConversations(docs.selectedDocument.id);
      }

      sse.reset();
    }
  }, [sse.answer, sse.isStreaming]);

  // Load a conversation's messages
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const detail = await getConversation(conversationId);
      setActiveConversationId(conversationId);

      // Convert ConversationMessages to ChatMessages
      const chatMessages: ChatMessage[] = detail.messages.map((m: ConversationMessage) => ({
        id: m.id + "-" + m.role,
        role: m.role,
        content: m.content,
        citations: m.role === "assistant" ? m.citations : undefined,
        confidence: m.role === "assistant" ? m.confidence_score : undefined,
        latencyMs: m.role === "assistant" ? m.latency_ms : undefined,
        subQueries: m.role === "assistant" ? m.sub_queries : undefined,
        cached: m.role === "assistant" ? m.cached : undefined,
      }));

      setMessages(chatMessages);
    } catch {
      // silently fail
    }
  }, []);

  // Start a new chat (clears messages and active conversation)
  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    sse.reset();
  }, [sse]);

  // Delete a conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await deleteConversation(id);
      if (activeConversationId === id) {
        startNewChat();
      }
      if (docs.selectedDocument) {
        fetchConversations(docs.selectedDocument.id);
      }
    } catch {
      // silently fail
    }
  }, [activeConversationId, docs.selectedDocument, fetchConversations, startNewChat]);

  // Rename a conversation
  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    try {
      await updateConversation(id, title);
      if (docs.selectedDocument) {
        fetchConversations(docs.selectedDocument.id);
      }
    } catch {
      // silently fail
    }
  }, [docs.selectedDocument, fetchConversations]);

  const handleSend = () => {
    if (!inputValue.trim() || !docs.selectedDocument || sse.isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    sse.startStream(inputValue.trim(), docs.selectedDocument.id, activeConversationId || undefined);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConfidenceClass = (confidence: number | null | undefined) => {
    if (!confidence) return "";
    if (confidence >= 0.8) return "confidence-high";
    if (confidence >= 0.6) return "confidence-medium";
    return "confidence-low";
  };

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Documents</h2>
          <PdfUploader onUpload={docs.upload} isUploading={docs.isUploading} />
        </div>
        <div className="sidebar-list">
          <DocumentSidebar
            documents={docs.documents}
            selectedId={docs.selectedDocument?.id || null}
            onSelect={docs.select}
            onDelete={docs.remove}
          />
        </div>

        {/* Conversation History */}
        {docs.selectedDocument && (
          <>
            <div className="sidebar-section-title">Chat History</div>
            <div className="sidebar-list" style={{ flex: 1, minHeight: 0 }}>
              <ConversationList
                conversations={conversations}
                selectedId={activeConversationId}
                onSelect={loadConversation}
                onDelete={handleDeleteConversation}
                onRename={handleRenameConversation}
                onNew={startNewChat}
              />
            </div>
          </>
        )}

        <div style={{ marginTop: 'auto' }}>
          <UsageBanner />
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-brand">
            <span className="logo"><Brain size={20} /></span>
            <h1>DocuMind</h1>
          </div>
          <nav className="header-nav">
            <Link href="/chat" className="nav-link active">
              <MessageSquare size={16} /> Chat
            </Link>
            <Link href="/eval" className="nav-link">
              <BarChart2 size={16} /> Eval Dashboard
            </Link>
          </nav>
        </header>

        {/* Chat Area */}
        <div className="chat-container">
          <div className="chat-workspace">
            <div className="chat-panel">
              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 && !sse.isStreaming ? (
                  <div className="chat-empty">
                    <div className="chat-empty-icon"><Brain size={48} /></div>
                    <h2>DocuMind Research Assistant</h2>
                    <p>
                      {docs.selectedDocument
                        ? `Ask any question about "${docs.selectedDocument.original_name}"`
                        : "Upload a PDF and select it to start asking questions"}
                    </p>
                    {docs.selectedDocument && (
                      <div style={{ marginTop: 16, fontSize: 13, color: "var(--text-tertiary)" }}>
                        <p>Try questions like:</p>
                        <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
                          &quot;What are the main arguments in this document?&quot;
                        </p>
                        <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                          &quot;Compare the approaches discussed in different sections&quot;
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div key={msg.id} className={`message ${msg.role}`}>
                        <div className="message-avatar">
                          {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className="message-body">
                          <div className="message-content">
                            {msg.role === "assistant" ? (
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : (
                              msg.content
                            )}
                          </div>

                          {/* Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="citations-panel">
                              <div className="citations-title">
                                Sources ({msg.citations.length})
                              </div>
                              {msg.citations.map((c, i) => (
                                <div key={i} className="citation-item">
                                  <span className="citation-badge">{i + 1}</span>
                                  <div>
                                    <div className="citation-text">
                                      {c.text_snippet.substring(0, 150)}...
                                    </div>
                                    <div className="citation-page">
                                      Page {c.page_number || "?"} · Score:{" "}
                                      {(c.relevance_score * 100).toFixed(0)}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Metadata */}
                          {msg.role === "assistant" && (
                            <div className="message-meta">
                              {msg.confidence != null && (
                                <span className={`meta-tag ${getConfidenceClass(msg.confidence)}`}>
                                  <Target size={12} /> {(msg.confidence * 100).toFixed(0)}% confident
                                </span>
                              )}
                              {msg.latencyMs != null && (
                                <span className="meta-tag"><Zap size={12} /> {msg.latencyMs}ms</span>
                              )}
                              {msg.cached && (
                                <span className="meta-tag confidence-high"><Archive size={12} /> Cached</span>
                              )}
                              {msg.subQueries && msg.subQueries.length > 1 && (
                                <span className="meta-tag">
                                  <GitBranch size={12} /> {msg.subQueries.length} sub-queries
                                </span>
                              )}
                            </div>
                          )}

                          {/* Sub-queries */}
                          {msg.subQueries && msg.subQueries.length > 1 && (
                            <div className="sub-queries" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              {msg.subQueries.map((sq, i) => (
                                <span key={i} className="sub-query-pill" style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)' }}>
                                  {sq}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Streaming indicator */}
                    {sse.isStreaming && (
                      <div className="message assistant">
                        <div className="message-avatar">
                          <Bot size={16} />
                        </div>
                        <div className="message-body">
                          <div className="agent-steps">
                            <Loader2 size={14} className="spinner-icon" />
                            {sse.currentPhase}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {sse.error && (
                      <div className="message assistant">
                        <div className="message-avatar">
                          <Bot size={16} />
                        </div>
                        <div className="message-body">
                          <div
                            className="message-content"
                            style={{
                              color: "var(--color-error)",
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <AlertCircle size={16} /> {sse.error}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-area">
                <div className="chat-input-wrapper">
                  <input
                    className="chat-input"
                    type="text"
                    placeholder={
                      docs.selectedDocument
                        ? "Ask a question about your document..."
                        : "Select a document first..."
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!docs.selectedDocument || sse.isStreaming}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={
                      !inputValue.trim() || !docs.selectedDocument || sse.isStreaming
                    }
                  >
                    {sse.isStreaming ? (
                      <Loader2 size={16} className="spinner-icon" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
