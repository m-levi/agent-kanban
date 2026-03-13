"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  Compass,
  PenTool,
  AlertTriangle,
  Save,
} from "lucide-react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { Task } from "@/lib/types";
import { useKanbanStore } from "@/lib/store";
import { WORKER_URL } from "@/lib/agent";

const toolIcons: Record<string, typeof FileText> = {
  parse_brief: FileText,
  select_framework: Compass,
  write_draft: PenTool,
  critique_draft: AlertTriangle,
  save_output: Save,
};

const toolLabels: Record<string, string> = {
  parse_brief: "Parsing brief",
  select_framework: "Selecting framework",
  write_draft: "Draft Agent writing",
  critique_draft: "Critic Agent reviewing",
  save_output: "Saving output",
};

export function AgentChatDrawer({ task }: { task: Task }) {
  const selectTask = useKanbanStore((s) => s.selectTask);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const agent = useAgent({
    agent: "email-copy-agent",
    name: task.id,
    host: WORKER_URL,
  });

  const { messages, sendMessage, status } = useAgentChat({ agent });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="fixed top-0 right-0 h-dvh w-[420px] bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">
            {task.title}
          </h2>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            Email Copy Agent
          </span>
        </div>
        <button
          onClick={() => selectTask(null)}
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center mb-3">
              <PenTool size={20} className="text-[var(--color-accent)]" />
            </div>
            <p className="text-sm text-[var(--color-text-muted)] max-w-[260px]">
              Describe the email you need. Include the brand, products, offer,
              and target audience.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {/* User message */}
            {message.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-br-sm px-3.5 py-2.5 bg-[var(--color-accent)] text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {message.parts
                    ?.filter(
                      (p): p is { type: "text"; text: string } =>
                        p.type === "text",
                    )
                    .map((p) => p.text)
                    .join("") ?? ""}
                </div>
              </div>
            )}

            {/* Assistant message */}
            {message.role === "assistant" && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl rounded-bl-sm px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-sm leading-relaxed text-[var(--color-text)]">
                  {/* Parts rendering */}
                  {message.parts?.map((part, i) => {
                    // Tool parts: type is "tool-{name}" or "dynamic-tool"
                    const toolName =
                      part.type === "dynamic-tool"
                        ? (part as { toolName?: string }).toolName
                        : part.type.startsWith("tool-")
                          ? part.type.slice(5)
                          : null;

                    if (toolName) {
                      const ToolIcon = toolIcons[toolName] ?? FileText;
                      const label = toolLabels[toolName] ?? toolName;
                      const state = (part as { state?: string }).state;
                      const isDone =
                        state === "output-available" || state === "result";

                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 py-1.5 px-2 my-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-xs"
                        >
                          {isDone ? (
                            <CheckCircle2
                              size={14}
                              className="text-[var(--color-green)] shrink-0"
                            />
                          ) : (
                            <Loader2
                              size={14}
                              className="text-[var(--color-accent)] animate-spin shrink-0"
                            />
                          )}
                          <ToolIcon
                            size={14}
                            className="text-[var(--color-text-muted)] shrink-0"
                          />
                          <span className="text-[var(--color-text-muted)]">
                            {label}
                            {isDone ? " complete" : "..."}
                          </span>
                        </div>
                      );
                    }
                    if (part.type === "text") {
                      const text = (part as { text: string }).text;
                      if (!text.trim()) return null;
                      const isStreaming =
                        (part as { state?: string }).state === "streaming";
                      return (
                        <span key={i} className="whitespace-pre-wrap">
                          {text}
                          {isStreaming && (
                            <span className="inline-block w-0.5 h-4 bg-[var(--color-accent)] animate-pulse align-text-bottom ml-px" />
                          )}
                        </span>
                      );
                    }
                    return null;
                  })}

                  {/* Fallback: show spinner when message has no renderable content yet (streaming gap) */}
                  {(!message.parts ||
                    message.parts.length === 0 ||
                    !message.parts.some(
                      (p) =>
                        (p.type === "text" &&
                          (p as { text: string }).text.trim()) ||
                        p.type.startsWith("tool-") ||
                        p.type === "dynamic-tool",
                    )) && (
                    <Loader2
                      size={14}
                      className="text-[var(--color-accent)] animate-spin"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="rounded-xl rounded-bl-sm px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)]">
              <Loader2
                size={16}
                className="text-[var(--color-accent)] animate-spin"
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--color-border)]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe the email you need..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none max-h-[120px]"
            style={{
              height: "auto",
              minHeight: "38px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
