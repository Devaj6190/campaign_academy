import { ACTIONS, type ActionId } from "../engine/catalog";
import { presence } from "../demographics";
import { FACTIONS_2013 } from "./mayor2013-factions";
import { linksOf } from "./mayor2013-links";
import { BOROS, PLACES } from "../staff/world";

// The campaign's standing weekly plan, set with the sliders in the top bar (#33). Each line buys one catalog action a
// number of times a week, aimed at a borough or a voter group. Once a week the clock spends the plan through the same
// path a staff job takes (lib/sim/spend), so every dollar lands as work and moves the poll, the groups and the map.
// Simulated: the case has no record of how the real campaign split its money week by week.
//
// This file is data and pure functions only. Nothing here writes to a store, so the store can import it.

export type LineId = "doors" | "rallies" | "call" | "small" | "dinners" | "press" | "mail" | "ads";
/** `to`: a borough number as a string ("3"), a voter group id, or "core" for the campaign's core groups in turn. */
export type Allocation = Record<LineId, { n: number; to?: string }>;

export type Line = {
  id: LineId;
  label: string;
  side: "out" | "in";
  /** The post whose people do it. */
  by: "fd" | "fin" | "com";
  action: ActionId;
  target: "boro" | "group" | "none";
  /** Most a week. Call time is capped by the candidate's day: each session uses one of his appearances. */
  max: number;
  /** What it does in the world, in a few words, for the panel. */
  does: string;
};

// The order matters: it is the order the week's jobs run in, and the engine check's seeds follow it.
export const LINES: Line[] = [
  { id: "doors", label: "Doors and phones", side: "out", by: "fd", action: "canvass", target: "boro", max: 8, does: "Moves districts" },
  { id: "rallies", label: "Rallies", side: "out", by: "fd", action: "rally", target: "boro", max: 4, does: "Moves districts a lot" },
  { id: "call", label: "Call time", side: "in", by: "fin", action: "call_time", target: "none", max: 2, does: "Large donors. Uses the candidate's day" },
  { id: "small", label: "Small donors", side: "in", by: "fin", action: "email_blast", target: "group", max: 6, does: "Warms the group that gives" },
  { id: "dinners", label: "Donor dinners", side: "in", by: "fin", action: "donor_dinner", target: "none", max: 3, does: "Raises most. Liberals notice" },
  { id: "press", label: "Press", side: "out", by: "com", action: "press_pitch", target: "group", max: 6, does: "Moves a voter group" },
  { id: "mail", label: "Mail", side: "out", by: "com", action: "mail_piece", target: "group", max: 6, does: "A group, where it lives" },
  { id: "ads", label: "Digital ads", side: "out", by: "com", action: "digital_ads", target: "group", max: 6, does: "Moves a voter group" },
];

export const lineOf = (id: LineId) => LINES.find((l) => l.id === id)!;

/** The campaign's core groups, pitched in turn when a line's target is "core". */
export const CORE = ["liberal", "black", "income-low", "brooklyn"];
/** Donor dinners land on this group: big-money events are what liberal activists object to. Spill carries it on. */
export const DINNER_GROUP = "liberal";

/**
 * The plan a new campaign starts with: one Brooklyn canvass, one call-time session and one press pitch a week, the
 * typical staff plan the engine is fitted with (lib/sim/headless TYPICAL_STAFF). A student who never touches the
 * sliders gets the calibrated race.
 */
export const DEFAULT_ALLOCATION: Allocation = {
  doors: { n: 1, to: "3" },
  rallies: { n: 0, to: "3" },
  call: { n: 1 },
  small: { n: 0, to: "younger" },
  dinners: { n: 0 },
  press: { n: 1, to: "core" },
  mail: { n: 0, to: "older" },
  ads: { n: 0, to: "younger" },
};

/** One job for one day: who does what, where. `line` marks work bought by the plan; `load` is its place in the week. */
export type Job = { by: string; action: ActionId; district?: number; faction?: string; line?: LineId; load?: number };

