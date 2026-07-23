/* =============================================================================
   DocuMind — Documentation Page
   ============================================================================= */

import Link from "next/link";
import { 
  BookOpen, 
  Terminal, 
  Upload, 
  MessageSquare, 
  Search, 
  Activity, 
  ShieldCheck, 
  ArrowLeft 
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="docs-container" style={{ height: "100vh", overflowY: "auto", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-inter)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "40px", borderBottom: "1px solid var(--border-color)", paddingBottom: "20px" }}>
          <Link href="/" style={{ color: "var(--text-secondary)", marginRight: "20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <ArrowLeft size={16} /> Back
          </Link>
          <BookOpen size={24} style={{ color: "var(--primary-color)", marginRight: "12px" }} />
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>DocuMind Documentation</h1>
        </div>

        {/* Introduction */}
        <section style={{ marginBottom: "50px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 500, marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Terminal size={18} /> Introduction
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "15px", marginBottom: "16px" }}>
            Welcome to <strong>DocuMind</strong>! This platform is an advanced AI research assistant designed to help you deeply understand your PDF documents. Instead of just searching for keywords, DocuMind uses an <em>Agentic RAG</em> (Retrieval-Augmented Generation) pipeline. This means the AI actively "thinks" about your question, searches the document multiple times if needed, and writes a highly accurate, fully-cited answer.
          </p>
        </section>

        {/* How to Use */}
        <section style={{ marginBottom: "50px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 500, marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} /> How to Use Efficiently
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", backgroundColor: "var(--bg-secondary)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <div style={{ padding: "10px", backgroundColor: "var(--bg-primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={20} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 8px 0" }}>1. Uploading Documents</h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "14px", margin: 0 }}>
                  Drag and drop a PDF into the sidebar on the Chat page. The system will process it by breaking it into small chunks and generating mathematical "embeddings" so the AI can understand the meaning of the text. Wait until the document status turns to <span style={{ color: "var(--success-color)", fontWeight: 500 }}>READY</span>.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", backgroundColor: "var(--bg-secondary)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <div style={{ padding: "10px", backgroundColor: "var(--bg-primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={20} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 8px 0" }}>2. Asking Questions</h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "14px", margin: 0 }}>
                  Select your document and type a question. You can ask simple questions (e.g., "What is the conclusion?") or highly complex questions (e.g., "Compare the methods in section 2 with the results in section 4"). Complex questions will be automatically broken down into smaller sub-queries by the AI planner.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", backgroundColor: "var(--bg-secondary)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <div style={{ padding: "10px", backgroundColor: "var(--bg-primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={20} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 8px 0" }}>3. Verifying Citations</h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "14px", margin: 0 }}>
                  Every answer includes citation numbers (like [1], [2]). Hover over these numbers or check the citation cards below the answer to see the exact paragraph from your PDF that proves the AI isn't hallucinating.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Under the Hood */}
        <section style={{ marginBottom: "50px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 500, marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Search size={18} /> Under the Hood (Why it takes ~1 minute)
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "15px", marginBottom: "16px" }}>
            Standard AI chatbots just send your prompt to an LLM. DocuMind runs an autonomous pipeline:
          </p>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "15px", paddingLeft: "24px" }}>
            <li><strong>Planning:</strong> Analyzes if the query needs to be split up.</li>
            <li><strong>Hybrid Search:</strong> Searches the database using both keywords (BM25) and conceptual meaning (Pgvector), combining them for perfect accuracy (RRF).</li>
            <li><strong>Generation:</strong> Drafts an answer using the retrieved context.</li>
            <li><strong>Self-Critique:</strong> Evaluates its own answer. If it detects hallucinations or low confidence, it loops back to re-search the document until it gets it right.</li>
          </ul>
        </section>

        <div style={{ textAlign: "center", marginTop: "60px", paddingTop: "30px", borderTop: "1px solid var(--border-color)" }}>
          <Link href="/chat" style={{ display: "inline-block", padding: "12px 24px", backgroundColor: "var(--primary-color)", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 500, fontSize: "15px" }}>
            Launch App
          </Link>
        </div>

      </div>
    </div>
  );
}
