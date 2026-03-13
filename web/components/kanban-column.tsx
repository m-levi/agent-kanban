"use client";

import type { Task, KanbanColumn as KanbanColumnType } from "@/lib/types";
import { COLUMNS } from "@/lib/types";
import { KanbanCard } from "./kanban-card";

const columnColors: Record<KanbanColumnType, string> = {
  backlog: "var(--color-text-muted)",
  "in-progress": "var(--color-accent)",
  review: "var(--color-orange)",
  done: "var(--color-green)",
};

export function KanbanColumn({
  column,
  tasks,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
}) {
  return (
    <div className="flex flex-col border-r border-[var(--color-border)] last:border-r-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: columnColors[column.id] }}
        />
        <span className="text-sm font-medium text-[var(--color-text)]">
          {column.label}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-8">
            No tasks
          </p>
        )}
      </div>
    </div>
  );
}
