import { create } from "zustand";
import { STAFF, type Staff, type View } from "./data";

// Interface state: which tab is open, what is selected, the staff roster and who is busy.
// The campaign itself (money, poll, voter groups, the date, the work done) is NOT here. It lives in the case store,
// lib/cases/store.ts, and every screen reads it from there.

export type Toast = { id: number; staff: string; text: string };

type State = {
  view: View;
  /** What the Map colours by: "all" for the campaign's support, or the id of a case voter group to show where it lives. */
  filter: string;
  district: number | null;
  /** The post selected in the War room. */
  person: string | null;
  staff: Staff[];
  busy: Record<string, "down" | "up" | "work">;
  unread: Record<string, boolean>;
  /** Unprompted staff remarks on screen (lib/staff/speak). */
  toasts: Toast[];

  go: (v: View) => void;
  select: (p: Partial<Pick<State, "district" | "person" | "filter">>) => void;
  dismiss: (id: number) => void;
  instruct: (id: string, text: string) => void;
};

// Dev handle for driving the UI from the console: window.game.setState({ view: "map" })
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") queueMicrotask(() => ((window as unknown as { game: unknown }).game = useGame));

export const useGame = create<State>((set) => ({
  view: "case",
  filter: "all",
  district: null,
  person: null,
  staff: STAFF,
  busy: {},
  unread: {},
  toasts: [],

  go: (view) => set({ view }),
  select: (p) => set(p),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  // Staff are real agents (lib/staff). Loaded on demand to keep this store free of agent code.
  instruct: (id, text) => void import("./staff/run").then((m) => m.instruct(id, text)),
}));
