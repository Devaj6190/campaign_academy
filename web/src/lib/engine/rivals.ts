import { whereTheyLive } from "../demographics";
import { hash } from "../util";
import { ACTIONS, type ActionId } from "./catalog";
import { resolve, type Effect } from "./resolve";
import { lean, type Rival } from "./poll";
import { activeRivals, RIVAL_LIST, type RivalDef } from "../scenario";
import { PLACES, shortPlace, type Snapshot } from "../staff/world";
import { GAME } from "../money/rules";

// The rivals. Their moves come from the same catalog and are scored by the same rules as the student's,
// then turned against them: support falls where they work, the group they court cools on the student, and
// their own strength in those districts grows (which the poll reads). Who they are comes from the scenario.

export const RIVALS: Record<string, RivalDef> = Object.fromEntries(RIVAL_LIST.map((r) => [r.id, r]));

export type Move = { action: ActionId; district?: number; faction?: string };

/** Tonight's budget comes from the bank: a fair share of the cash for the days left, within the
 *  campaign's usual range, and (for a participant) within what the spending limit still allows. */
export function rivalBudget(who: Rival, b: { cash: number; spent: number; day: number; extra: boolean }) {
  const r = RIVALS[who];
  const daysLeft = Math.max(1, 30 - b.day);
  let budget = Math.max(r.perDay * 0.5, Math.min(b.cash / daysLeft, r.perDay * 2.2));
  if (r.participant) budget = Math.min(budget, Math.max(0, GAME.spendingLimit - b.spent) / daysLeft);
  return Math.max(0, Math.min(b.cash, budget * (b.extra ? 1.6 : 1)));
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Score a rival's move with the shared rules, then point it at Cole. */
export function rivalEffect(w: Snapshot, who: Rival, m: Move, seed: number): Effect {
  const r = RIVALS[who];
  // Rivals keep their own books (store.ts), so Cole's donor fatigue and budgets don't apply to them.
  const world = { ...w, money: undefined, hires: { ...w.hires, [who]: r.profile }, morale: { ...w.morale, [who]: 75 } };
  const base = resolve(world, who, m.action, { district: m.district, faction: m.faction }, { quality: 1, seed, load: 0 });
  const sent = Object.fromEntries(Object.entries(base.sent).map(([cd, d]) => [cd, r1(-0.25 * d)]));
  const factions = Object.fromEntries(Object.entries(base.factions).filter(([, d]) => d > 0).map(([f, d]) => [f, r1(-0.25 * d)]));
  // Where the move lands: its district, or (for citywide ads) the districts where the courted group lives.
  const where = base.district ? [base.district] : base.faction ? whereTheyLive(base.faction, 4).map((x) => x.cd) : [];
  const strength = Object.fromEntries(where.map((cd) => [cd, r1(2.5 * Math.max(1, Math.abs(ACTIONS[m.action].local ?? ACTIONS[m.action].group ?? 1)))]));
  const fname = w.factions.find((f) => f.id === base.faction)?.name.toLowerCase();
  const place = base.district ? ` in ${shortPlace(base.district)}` : "";
  const aim = fname && m.action !== "canvass" ? ` aimed at ${fname}` : "";
  const money = base.raised ? `, raising $${Math.round(base.raised / 1000)}k` : "";
  return {
    ...base,
    by: who,
    sent,
    factions,
    momentum: -0.6 * base.momentum,
    rival: { who, strength },
    fit: true,
    calendar: undefined,
    summary: `${r.short}: ${base.label.toLowerCase()}${place}${aim}${money}.`,
  };
}

/**
 * The fallback when there is no API key or an agent fails. Hale defends her base and contests whatever
 * Cole just won; Brandt works young-renter districts and courts activists and students.
 */
export function ruleMoves(w: Snapshot, who: Rival, gained: number[], budget: number, extra = false): Move[] {
  const r = RIVALS[who];
  const seed = w.day * 7 + RIVAL_LIST.findIndex((x) => x.id === who) + 1;
  // Where this rival is strongest relative to the others in the race.
  const others = activeRivals(w.day).filter((id) => id !== who);
  const rel = (cd: number) => { const l = lean(cd); return l[who] / (l[who] + others.reduce((a, id) => a + l[id], 0) || 1); };
  const ranked = [...PLACES].sort((a, b) => rel(b.cd) - rel(a.cd));
  const contest = gained.find((cd) => ranked.slice(0, 25).some((p) => p.cd === cd));
  const home = ranked[Math.floor(hash(seed) * 6)].cd;
  const court = r.courts[w.day % r.courts.length];
  const plan: Move[] = [
    { action: contest ? "rally" : "canvass", district: contest ?? home, faction: court },
    { action: w.day % 3 === 0 ? "digital_ads" : w.day % 3 === 1 ? "mail_piece" : "press_pitch", district: ranked[1 + Math.floor(hash(seed, 2) * 8)].cd, faction: r.courts[(w.day + 1) % r.courts.length] },
    r.smallShare < 0.5 ? { action: "donor_dinner" } : { action: "volunteer_training", district: ranked[2].cd },
  ];
  let left = budget;
  const picked: Move[] = [];
  for (const m of plan.slice(0, extra ? 3 : 2)) {
    const cost = ACTIONS[m.action].cost;
    if (cost <= left) { picked.push(m); left -= cost; }
  }
  return picked;
}
