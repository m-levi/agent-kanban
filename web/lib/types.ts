export type KanbanColumn = "backlog" | "in-progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  agentType: "email-copy";
  column: KanbanColumn;
  createdAt: string;
}

export const COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];
