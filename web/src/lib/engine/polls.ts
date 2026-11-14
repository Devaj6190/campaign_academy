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
const noise = (day: number, k: number) => hash(day * 131 + k, 17) + hash(day * 71 + k, 29) - 1;

export function publish(w: World, day: number): PollRecord {
  const p = POLLSTERS[POLL_DAYS.indexOf(day) % POLLSTERS.length] ?? POLLSTERS[0];
  const cole = Math.round(w.truth.cole + noise(day, 1) * p.moe);
  const hale = Math.round(w.truth.hale + noise(day, 2) * p.moe);
  const brandt = Math.round(w.truth.brandt + noise(day, 3) * p.moe);
  const groups = Object.fromEntries(w.factions.map((f, i) => [f.id, { feel: Math.max(5, Math.min(95, Math.round(f.feel + noise(day, 10 + i) * 5))), moe: 5 }]));
  return { day, pollster: p.name, n: p.n, moe: p.moe, cole, hale, brandt, undecided: Math.max(0, 100 - cole - hale - brandt), groups, upTo: w.ledger.at(-1)?.id ?? 0 };
}

export const isPollDay = (day: number) => POLL_DAYS.includes(day);
