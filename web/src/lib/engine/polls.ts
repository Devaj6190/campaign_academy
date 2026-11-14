import { hash } from "../util";

// Public opinion is only ever seen through polls. A poll comes out every few days, from one of three
// fictional pollsters, each with a sample size and a margin of error. Published numbers are the true
// opinion plus seeded sampling error, so two polls can disagree and no single decision gets a number.

export const POLL_DAYS = [1, 4, 7, 10, 13, 16, 19, 22, 24, 26, 28, 30];

export const POLLSTERS = [
  { name: "Empire Research", n: 1000, moe: 3.1 },
  { name: "Hudson Valley Poll", n: 800, moe: 3.5 },
  { name: "Five Boroughs Survey", n: 1200, moe: 2.8 },
];

export type PollRecord = {
  day: number;
  pollster: string;
  n: number;
  moe: number;
  cole: number;
  hale: number;
  brandt: number;
  undecided: number;
  /** How each voter group feels about Cole in this poll, with its (larger) subgroup margin. */
  groups: Record<string, { feel: number; moe: number }>;
  /** Ledger ids after this one happened after the poll was taken. */
  upTo: number;
};

type World = { truth: { cole: number; hale: number; brandt: number }; factions: { id: string; feel: number }[]; ledger: { id: number }[] };

// Roughly triangular error in [-1, 1], seeded by the day and the measure, so it is stable and fair.
const noise = (day: number, k: number) => hash(day * 7919 + k * 104729, k * 31 + 17) + hash(day * 6271 + k * 130363, k * 37 + 29) - 1;

export function publish(w: World, day: number): PollRecord {
  const p = POLLSTERS[POLL_DAYS.indexOf(day) % POLLSTERS.length] ?? POLLSTERS[0];
  // Sampling error moves the four shares (undecided included) and nets out, so they still add up to 100.
  const truth = [w.truth.cole, w.truth.hale, w.truth.brandt, Math.max(0, 100 - w.truth.cole - w.truth.hale - w.truth.brandt)];
  const err = truth.map((_, k) => noise(day, k + 1) * p.moe * 0.7);
  const mean = err.reduce((x, y) => x + y, 0) / err.length;
  const [cole, hale, brandt] = truth.map((t, k) => Math.max(1, Math.round(t + err[k] - mean)));
  const groups = Object.fromEntries(w.factions.map((f, i) => [f.id, { feel: Math.max(5, Math.min(95, Math.round(f.feel + noise(day, 10 + i) * 5))), moe: 5 }]));
  return { day, pollster: p.name, n: p.n, moe: p.moe, cole, hale, brandt, undecided: Math.max(0, 100 - cole - hale - brandt), groups, upTo: w.ledger.at(-1)?.id ?? 0 };
}

export const isPollDay = (day: number) => POLL_DAYS.includes(day);
