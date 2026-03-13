"use client";

import { useState, Suspense } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useKanbanStore } from "@/lib/store";
import { COLUMNS } from "@/lib/types";
import { KanbanColumn } from "./kanban-column";
import { NewTaskDialog } from "./new-task-dialog";
import { AgentChatDrawer } from "./agent-chat-drawer";

export function KanbanBoard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { tasks, selectedTaskId } = useKanbanStore();
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-sm">
            AK
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            Agent Kanban
          </h1>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus size={16} />
          New Task
        </button>
      </header>

      {/* Board */}
      <div className="flex-1 flex overflow-x-auto">
        <div
          className={`flex-1 grid gap-0 min-w-0 transition-all ${
            selectedTask
              ? "grid-cols-[repeat(4,1fr)] mr-[420px]"
              : "grid-cols-[repeat(4,1fr)]"
          }`}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasks.filter((t) => t.column === col.id)}
            />
          ))}
        </div>

        {/* Chat Drawer */}
        {selectedTask && (
          <Suspense
            fallback={
              <div className="fixed top-0 right-0 h-dvh w-[420px] bg-[var(--color-surface)] border-l border-[var(--color-border)] flex items-center justify-center z-50">
                <Loader2
                  size={24}
                  className="text-[var(--color-accent)] animate-spin"
                />
              </div>
            }
          >
            <AgentChatDrawer task={selectedTask} />
          </Suspense>
        )}
      </div>

      {/* New Task Dialog */}
      <NewTaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
