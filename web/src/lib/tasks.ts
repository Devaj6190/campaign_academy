import { create } from "zustand";

// The student's own to-do list in the sidebar. It starts empty and is saved with the campaign (lib/save.ts).
export type Task = { id: number; text: string; done: boolean };

export const useTasks = create<{ tasks: Task[]; add: (text: string) => void; toggle: (id: number) => void }>((set) => ({
  tasks: [],
  add: (text) => set((s) => ({ tasks: [...s.tasks, { id: Date.now(), text, done: false }] })),
  toggle: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
}));
