import { shares } from "../demographics";
import { DISTRICTS } from "../geo";

// The poll is not a number of its own: it is what the map adds up to. Each district splits between Cole
// (its support), Hale and Brandt (by who lives there and how hard each rival has worked it) and the
// undecided, and the city is the sum weighted by how many people really voted there in 2025.

export type Rival = "hale" | "brandt";
export type Strength = Record<Rival, Record<number, number>>;
export type Split = { cole: number; hale: number; brandt: number; undecided: number };

/** Undecided share of the electorate: 17% on day 1 (README), a few percent on election day. */
export const undecidedShare = (day: number) => Math.max(0.03, 0.17 - (0.14 * (day - 1)) / 29);

// Calibration (README section 11): day 1 must read Hale 38, Cole 31, Brandt 14, undecided 17.
// Two constants are solved once from the day-1 map; after that the model runs on its own.
//   COLE: how much of a district's support turns into votes for Cole.
//   HALE: how much Hale's lean outweighs Brandt's where both compete.
export const README_DAY1 = { cole: 31, hale: 38, brandt: 14 };
let COLE = 1;
let HALE = 1;

/** How strongly a district leans to each rival, from its voter groups (census shares where they exist). */
export function lean(cd: number) {
  const s = shares(cd);
  if (!s) return { hale: 1, brandt: 1 };
  return {
    hale: s.homeowners + s.seniors + s.donors * 3 + s.smallbiz,
    brandt: s.activists * 2 + s.students * 2 + s.renters * 0.5,
  };
}

/** One district's split, as shares of its voters. */
export function splitOf(cd: number, support: number, day: number, strength: Strength): Split {
  const undecided = undecidedShare(day);
  const committed = 1 - undecided;
  const cole = committed * Math.max(0, Math.min(1, (COLE * support) / 100));
  const rest = committed - cole;
  const l = lean(cd);
  const h = HALE * l.hale * (1 + (strength.hale[cd] ?? 0) / 100);
  const b = l.brandt * (1 + (strength.brandt[cd] ?? 0) / 100);
  return { cole, hale: (rest * h) / (h + b), brandt: (rest * b) / (h + b), undecided };
}

export const VOTERS = DISTRICTS.filter((d) => !d.park && d.vote).map((d) => ({ cd: d.cd, votes: d.vote!.votes }));

/** Citywide poll in whole points, summing to 100. */
export function pollOf(s: { sent: Record<number, number>; day: number; rivals: Record<Rival, { strength: Record<number, number> }> }) {
  const strength: Strength = { hale: s.rivals.hale.strength, brandt: s.rivals.brandt.strength };
  let total = 0;
  const sum: Split = { cole: 0, hale: 0, brandt: 0, undecided: 0 };
  for (const { cd, votes } of VOTERS) {
    const sp = splitOf(cd, s.sent[cd] ?? 50, s.day, strength);
    total += votes;
    sum.cole += sp.cole * votes;
    sum.hale += sp.hale * votes;
    sum.brandt += sp.brandt * votes;
  }
  const cole = Math.round((sum.cole / total) * 100);
  const hale = Math.round((sum.hale / total) * 100);
  const brandt = Math.round((sum.brandt / total) * 100);
  return { cole, hale, brandt };
}

/** Solve the two calibration constants so the day-1 map reproduces the README's race. */
export function calibrate(sent: Record<number, number>) {
  const none: Strength = { hale: {}, brandt: {} };
  const total = VOTERS.reduce((a, v) => a + v.votes, 0);
  const committed = 1 - undecidedShare(1);
  // Cole: scale support so his vote-weighted share among the committed matches the README.
  const meanSupport = VOTERS.reduce((a, v) => a + (sent[v.cd] ?? 50) * v.votes, 0) / total / 100;
  COLE = README_DAY1.cole / 100 / committed / meanSupport;
  // Hale vs Brandt: bisect the weight until Hale's share of the rest matches 38 : 14.
  const target = README_DAY1.hale / (README_DAY1.hale + README_DAY1.brandt);
  let lo = 0.01, hi = 100;
  for (let i = 0; i < 60; i++) {
    HALE = Math.sqrt(lo * hi);
    let h = 0, b = 0;
    for (const { cd, votes } of VOTERS) {
      const sp = splitOf(cd, sent[cd] ?? 50, 1, none);
      h += sp.hale * votes;
      b += sp.brandt * votes;
    }
    if (h / (h + b) < target) lo = HALE;
    else hi = HALE;
  }
}
