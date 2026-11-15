// The platform's rules. A plank the student adds is permanent, and one can go in between each pair of decisions.
// What a plank does is computed here from who it serves and who it costs: the model only names the groups.
// Adapted from feat/combined (lib/manifesto) to the case's voter groups.

/** Points of support a plank moves in a group it serves, and in a group it costs. Offence costs more than service earns. */
export const PLANK = { serves: 1.5, offends: 2 };
/** The most one plank can move the citywide figure either way. The poll groups overlap, so their sum would overstate it. */
export const PLANK_CITYWIDE = 0.4;

export type Reach = { faction: string; why: string };
export type Plank = {
  text: string;
  /** The step and date it was adopted on. */
  at: number;
  date: string;
  /** Who shaped it: "pol" for the Policy Director, "staff" for a generic draft. */
  by: string;
  serves: Reach[];
  offends: Reach[];
  tradeoff?: string;
};
/** `poll`: a line from a published poll about this group, where one exists. `values` and `dislikes` are inferred. */
export type ShapeRequest = {
  idea: string;
  factions: { id: string; name: string; values: string[]; dislikes: string[]; poll?: string }[];
  planks: string[];
  candidate: string;
  framing: string;
  director: { name: string; voice: string } | null;
};
export type Shaped = { text: string; serves: Reach[]; offends: Reach[]; tradeoff: string; mode: "live" | "rules"; by: string };

/** Whether a new plank can go in at this step. */
export const canAdd = (planks: { at: number }[], at: number) => !planks.some((p) => p.at === at);

/** The plank's effect on each group it names, in points of support. A sharper draft serves better; offence does not shrink. */
export function effectsOf(p: Pick<Plank, "serves" | "offends">, quality: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of p.serves) out[r.faction] = Math.round(((out[r.faction] ?? 0) + PLANK.serves * quality) * 10) / 10;
  for (const r of p.offends) out[r.faction] = Math.round(((out[r.faction] ?? 0) - PLANK.offends) * 10) / 10;
  return out;
}

/** Groups the platform both serves and costs: the contradictions an opponent will find. */
export function contradictions(planks: Pick<Plank, "serves" | "offends">[]) {
  const served = new Set(planks.flatMap((p) => p.serves.map((r) => r.faction)));
  return [...new Set(planks.flatMap((p) => p.offends.map((r) => r.faction)))].filter((f) => served.has(f));
}

/**
 * The fallback without a key: match the idea's words against each group's values and dislikes. Keywords cannot tell
 * "raise taxes" from "lower taxes", so a group counts only when two or more words match; one shared word is not enough.
 */
export function rulesShape(req: ShapeRequest, by: string): Shaped {
  const words = req.idea.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const count = (v: string) => words.filter((w) => v.toLowerCase().includes(w)).length;
  // The entry in a list that the idea's words match best, and how well.
  const best = (list: string[]) => list.map((v) => ({ v, n: count(v) })).sort((x, y) => y.n - x.n)[0] ?? { v: "", n: 0 };
  const scored = req.factions.map((f) => ({ f, up: best(f.values), down: best(f.dislikes) }));
  const serves = scored.filter((x) => x.up.n >= 2).sort((a, b) => b.up.n - a.up.n).slice(0, 2).map((x) => ({ faction: x.f.id, why: `It speaks to something they are likely to value: ${x.up.v.toLowerCase()}.` }));
  const offends = scored.filter((x) => x.down.n >= 2 && !serves.some((s) => s.faction === x.f.id)).sort((a, b) => b.down.n - a.down.n).slice(0, 1).map((x) => ({ faction: x.f.id, why: `It touches something they are likely to dislike: ${x.down.v.toLowerCase()}.` }));
  const t = req.idea.trim().replace(/\.$/, "");
  return { text: `${t[0].toUpperCase()}${t.slice(1)}.`, serves, offends, tradeoff: "A rough draft matched on keywords. With an API key the plank is shaped and judged by an agent.", mode: "rules", by };
}
