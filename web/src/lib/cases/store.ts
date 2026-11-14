import { create } from "zustand";
import { DISTRICTS, districtBy } from "../geo";
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

/** The student's world right now: on arrival at the current step, plus the current decision if it has been made. */
export function worldNow(): { c: Case; w: World } {
  const { caseId, picks, step } = useCase.getState();
  const c = currentCase(caseId);
  const i = Math.min(Math.max(step - 1, 0), c.decisions.length);
  const w = worldAt(c, picks, i);
  const d = c.decisions[i];
  if (!d || !picks[d.id]) return { c, w };
  const ch = changeAt(c, picks, d);
  const plus = (base: Record<string, number>, x?: Record<string, number>) => Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v + (x?.[k] ?? 0)]));
  return { c, w: { budget: w.budget + (ch.budget ?? 0), poll: plus(w.poll, ch.poll), groups: plus(w.groups, ch.groups) } };
}

/**
 * The student's support in one community district, in percent: each group's support weighted by the share of
 * residents the census puts in that group there. Residents outside the tracked groups count at the citywide figure.
 */
export function supportIn(cd: number): number | null {
  if (!districtBy(cd)?.demo) return null;
  const { c, w } = worldNow();
  const raw = (id: number) => {
    const race = districtBy(id)!.demo!.race;
    let sum = 0, covered = 0;
    for (const g of c.groups) {
      if (!g.census) continue;
      sum += race[g.census] * (w.groups[g.id] ?? 0);
      covered += race[g.census];
    }
    return (sum + Math.max(0, 100 - covered) * (w.poll[c.follow] ?? 0)) / Math.max(100, covered);
  };
  // Scale so the city as a whole, weighted by population, matches the student's citywide standing.
  let total = 0, people = 0;
  for (const d of DISTRICTS) if (d.demo && !d.park) { total += raw(d.cd) * d.demo.pop; people += d.demo.pop; }
  const mean = people ? total / people : 0;
  return Math.max(0, Math.min(100, raw(cd) * (mean ? (w.poll[c.follow] ?? mean) / mean : 1)));
}
