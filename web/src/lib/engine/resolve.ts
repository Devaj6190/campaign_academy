import { presence } from "../demographics";
import { hash } from "../util";
import { ACTIONS, type ActionId } from "./catalog";
import type { BookingKind } from "./catalog";
import { CANDIDATE, profileFor, type Profile } from "../staff/roster";
import { findBoros, findFactions, findPlaces, PLACES, placeName, shortPlace, type Snapshot } from "../staff/world";

// Deterministic rules. Same inputs, same outcome, so the server can tell an agent what happened and the
// browser applies exactly that.

export type Effect = {
  by: string;
  /** A catalog action, or a change that comes from the manifesto or a tactic. */
  action: ActionId | "plank" | "tactic";
  label: string;
  district?: number;
  faction?: string;
  cost: number;
  raised: number;
  sent: Record<number, number>;
  factions: Record<string, number>;
  momentum: number;
  calendar?: string;
  /** A scheduled appearance: nothing happens now; the candidate does it in person on `date` (lib/staff/run runBookings). */
  booking?: { date: string; kind: BookingKind };
  /** A rival move: who made it and how much stronger they got in each district (poll.ts). */
  rival?: { who: "hale" | "brandt"; strength: Record<number, number> };
  /** False when the job went to someone without the skills for it. */
  fit: boolean;
  summary: string;
};

/** An Effect that doesn't come from the catalog (a manifesto plank, a tactic): fill in the zeros. */
export const effectOf = (p: Partial<Effect> & Pick<Effect, "by" | "action" | "label" | "summary">): Effect => ({ cost: 0, raised: 0, sent: {}, factions: {}, momentum: 0, fit: true, ...p });

