import { whereTheyLive } from "../demographics";
import { hash } from "../util";
import { ACTIONS, type ActionId } from "./catalog";
import { resolve, type Effect } from "./resolve";
import { lean, type Rival } from "./poll";
import { PLACES, shortPlace, type Snapshot } from "../staff/world";
import type { Profile } from "../staff/roster";

// Hale and Brandt. Their moves come from the same catalog and are scored by the same rules as Cole's,
// then turned against him: support for Cole falls where they work, the group they court cools on Cole,
// and their own strength in those districts grows (which the poll reads).

export const RIVALS: Record<Rival, { name: string; short: string; cash: number; perDay: number; runsOn: string; base: string; profile: Profile }> = {
  hale: {
    name: "Victoria Hale",
    short: "Hale",
    cash: 900_000,
    perDay: 30_000,
    runsOn: "public safety and business: more police officers, lower property taxes, fewer fines and rules for small business",
    base: "homeowners, seniors, donors and real estate, Staten Island and southern Brooklyn",
    profile: { skills: ["planning", "field", "volunteers", "finance", "events", "comms", "press", "digital", "policy", "data"], cost: 1, effect: 1, voice: "Disciplined front-runner with money.", salary: 0 },
  },
  brandt: {
    name: "Naomi Brandt",
    short: "Brandt",
    cash: 250_000,
    perDay: 9_000,
    runsOn: "rent and police reform: rent freezes, tenant protection, moving police money to services",
    base: "young activists, students and young renters in north Brooklyn and upper Manhattan",
    profile: { skills: ["planning", "field", "volunteers", "events", "comms", "press", "digital", "policy"], cost: 0.9, effect: 1.05, voice: "Energetic insurgent with volunteers, not money.", salary: 0 },
  },
};

export type Move = { action: ActionId; district?: number; faction?: string };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Score a rival's move with the shared rules, then point it at Cole. */
export function rivalEffect(w: Snapshot, who: Rival, m: Move, seed: number): Effect {
  const r = RIVALS[who];
  const world = { ...w, hires: { ...w.hires, [who]: r.profile }, morale: { ...w.morale, [who]: 75 } };
  const base = resolve(world, who, m.action, { district: m.district, faction: m.faction }, { quality: 1, seed, load: 0 });
  const sent = Object.fromEntries(Object.entries(base.sent).map(([cd, d]) => [cd, r1(-0.6 * d)]));
  const factions = Object.fromEntries(Object.entries(base.factions).filter(([, d]) => d > 0).map(([f, d]) => [f, r1(-0.4 * d)]));
  // Where the move lands: its district, or (for citywide ads) the districts where the courted group lives.
  const where = base.district ? [base.district] : base.faction ? whereTheyLive(base.faction, 4).map((x) => x.cd) : [];
  const strength = Object.fromEntries(where.map((cd) => [cd, r1(4 * Math.max(1, Math.abs(ACTIONS[m.action].local ?? ACTIONS[m.action].group ?? 1)))]));
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
  const seed = w.day * 7 + (who === "hale" ? 1 : 2);
  const ranked = [...PLACES].sort((a, b) => {
    const la = lean(a.cd), lb = lean(b.cd);
    return who === "hale" ? lb.hale / (lb.hale + lb.brandt) - la.hale / (la.hale + la.brandt) : lb.brandt / (lb.hale + lb.brandt) - la.brandt / (la.hale + la.brandt);
  });
  const contest = gained.find((cd) => ranked.slice(0, 25).some((p) => p.cd === cd));
  const home = ranked[Math.floor(hash(seed) * 6)].cd;
  const plan: Move[] =
    who === "hale"
      ? [
          { action: contest ? "rally" : "canvass", district: contest ?? home, faction: "homeowners" },
          { action: w.day % 3 === 0 ? "digital_ads" : "mail_piece", district: ranked[1 + Math.floor(hash(seed, 2) * 8)].cd, faction: w.day % 2 ? "seniors" : "homeowners" },
          { action: "donor_dinner" },
        ]
      : [
          { action: "canvass", district: home, faction: "renters" },
          { action: w.day % 2 ? "press_pitch" : "digital_ads", faction: w.day % 3 ? "activists" : "students" },
          { action: "volunteer_training", district: ranked[2].cd },
        ];
  let left = budget;
  const picked: Move[] = [];
  for (const m of plan.slice(0, extra ? 3 : 2)) {
    const cost = ACTIONS[m.action].cost;
    if (cost <= left) { picked.push(m); left -= cost; }
  }
  return picked;
}
