/* =============================================================================
   DocuMind — Document Sidebar Component
   ============================================================================= */

"use client";

import { Document } from "@/lib/api";
import { 
  FileText, 
  Trash2, 
  Loader2, 
  Settings, 
  GitBranch, 
  Binary, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

interface DocumentSidebarProps {
  documents: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "uploading": return <Loader2 size={12} className="spinner-icon" />;
    case "processing": return <Settings size={12} className="spinner-icon" />;
    case "chunking": return <GitBranch size={12} />;
    case "embedding": return <Binary size={12} />;
    case "ready": return <CheckCircle2 size={12} />;
    case "error": return <AlertCircle size={12} />;
    default: return <Settings size={12} />;
  }
}

export default function DocumentSidebar({
  documents,
  selectedId,
  onSelect,
  onDelete,
}: DocumentSidebarProps) {
  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><FileText size={32} /></div>
        <h3>No Documents</h3>
        <p>Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`doc-card ${selectedId === doc.id ? "selected" : ""}`}
          onClick={() => onSelect(doc.id)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div className="doc-card-name" title={doc.original_name}>
              <FileText size={14} style={{ flexShrink: 0 }} /> {doc.original_name}
            </div>
            <button
              className="doc-delete"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${doc.original_name}"?`)) {
                  onDelete(doc.id);
                }
              }}
              title="Delete document"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="doc-card-meta">
            <span className={`doc-status ${doc.status}`}>
              {getStatusIcon(doc.status)}
              {doc.status}
            </span>
            <span>{formatFileSize(doc.file_size)}</span>
            {doc.page_count > 0 && <span>{doc.page_count} pages</span>}
            {doc.total_chunks > 0 && <span>{doc.total_chunks} chunks</span>}
          </div>
        </div>
      ))}
    </>
  );
}
