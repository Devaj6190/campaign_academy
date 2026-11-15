import { FACTIONS } from "./data";
import type { LedgerEntry } from "./store";
import type { Staff } from "./data";
import { ME, nameOf } from "./scenario";

// Why a group feels the way it does. Every change to a group's feeling goes through the ledger (directly or
// as a knock-on from a group it moves with), so its whole history can be read back from it.

export type Cause = { id: number; day: number; min: number; who: string; what: string; delta: number; because?: string; becauseId?: string };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Who caused a ledger entry, in words the player recognises. */
export function actor(l: LedgerEntry, staff: Staff[]) {
  if (l.source === "candidate") return ME.short;
  if (l.source === "manifesto") return "Your manifesto";
  if (l.source === "tactic") return "Contrast ad";
  if (l.source === "debate") return "Debate";
  if (l.source === "rival") return nameOf(l.effect.by);
  return staff.find((p) => p.id === l.effect.by)?.name ?? "Staff";
}

/** Every change to one group, newest first. Knock-ons say which group's move caused them. */
export function causes(id: string, ledger: LedgerEntry[], staff: Staff[], names: Record<string, string>): Cause[] {
  const out: Cause[] = [];
  for (const l of ledger) {
    const direct = l.effect.factions[id];
    const knock = l.knock?.[id];
    const what = l.source === "manifesto" ? `“${l.effect.summary}”` : l.effect.summary.replace(/ \(Not their strength.*$/, "");
    if (direct) out.push({ id: l.id, day: l.day, min: l.min, who: actor(l, staff), what, delta: direct });
    if (knock) out.push({ id: l.id + 0.5, day: l.day, min: l.min, who: actor(l, staff), what, delta: knock.delta, because: names[knock.from] ?? knock.from, becauseId: knock.from });
  }
  return out.reverse();
}

/** How the group felt at the end of each day so far (day 1 starts from the seed data). */
export function feelHistory(id: string, ledger: LedgerEntry[], today: number) {
  let feel = FACTIONS.find((f) => f.id === id)?.feel ?? 50;
  const byDay: number[] = [];
  let i = 0;
  for (let day = 1; day <= today; day++) {
    for (; i < ledger.length && ledger[i].day <= day; i++) {
      const l = ledger[i];
      feel = Math.max(5, Math.min(95, feel + (l.effect.factions[id] ?? 0) + (l.knock?.[id]?.delta ?? 0)));
    }
    byDay.push(r1(feel));
  }
  return byDay;
}

/** The single biggest reason for the change so far, grouped by who did it. */
export function biggestReason(list: Cause[]) {
  const by: Record<string, number> = {};
  for (const c of list) {
    const key = c.because ? `${c.who}, via ${c.because}` : c.who;
    by[key] = (by[key] ?? 0) + c.delta;
  }
  const top = Object.entries(by).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  return top ? { who: top[0], delta: r1(top[1]) } : null;
}
