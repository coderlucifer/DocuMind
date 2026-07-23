/* =============================================================================
   DocuMind — Landing Page
   ============================================================================= */

import Link from "next/link";
import { 
  Brain, 
  Search, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Database,
  Network
} from "lucide-react";
import { SignInButton, UserButton, Show } from '@clerk/nextjs'

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <Brain className="landing-logo-icon" size={24} />
          <span>DocuMind</span>
        </div>
        <div className="landing-nav-links">
          <Link href="/chat" className="landing-nav-link">App</Link>
          <Link href="/eval" className="landing-nav-link">Evaluations</Link>
          <Link href="/docs" className="landing-nav-link">Docs</Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="landing-nav-btn">Sign In</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Powered by LangGraph & Gemini
          </div>
          <h1 className="hero-title">
            Research at the speed of thought.
          </h1>
          <p className="hero-subtitle">
            Upload complex PDFs and codebases. Ask multi-hop questions. Get cited, verifiable answers backed by an autonomous agentic retrieval pipeline.
          </p>
          <div className="hero-cta-group">
            <Link href="/chat" className="hero-btn-primary">
              Launch App <ArrowRight size={18} />
            </Link>
            <Link href="/docs" className="hero-btn-secondary">
              Documentation
            </Link>
          </div>
        </div>
        
        {/* Mockup / Abstract Visual */}
        <div className="hero-visual">
          <div className="hero-visual-card">
            <div className="hero-visual-header">
              <div className="hero-visual-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <span className="hero-visual-title">Agentic Workflow</span>
            </div>
            <div className="hero-visual-body">
              <div className="workflow-step">
                <Brain size={16} /> <span>Query Planning...</span>
              </div>
              <div className="workflow-step active">
                <Database size={16} /> <span>Hybrid Search (Pgvector + BM25)</span>
              </div>
              <div className="workflow-step">
                <Network size={16} /> <span>Synthesizing citations...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="section-title">Built for complex research.</h2>
        <p className="section-subtitle">Not just a basic RAG pipeline. DocuMind uses advanced AI patterns to ensure high precision.</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Search size={24} /></div>
            <h3>Hybrid Search & RRF</h3>
            <p>Combines Pgvector semantic search with BM25 keyword matching and Reciprocal Rank Fusion for unparalleled retrieval accuracy.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Network size={24} /></div>
            <h3>LangGraph Agents</h3>
            <p>Multi-step agent workflow that plans retrieval strategies, retrieves context, and self-critiques for hallucinations.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><ShieldCheck size={24} /></div>
            <h3>Verifiable Citations</h3>
            <p>Every answer includes precise source highlights and confidence scores, evaluated automatically by the Ragas framework.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={24} /></div>
            <h3>Semantic Caching</h3>
            <p>Powered by Redis. Repeated queries are answered instantly without hitting the LLM, reducing latency and costs.</p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <Brain size={20} /> DocuMind
          </div>
          <div className="landing-footer-copy">
            Built for production. Designed for speed.
          </div>
        </div>
      </footer>
    </div>
  );
}
