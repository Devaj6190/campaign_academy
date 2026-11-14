import { create } from "zustand";
import { CASES } from "./index";
import { effectOf, simulate, type Case, type Decision, type Shift, type World } from "./types";

// Where the student is in a case and what they chose. The case file is never written; the student's world is
// always derived from their picks by `simulate`.

export type Pick = { option: string; why: string };

type CaseState = {
  caseId: string;
  /** 0 is the briefing, 1..n are the decision points, n+1 is the debrief. */
  step: number;
  picks: Record<string, Pick>;
  go: (step: number) => void;
  decide: (decision: string, pick: Pick) => void;
  restart: () => void;
};

export const useCase = create<CaseState>((set) => ({
  caseId: CASES[0].id,
  step: 0,
  picks: {},
  go: (step) => set({ step }),
  decide: (decision, pick) => set((s) => ({ picks: { ...s.picks, [decision]: pick } })),
  restart: () => set({ step: 0, picks: {} }),
}));

export const currentCase = (id: string) => CASES.find((c) => c.id === id) ?? CASES[0];

const options = (picks: Record<string, Pick>) => Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, v.option]));

/** The student's world on arriving at decision `index` (0-based), or at the end when `index` is the decision count. */
export const worldAt = (c: Case, picks: Record<string, Pick>, index: number): World => simulate(c, options(picks), index);

/** What the student's choice at a decision changed, summed into one shift. Simulated. */
export function changeAt(c: Case, picks: Record<string, Pick>, d: Decision): Shift {
  const out: Required<Shift> = { budget: 0, poll: {}, groups: {} };
  for (const s of effectOf(c, d, picks[d.id]?.option, options(picks))) {
    out.budget += s.budget ?? 0;
    for (const [k, v] of Object.entries(s.poll ?? {})) out.poll[k] = (out.poll[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.groups ?? {})) out.groups[k] = (out.groups[k] ?? 0) + v;
  }
  return out;
}