export const profileOf = (w: Pick<Snapshot, "staff" | "hires">, id: string): Profile => {
  if (id === "candidate") return CANDIDATE;
  const p = w.staff.find((s) => s.id === id);
  return w.hires[id] ?? profileFor(id, p?.role ?? "");
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const r50 = (n: number) => Math.round(n / 50) * 50;

export function resolve(
  w: Snapshot,
  by: string,
  id: ActionId,
  p: { district?: number; faction?: string },
  ctx: { quality: number; seed: number; load: number },
): Effect {
  const a = ACTIONS[id];
  const prof = profileOf(w, by);
  const fit = a.skills.some((s) => prof.skills.includes(s));
  const morale = w.morale[by] ?? 70;
  const district = a.needs.district ? p.district ?? PLACES[Math.floor(hash(ctx.seed, 7) * PLACES.length)].cd : p.district;
  const faction = a.needs.faction ? p.faction ?? w.factions[0].id : p.faction;
  const boro = district ? Math.floor(district / 100) : 0;
  const turf = prof.turf?.includes(boro) || (district && prof.home?.includes(district)) ? 1.2 : 1;
  const stretched = ctx.load > 2 ? 0.85 : 1;
  const luck = 0.85 + hash(ctx.seed, 13) * 0.3;
  const mod = prof.effect * (prof.special?.[id] ?? 1) * turf * (0.85 + morale / 400) * ctx.quality * stretched * luck * (fit ? 1 : 0.65);

  // The catalog is written in engine units; the snapshot says what one unit is worth in the case.
  const k = w.scale;
  const cost = r50(a.cost * k.money * prof.cost * (fit ? 1 : 1.15));
  const sent: Record<number, number> = {};
  const factions: Record<string, number> = {};
  // Aiming at a group lands harder where that group really lives (census shares).
  const here = presence(district, p.faction ? faction : undefined);
  if (a.local && district) {
    const now = w.sent[district] ?? 50;
    sent[district] = r1(a.local * k.local * mod * here * Math.max(0.3, Math.min(1.2, (100 - now) / 55)));
  }
  if (a.group && faction) {
    const feel = w.factions.find((f) => f.id === faction)?.feel ?? 50;
    factions[faction] = r1(a.group * k.group * mod * here * Math.max(0.35, Math.min(1.2, (100 - feel) / 55)));
  }
  const raised = a.raise ? r50((a.raise[0] + (a.raise[1] - a.raise[0]) * hash(ctx.seed, 29)) * k.money * mod) : 0;
  const momentum = (a.momentum ?? 0) * mod;

  const place = district ? shortPlace(district) : "";
  const fname = w.factions.find((f) => f.id === faction)?.name ?? "";
  const sd = district ? sent[district] : 0;
  const fd = faction ? factions[faction] : 0;
  const n = (x: number) => Math.round(x).toLocaleString("en-US");
  const sign = (x: number) => (x >= 0 ? `+${x}` : `${x}`);
  const summary = (() => {
    switch (id) {
      case "canvass": return `Knocked ${n(700 * mod + 400 * luck)} doors in ${place}. Support ${sign(sd)}.`;
      case "phone_bank": return `Made ${n(1200 * mod)} calls into ${place}. Support ${sign(sd)}.`;
      case "rally": return `Rally in ${place} drew ${n(500 * mod + 300 * luck)} people. Support ${sign(sd)}${fname ? `, ${fname} ${sign(fd)}` : ""}.`;
      case "house_party": return `House party in ${place} raised $${n(raised)}.`;
      case "donor_dinner": return `Donor dinner raised $${n(raised)}.`;
      case "call_time": return `Call time raised $${n(raised)} from ${n(8 + 10 * mod)} donors.`;
      case "email_blast": return `Email to ${fname.toLowerCase()} raised $${n(raised)}. ${fname} ${sign(fd)}.`;
      case "digital_ads": return `Ads reached ${n(90000 * mod)} ${fname.toLowerCase()}. ${fname} ${sign(fd)}.`;
      case "mail_piece": return `Mailed ${n(6000 * mod)} homes in ${place}. ${fname} ${sign(fd)}, support ${sign(sd)}.`;
      case "press_pitch": return mod > 0.95 ? `Two outlets picked up the story. ${fname} ${sign(fd)}.` : `One small outlet ran it. ${fname} ${sign(fd)}.`;
      case "rapid_response": return `Response went out within the hour. ${fname} ${sign(fd)}.`;
      case "volunteer_training": return `Trained ${n(14 * mod + 6)} new volunteers in ${place}.`;
      case "coalition_meeting": return `Met ${fname.toLowerCase()} leaders. ${fname} ${sign(fd)}.`;
      case "policy_brief": return `Brief for ${fname.toLowerCase()} is out. ${fname} ${sign(fd)}.`;
      case "voter_targeting": return `Built a ${n(9000 * mod)}-voter target list for ${place}.`;
      case "schedule_event": return "On the candidate's calendar.";
    }
  })();
  const calendar = ["rally", "donor_dinner", "house_party", "coalition_meeting", "schedule_event"].includes(id) ? `${a.label}${district ? ` · ${shortPlace(district)}` : fname ? ` · ${fname}` : ""}` : undefined;

  return { by, action: id, label: a.label, district, faction, cost, raised, sent, factions, momentum, calendar, fit, summary: fit ? summary : `${summary} (Not their strength, so it cost more and did less.)` };
}

/** How clearly an instruction was given. Feeds a small multiplier and the coaching card. */
export function clarity(text: string) {
  const t = text.toLowerCase();
  const where = findPlaces(text).length > 0 || findBoros(text).length > 0;
  const who = findFactions(text).length > 0;
  const when = /\b(today|tonight|tomorrow|this week|by (mon|tues|wednes|thurs|fri|satur|sun)day|by friday|weekend|day \d+|before)\b/.test(t);
  const what = /\b(canvass|doors?|knock|rally|phone|calls?|e-?mail|ads?\b|mail|press|story|fundrais|donors?|raise|dinner|party|train|volunteers?|meet|brief|target|list|schedule|book|respond|hit back|draft|plan|write|build|recruit|hire)/.test(t);
  const words = t.split(/\s+/).filter(Boolean).length;
  const score = [where, who, when, what].filter(Boolean).length + (words >= 8 ? 0.5 : 0) - (words < 4 ? 1 : 0);
  const missing = [!what && "what to do", !where && "where", !who && "who it's for", !when && "by when"].filter(Boolean) as string[];
  return { score: Math.max(0, Math.min(4, score)), mult: 0.8 + Math.max(0, Math.min(4, score)) * 0.085, missing };
}

/** Whether the work landed with the right people. */
export function fitScore(effects: Effect[]) {
  if (!effects.length) return 1;
  return effects.filter((e) => e.fit).length / effects.length;
}

export const describeTeam = (w: Snapshot, director: string) =>
  w.staff.filter((s) => s.boss === director && s.name).map((s) => ({ ...s, profile: profileOf(w, s.id) }));

export { placeName };
