import { FACTIONS_2013 } from "../cases/mayor2013-factions";
import { LEANINGS_2013 } from "../cases/mayor2013-leanings";

// How the campaign can answer the morning's lead story. Each stance names what the campaign says (described, never
// quoted) and which voter groups it is likely to reach or put off. As with platform planks, the model only names
// the groups; code sizes the effect (run.ts). Without a key, or on any failure, three stances from the rules below.

export type Stance = { label: string; says: string; helps: string[]; annoys: string[] };
export type StanceRequest = { story: string; candidate: string; record: string[] };
export type StanceResult = { stances: Stance[]; mode: "live" | "rules" };

/** Points the aimed-at group moves come from the engine's rapid response; the others are a share of that. */
export const STANCE = { helps: 0.5, annoys: 0.6, citywide: 0.5 };

export const GROUPS = FACTIONS_2013.map((f) => ({ id: f.id, name: f.name, ...LEANINGS_2013[f.id] }));
const known = new Set(GROUPS.map((g) => g.id));

/** Keep only real group ids, at most three each, and never the same group on both sides. */
export function clean(s: Stance): Stance {
  const helps = [...new Set(s.helps.filter((g) => known.has(g)))].slice(0, 3);
  const annoys = [...new Set(s.annoys.filter((g) => known.has(g) && !helps.includes(g)))].slice(0, 3);
  return { label: s.label.trim(), says: s.says.trim(), helps, annoys };
}

/** Three stances that fit any story: take it head on, turn it on the front-runner, or move to your own plan. */
export function rulesStances(req: StanceRequest): StanceResult {
  const topic = req.story.split(/(?<=\.) /)[0].replace(/\.$/, "");
  const stances: Stance[] = [
    { label: "Take it head on", says: `The campaign takes a clear position on the story ("${topic}") and says what ${req.candidate} would do about it as mayor.`, helps: ["liberal", "black", "younger"], annoys: ["moderate", "conservative"] },
    { label: "Turn it on the front-runner", says: "The campaign ties the story to the twelve years of the incumbent and to the front-runner who worked alongside him.", helps: ["liberal", "brooklyn", "income-low"], annoys: ["manhattan", "income-high"] },
    { label: "Pivot to your own plan", says: "The campaign answers briefly and moves to its own plan: higher taxes on top earners to pay for pre-kindergarten and after-school programmes.", helps: ["income-low", "union", "women"], annoys: ["income-high"] },
  ];
  return { stances: stances.map(clean), mode: "rules" };
}
