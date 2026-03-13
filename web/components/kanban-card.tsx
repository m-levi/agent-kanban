"use client";

import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Trash2,
} from "lucide-react";
import type { Task, KanbanColumn } from "@/lib/types";
import { COLUMNS } from "@/lib/types";
import { useKanbanStore } from "@/lib/store";

const columnOrder: KanbanColumn[] = COLUMNS.map((c) => c.id);

export function KanbanCard({ task }: { task: Task }) {
  const { moveTask, deleteTask, selectTask, selectedTaskId } =
    useKanbanStore();

  const currentIndex = columnOrder.indexOf(task.column);
  const canMoveLeft = currentIndex > 0;
  const canMoveRight = currentIndex < columnOrder.length - 1;
  const isSelected = selectedTaskId === task.id;

  return (
    <div
      className={`group rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-bright)] hover:bg-[var(--color-surface-hover)]"
      }`}
      onClick={() => selectTask(isSelected ? null : task.id)}
    >
      {/* Agent badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
          Email Copy
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteTask(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-all cursor-pointer"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-[var(--color-text)] mb-1 line-clamp-2">
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canMoveLeft) moveTask(task.id, columnOrder[currentIndex - 1]);
            }}
            disabled={!canMoveLeft}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canMoveRight)
                moveTask(task.id, columnOrder[currentIndex + 1]);
            }}
            disabled={!canMoveRight}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            selectTask(task.id);
          }}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <MessageSquare size={12} />
          Chat
        </button>
      </div>
    </div>
  );
}
