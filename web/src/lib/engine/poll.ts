import { shares } from "../demographics";
import { DISTRICTS } from "../geo";

// The poll is not a number of its own: it is what the map adds up to. Each district splits between Cole
// (its support), Hale and Brandt (by who lives there and how hard each rival has worked it) and the
// undecided, and the city is the sum weighted by how many people really voted there in 2025.

export type Rival = "hale" | "brandt";
export type Strength = Record<Rival, Record<number, number>>;
export type Split = { cole: number; hale: number; brandt: number; undecided: number };

/** Undecided share of the electorate: about a fifth on day 1, a few percent on election day. */
export const undecidedShare = (day: number) => Math.max(0.03, 0.22 - (0.17 * (day - 1)) / 29);

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
  const cole = (committed * Math.max(0, Math.min(100, support))) / 100;
  const rest = committed - cole;
  const l = lean(cd);
  const h = l.hale * (1 + (strength.hale[cd] ?? 0) / 100);
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