/** The plan is spent on every seventh campaign day (day 1 is the briefing), as the typical staff plan was. */
export const isPlanDay = (day: number) => day > 0 && day % 7 === 0;

const inBoro = (b: number) => PLACES.filter((p) => Math.floor(p.cd / 100) === b).map((p) => p.cd);

/** Where mail to a group goes: the districts where the census puts the most of it, or every district if it cannot. */
function mailDistricts(group: string): number[] {
  const ranked = PLACES.map((p) => ({ cd: p.cd, v: presence(p.cd, group) })).sort((a, b) => b.v - a.v || a.cd - b.cd);
  return ranked[0].v > 1 ? ranked.slice(0, 6).map((x) => x.cd) : PLACES.map((p) => p.cd);
}

/** The week's jobs for a plan on a campaign day, in LINES order. Pure: the same plan and day give the same jobs. */
export function jobsFor(a: Allocation, day: number): Job[] {
  if (!isPlanDay(day)) return [];
  const week = day / 7;
  const out: Job[] = [];
  for (const l of LINES) {
    const { n, to } = a[l.id] ?? { n: 0 };
    for (let k = 0; k < n; k++) {
      // Several of one line in a week rotate through places and groups, so they do not all land on one spot.
      const turn = week * n + k;
      const job: Job = { by: l.by, action: l.action, line: l.id, load: k + 1 };
      if (l.target === "boro") { const cds = inBoro(+(to ?? 3)); job.district = cds[turn % cds.length]; }
      if (l.target === "group") job.faction = to === "core" || !to ? CORE[turn % CORE.length] : to;
      if (l.action === "mail_piece") { const cds = mailDistricts(job.faction!); job.district = cds[turn % cds.length]; }
      if (l.action === "donor_dinner") job.faction = DINNER_GROUP;
      out.push(job);
    }
  }
  return out;
}

/** How much of what a group gains spills into each group it agrees with, and is lost with each it splits from. */
export const SPILL = 0.25;
/** Each time a donor pool was asked in the last four weeks, the next ask brings in this much less, compounding. */
export const FATIGUE = 0.2;

/**
 * Points spread from a set of voter groups into the groups linked to them in the 2013 poll tables
 * (mayor2013-links): a share of the same sign into groups that agree, of the opposite sign into groups that split.
 * Simulated. Returns only the spilled points, to add to the original.
 */
export function spill(groups: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [g, d] of Object.entries(groups)) {
    for (const l of linksOf(g)) out[l.other] = Math.round(((out[l.other] ?? 0) + (l.kind === "shared" ? 1 : -1) * SPILL * d) * 100) / 100;
  }
  return out;
}

const groupName = (id: string) => FACTIONS_2013.find((f) => f.id === id)?.name ?? id;

/** "Brooklyn", "Black voters", "core groups in turn", or "" for a line with no target. */
export function targetName(l: Line, to?: string): string {
  if (l.target === "boro") return BOROS[+(to ?? 3)] ?? "";
  if (l.target === "group") return to === "core" || !to ? "core groups in turn" : groupName(to);
  return "";
}

/** The plan in words, for the staff agents: what runs every week without anyone ordering it. */
export function describePlan(a: Allocation, cost: (l: Line) => number): string[] {
  return LINES.filter((l) => a[l.id]?.n).map((l) => {
    const where = targetName(l, a[l.id].to);
    return `${l.label}: ${a[l.id].n} a week (${ACTIONS[l.action].label.toLowerCase()}${where ? `, ${where}` : ""}), about $${Math.round(cost(l) * a[l.id].n).toLocaleString("en-US")}`;
  });
}

/** The places and groups a plan line can aim at, for its target menu. */
export function targetsOf(l: Line): { id: string; name: string }[] {
  if (l.target === "boro") return [1, 2, 3, 4, 5].map((b) => ({ id: String(b), name: BOROS[b] }));
  if (l.target === "group") return [{ id: "core", name: "Core groups in turn" }, ...FACTIONS_2013.map((f) => ({ id: f.id, name: f.name }))];
  return [];
}
