import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, KanbanColumn } from "./types";

interface KanbanStore {
  tasks: Task[];
  selectedTaskId: string | null;
  addTask: (title: string, description: string) => void;
  moveTask: (id: string, column: KanbanColumn) => void;
  deleteTask: (id: string) => void;
  selectTask: (id: string | null) => void;
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set) => ({
      tasks: [],
      selectedTaskId: null,

      addTask: (title, description) => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          description,
          agentType: "email-copy",
          column: "backlog",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
      },

      moveTask: (id, column) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, column } : t,
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          selectedTaskId:
            state.selectedTaskId === id ? null : state.selectedTaskId,
        }));
      },

      selectTask: (id) => {
        set({ selectedTaskId: id });
      },
    }),
    {
      name: "agent-kanban-tasks",
    },
  ),
);
