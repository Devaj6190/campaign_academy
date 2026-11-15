import { create } from "zustand";
import { DISTRICTS, districtBy } from "../geo";
import { CASES } from "./index";
import { effectOf, simulate, type Case, type Decision, type Shift, type World } from "./types";

// Where the student is in a case, what they chose, and the work done between decisions. The case file is never
// written; the student's world is always derived from their picks by `simulate`, with the work layer on top.

export type Pick = { option: string };

/**
 * One piece of work done between decisions: a staff job, or a rival's move. Simulated. `poll` is citywide points
 * by candidate id, `groups` is points in the case's own voter groups, `factions` is points in poll groups the case
 * does not simulate, and `districts` is points in one community district.
 */
export type Work = {
  id: number;
  date: string;
  /** A staff post id, "candidate", or a rival candidate's id. */
  by: string;
  label: string;
  /** One sentence on what happened, for the paper and for the rivals to react to. */
  note?: string;
  cost: number;
  raised: number;
  poll: Record<string, number>;
  groups: Record<string, number>;
  factions: Record<string, number>;
  districts: Record<number, number>;
};

type CaseState = {
  caseId: string;
  /** The step on screen in the Case tab: 0 is the briefing, 1..n are the decision points, n+1 is the debrief. */
  step: number;
  /** The furthest step the campaign has reached. The live world, the clock and the staff all work from here. */
  at: number;
  /** The live date, ISO. It moves with the clock (lib/cases/clock). */
  date: string;
  running: boolean;
  speed: number;
  /** The decision card is open. */
  card: boolean;
  picks: Record<string, Pick>;
  work: Work[];
  go: (step: number) => void;
  decide: (decision: string, pick: Pick) => void;
  addWork: (w: Omit<Work, "id" | "date">) => void;
  restart: () => void;
};

const fresh = () => ({ step: 0, at: 0, date: CASES[0].briefingDate, running: false, card: false, picks: {}, work: [] });

export const useCase = create<CaseState>((set) => ({
  caseId: CASES[0].id,
  speed: 1,
  ...fresh(),
  go: (step) => set({ step }),
  decide: (decision, pick) => set((s) => ({ picks: { ...s.picks, [decision]: pick } })),
  addWork: (w) => set((s) => ({ work: [...s.work, { ...w, id: s.work.length + 1, date: s.date }] })),
  restart: () => set(fresh()),
}));

// Dev handle for driving the case from the console, like window.game: window.caseStore.getState().decide(...)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") queueMicrotask(() => ((window as unknown as { caseStore: unknown }).caseStore = useCase));

export const currentCase = (id: string) => CASES.find((c) => c.id === id) ?? CASES[0];

const options = (picks: Record<string, Pick>) => Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, v.option]));

/**
 * What staff work has cost and brought in. The spending cap stays: money the staff raise pays for staff work, but
 * never lifts the campaign above what the case gives it, so `raised` stops at `spent`.
 */
export function staffMoney(work: Work[]) {
  const spent = work.reduce((a, x) => a + x.cost, 0);
  return { spent, raised: Math.min(spent, work.reduce((a, x) => a + x.raised, 0)) };
}

/**
 * The work layer, folded into where the case starts, so `simulate` carries it through every later step (including
 * how much of the closing stretch the money still covers). `until` leaves out work done after that date.
 */
function withWork(c: Case, until?: string): Case {
  const work = useCase.getState().work.filter((x) => !until || x.date <= until);
  if (!work.length) return c;
  const sum = (key: "poll" | "groups") => {
    const out = { ...c.start[key] };
    for (const x of work) for (const [k, v] of Object.entries(x[key])) if (k in out) out[k] = Math.max(0, Math.min(100, out[k] + v));
    return out;
  };
  const m = staffMoney(work);
  return { ...c, start: { ...c.start, budget: c.start.budget - m.spent + m.raised, poll: sum("poll"), groups: sum("groups") } };
}

/** The student's world on arriving at decision `index` (0-based), or at the end when `index` is the decision count. */
export const worldAt = (c: Case, picks: Record<string, Pick>, index: number): World => simulate(withWork(c, c.decisions[index]?.date), options(picks), index);

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

/** The live world: on arrival at the step the campaign has reached, plus that decision if made, plus all work so far. */
export function worldNow(): { c: Case; w: World } {
  const { caseId, picks, at } = useCase.getState();
  const c = currentCase(caseId);
  const i = Math.min(Math.max(at - 1, 0), c.decisions.length);
  const w = simulate(withWork(c), options(picks), i);
  const d = c.decisions[i];
  if (!d || !picks[d.id]) return { c, w };
  const ch = changeAt(c, picks, d);
  const plus = (base: Record<string, number>, x?: Record<string, number>) => Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v + (x?.[k] ?? 0)]));
  return { c, w: { budget: w.budget + (ch.budget ?? 0), poll: plus(w.poll, ch.poll), groups: plus(w.groups, ch.groups) } };
}

