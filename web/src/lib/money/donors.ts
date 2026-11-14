import type { ActionId } from "../engine/catalog";
import { largestGroup } from "../demographics";
import { ASKS, FATIGUE, NYC, TRICKLE, type Gift, type Money } from "./rules";

// Fundraising brings in people, not just dollars. Each ask reaches certain groups, tires them a little,
// and produces donors with a typical gift. Small gifts from New Yorkers are what public funds match.

/** The groups an ask reaches, with weights that add up to 1. */
export function askGroups(id: ActionId, p: { district?: number; faction?: string }): [string, number][] {
  const a = ASKS[id];
  if (!a) return [];
  if (a.groups.length) return a.groups;
  const g = id === "house_party" ? (p.district ? largestGroup(p.district) : undefined) ?? "renters" : p.faction ?? "renters";
  return [[g, 1]];
}

/** How much of the usual yield an ask still gets from tired donors (1 = fresh). */
export function freshness(fatigue: Record<string, number> | undefined, groups: [string, number][]) {
  if (!fatigue || !groups.length) return 1;
  const tired = groups.reduce((a, [g, w]) => a + w * (fatigue[g] ?? 0), 0);
  return Math.max(FATIGUE.floor, 1 - tired);
}

/** Bigger checks are allowed when the campaign stays out of public financing (a higher legal limit). */
export const largeGiftBoost = (participant: boolean | null | undefined) => (participant === false ? 1.3 : 1);

/** Turn the dollars an ask raised into donors by group. Average gifts never exceed the legal limit. */
export function giftsOf(raised: number, groups: [string, number][], avg: number, nyc: number, participant: boolean | null | undefined): Gift[] {
  if (raised <= 0 || !groups.length) return [];
  const limit = participant === false ? NYC.limitNonParticipant : NYC.limitParticipant;
  const each = Math.min(limit, avg);
  return groups.map(([faction, w]) => ({ faction, count: Math.max(1, Math.round((raised * w) / each)), avg: each, nyc }));
}

export function giftsForAction(id: ActionId, raised: number, p: { district?: number; faction?: string }, participant?: boolean | null) {
  const a = ASKS[id];
  if (!a) return [];
  return giftsOf(raised, askGroups(id, p), a.avg * (a.large ? largeGiftBoost(participant) : 1), a.nyc, participant);
}

export const trickleGifts = (amount: number) => giftsOf(amount, TRICKLE.groups, TRICKLE.avg, TRICKLE.nyc, null);

/** Matchable dollars in a set of gifts: the first $250 of each NYC resident's gift. */
export const matchableOf = (gifts: Gift[]) => gifts.reduce((a, g) => a + Math.round(g.count * g.nyc) * Math.min(NYC.matchable, g.avg), 0);

/** Record gifts: donors by group, and the groups that were asked get a little more tired. */
export function addGifts(m: Money, gifts: Gift[], tireGroups: [string, number][]): Pick<Money, "donors" | "fatigue"> {
  const donors = { ...m.donors };
  for (const g of gifts) {
    const d = donors[g.faction] ?? { count: 0, nyc: 0, matchable: 0, dollars: 0 };
    const nyc = Math.round(g.count * g.nyc);
    donors[g.faction] = { count: d.count + g.count, nyc: d.nyc + nyc, matchable: d.matchable + nyc * Math.min(NYC.matchable, g.avg), dollars: d.dollars + g.count * g.avg };
  }
  const fatigue = { ...m.fatigue };
  for (const [g, w] of tireGroups) fatigue[g] = Math.min(1, (fatigue[g] ?? 0) + FATIGUE.perAsk * w);
  return { donors, fatigue };
}

/** Overnight, tired donors recover part of the way. */
export const recover = (f: Record<string, number>) => Object.fromEntries(Object.entries(f).map(([g, v]) => [g, Math.max(0, v * (1 - FATIGUE.recover) - 0.02)]));
