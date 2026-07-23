import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuMind — Agentic RAG Research Assistant",
  description:
    "Upload any PDF or codebase, ask complex multi-hop questions, and get cited, verified answers with source highlights. Powered by LangGraph, hybrid search, and self-reflective retrieval.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
