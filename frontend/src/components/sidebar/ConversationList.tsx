/* =============================================================================
   DocuMind — Conversation History Sidebar Component
   Shows chat threads for the selected document
   ============================================================================= */

"use client";

import { Conversation } from "@/lib/api";
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onNew: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onNew,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const submitEdit = (id: string) => {
    if (editValue.trim()) {
      onRename(id, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      <button
        className="new-chat-btn"
        onClick={onNew}
        title="Start a new conversation"
      >
        <Plus size={14} /> New Chat
      </button>

      {conversations.length === 0 ? (
        <div className="empty-state" style={{ padding: "24px 16px" }}>
          <div className="empty-state-icon"><MessageSquare size={24} /></div>
          <p style={{ fontSize: 12 }}>No conversations yet</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <div
            key={conv.id}
            className={`conv-card ${selectedId === conv.id ? "selected" : ""}`}
            onClick={() => onSelect(conv.id)}
          >
            <div className="conv-card-top">
              {editingId === conv.id ? (
                <div className="conv-edit-row" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="conv-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitEdit(conv.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button className="conv-edit-action" onClick={() => submitEdit(conv.id)} title="Save">
                    <Check size={12} />
                  </button>
                  <button className="conv-edit-action" onClick={() => setEditingId(null)} title="Cancel">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="conv-card-title" title={conv.title}>
                    <MessageSquare size={12} /> {conv.title}
                  </div>
                  <div className="conv-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="conv-action-btn"
                      onClick={() => startEdit(conv)}
                      title="Rename"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      className="conv-action-btn danger"
                      onClick={() => {
                        if (confirm(`Delete "${conv.title}"?`)) {
                          onDelete(conv.id);
                        }
                      }}
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="conv-card-meta">
              <span>{conv.message_count} messages</span>
              <span>{timeAgo(conv.updated_at)}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}