/** The live campaign: its world, the step and date it has reached and the days left. Re-renders the caller. */
export function useCaseNow() {
  const step = useCase((s) => s.at);
  const today = useCase((s) => s.date);
  useCase((s) => s.picks);
  useCase((s) => s.caseId);
  useCase((s) => s.work);
  const { c, w } = worldNow();
  const daysLeft = Math.max(0, Math.round((Date.parse(c.electionDate) - Date.parse(today)) / 86_400_000));
  return { c, w, step, today, daysLeft };
}

/** Points of work so far in each poll group the case does not simulate, by faction id. */
export function factionWork(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of useCase.getState().work) for (const [k, v] of Object.entries(x.factions)) out[k] = (out[k] ?? 0) + v;
  return out;
}

/**
 * Where a district's support sits on the map's colour scale (20 cold, 47.5 neutral, 75 warm): its distance from the
 * student's citywide standing. About five points either side spans the scale, so the map has contrast early and late.
 */
export function mapValue(support: number): number {
  const { c, w } = worldNow();
  return 47.5 + (support - (w.poll[c.follow] ?? support)) * 5;
}

/** "27 January 2013" from an ISO date. */
export const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
/** "27 Jan" from an ISO date. */
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
/** "$4.3M" or "$850k". */
export const shortMoney = (n: number) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n ? `$${Math.round(n / 1000)}k` : "$0");

export type Census = NonNullable<Case["groups"][number]["census"]>;

/** The share of a district's residents in one census group, in percent. Real, from the census. */
export const censusShare = (cd: number, census: Census) => districtBy(cd)?.demo?.race[census] ?? 0;

/** The same share for the whole city, weighted by population. */
export function cityShare(census: Census): number {
  let sum = 0, people = 0;
  for (const d of DISTRICTS) if (d.demo && !d.park) { sum += d.demo.race[census] * d.demo.pop; people += d.demo.pop; }
  return people ? sum / people : 0;
}

/** A district's share of the city's residents, 0 to 1: how far a change there moves the citywide figure. */
export function popShare(cd: number): number {
  let people = 0;
  for (const d of DISTRICTS) if (d.demo && !d.park) people += d.demo.pop;
  return people ? (districtBy(cd)?.demo?.pop ?? 0) / people : 0;
}

/**
 * The student's support in one community district, in percent: each group's support weighted by the share of
 * residents the census puts in that group there, plus any work done in that district. Residents outside the
 * tracked groups count at the citywide figure.
 */
export function supportIn(cd: number): number | null {
  const { c, w } = worldNow();
  return supportUnder(cd, c, w);
}

function supportUnder(cd: number, c: Case, w: World): number | null {
  if (!districtBy(cd)?.demo) return null;
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
  const local = useCase.getState().work.reduce((a, x) => a + (x.districts[cd] ?? 0), 0);
  return Math.max(0, Math.min(100, raw(cd) * (mean ? (w.poll[c.follow] ?? mean) / mean : 1) + local));
}

/** The map filter that colours districts by what one decision moved. */
export const decisionFilter = (id: string) => `decision:${id}`;

/** The decision a map filter names, once the student has made it: what they chose and what it changed. Simulated. */
export function decisionOf(filter: string): { d: Decision; label: string; change: Shift } | null {
  if (!filter.startsWith("decision:")) return null;
  const { caseId, picks } = useCase.getState(), c = currentCase(caseId);
  const d = c.decisions.find((x) => x.id === filter.slice("decision:".length));
  if (!d || !picks[d.id]) return null;
  return { d, label: d.options.find((o) => o.id === picks[d.id].option)?.label ?? "", change: changeAt(c, picks, d) };
}

/** The latest decision the student has made, if any. */
export function lastDecided(): Decision | undefined {
  const { caseId, picks } = useCase.getState();
  return [...currentCase(caseId).decisions].reverse().find((d) => picks[d.id]);
}

/**
 * How far a decision moved the student's support in each district, in points, by district number: support as it
 * stands, less support with that decision's change taken back out. A district moves when the decision moved a voter
 * group that lives there, or the citywide figure. Simulated.
 */
export function movedBy(change: Shift): Record<number, number> {
  const { c, w } = worldNow();
  const less = (base: Record<string, number>, x?: Record<string, number>) => Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v - (x?.[k] ?? 0)]));
  const before: World = { ...w, poll: less(w.poll, change.poll), groups: less(w.groups, change.groups) };
  return Object.fromEntries(DISTRICTS.filter((d) => d.demo && !d.park).map((d) => [d.cd, (supportUnder(d.cd, c, w) ?? 0) - (supportUnder(d.cd, c, before) ?? 0)]));
}
