import { DISTRICTS } from "../geo";
import { ACTIVE, activeRivals, ME, RIVAL_LIST, undecidedShare, type Shares } from "../scenario";

// The poll is not a number of its own: it is what the map adds up to. Each district splits between the student
// (its support), the rivals in the race (by who lives there and how hard each has worked it) and the undecided,
// and the city is the sum weighted by how many people really voted there in 2025.

export type Rival = string;
export type Strength = Record<string, Record<number, number>>;
export type { Shares };

export { undecidedShare };

// Calibration: day 1 must read as the scenario's opening poll. One constant turns district support into votes
// for the student; one weight per rival sets how their lean converts into votes. Solved once from the day-1 map.
let ME_K = 1;
const W: Record<string, number> = Object.fromEntries(RIVAL_LIST.map((r) => [r.id, 1]));

/** How strongly a district leans to each rival, from its voter groups (census shares where they exist). */
export const lean = (cd: number): Record<string, number> => Object.fromEntries(RIVAL_LIST.map((r) => [r.id, r.lean(cd)]));

/** One district's split, as shares of its voters: the student, each rival in the race, and undecided. */
export function splitOf(cd: number, support: number, day: number, strength: Strength): Shares {
  const undecided = undecidedShare(day);
  const committed = 1 - undecided;
  const mine = committed * Math.max(0, Math.min(1, (ME_K * support) / 100));
  const rest = committed - mine;
  const ids = activeRivals(day);
  const pull = Object.fromEntries(ids.map((id) => [id, W[id] * Math.max(0.0001, RIVAL_LIST.find((r) => r.id === id)!.lean(cd)) * (1 + (strength[id]?.[cd] ?? 0) / 100)]));
  const sum = Object.values(pull).reduce((a, b) => a + b, 0) || 1;
  const out: Shares = { [ME.id]: mine, undecided };
  for (const r of RIVAL_LIST) out[r.id] = ids.includes(r.id) ? (rest * pull[r.id]) / sum : 0;
  return out;
}

export const VOTERS = DISTRICTS.filter((d) => !d.park && d.vote).map((d) => ({ cd: d.cd, votes: d.vote!.votes }));

const strengthOf = (rivals: Record<string, { strength: Record<number, number> }>): Strength => Object.fromEntries(Object.entries(rivals).map(([k, v]) => [k, v.strength]));

/** Citywide shares (0..1) for everyone, before rounding. */
function cityShares(sent: Record<number, number>, day: number, strength: Strength): Shares {
  let total = 0;
  const sum: Shares = {};
  for (const { cd, votes } of VOTERS) {
    const sp = splitOf(cd, sent[cd] ?? 50, day, strength);
    total += votes;
    for (const [k, v] of Object.entries(sp)) sum[k] = (sum[k] ?? 0) + v * votes;
  }
  return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / total]));
}

/** Citywide poll in whole points, by candidate id (undecided is what is left). */
export function pollOf(s: { sent: Record<number, number>; day: number; rivals: Record<string, { strength: Record<number, number> }> }): Shares {
  const c = cityShares(s.sent, s.day, strengthOf(s.rivals));
  return Object.fromEntries([ME.id, ...RIVAL_LIST.map((r) => r.id)].map((id) => [id, Math.round((c[id] ?? 0) * 100)]));
}

/** Solve the calibration so the day-1 map reproduces the scenario's opening poll. */
export function calibrate(sent: Record<number, number>) {
  const total = VOTERS.reduce((a, v) => a + v.votes, 0);
  const committed = 1 - undecidedShare(1);
  const meanSupport = VOTERS.reduce((a, v) => a + (sent[v.cd] ?? 50) * v.votes, 0) / total / 100;
  ME_K = (ACTIVE.startPoll[ME.id] ?? 0) / 100 / committed / meanSupport;
  // Rival weights: scale each until its share of the rest matches the opening poll (iterative proportional fit).
  const ids = activeRivals(1);
  const target = Object.fromEntries(ids.map((id) => [id, ACTIVE.startPoll[id] ?? 0]));
  const tsum = Object.values(target).reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < 200; i++) {
    const c = cityShares(sent, 1, {});
    const csum = ids.reduce((a, id) => a + c[id], 0) || 1;
    for (const id of ids) W[id] *= Math.pow(target[id] / tsum / (c[id] / csum), 0.8);
  }
  // Rivals who join later start from the average weight, so their pull is comparable when they arrive.
  const mean = ids.reduce((a, id) => a + W[id], 0) / Math.max(1, ids.length);
  for (const r of RIVAL_LIST) if (!ids.includes(r.id)) W[r.id] = mean;
}

/** How much district support it takes to move the student's citywide share by one point on this day. */
export const supportPerPoint = (day: number) => 1 / Math.max(0.05, ME_K * (1 - undecidedShare(day)));
