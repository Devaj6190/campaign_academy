import { presence } from "../demographics";
import { DISTRICTS } from "../geo";

// The platform's rules. A plank is permanent. The player can build freely to five, then add one every few
// days. What a plank does is computed here from who it serves and who it costs: the model only names them.

export const FREE_PLANKS = 5;
export const DAYS_BETWEEN = 3;

export type Reach = { faction: string; why: string };
export type Plank = {
  text: string;
  day: number;
  /** Who shaped it: the Policy Director's id, "staff" for a generic draft, or "record" for one on file at the start. */
  by: string;
  serves: Reach[];
  offends: Reach[];
  tradeoff?: string;
};
export type ShapeRequest = {
  idea: string;
  focus?: string;
  factions: { id: string; name: string; values: string[]; dislikes: string[] }[];
  record: string[];
  planks: string[];
  candidate: string;
  framing: string;
  director: { name: string; voice: string } | null;
};
export type Shaped = { text: string; serves: Reach[]; offends: Reach[]; tradeoff: string; mode: "live" | "rules"; by: string };

/** Whether a new plank can go in today, and if not, when. */
export function canAdd(planks: { day: number }[], day: number): { ok: boolean; next?: number } {
  if (planks.length < FREE_PLANKS) return { ok: true };
  const last = Math.max(...planks.map((p) => p.day));
  return day - last >= DAYS_BETWEEN ? { ok: true } : { ok: false, next: last + DAYS_BETWEEN };
}

/**
 * The plank's effect. Served groups warm, offended groups cool (offence costs more than service earns), scaled by
 * how good the draft was (a Policy Director's work lands better than a generic staff draft). Districts move where
 * those groups live, by their real census presence.
 */
export function effectsOf(p: Pick<Plank, "serves" | "offends">, quality: number) {
  const factions: Record<string, number> = {};
  for (const r of p.serves) factions[r.faction] = Math.round((factions[r.faction] ?? 0) + 5 * quality);
  for (const r of p.offends) factions[r.faction] = Math.round((factions[r.faction] ?? 0) - 7);
  const sent: Record<number, number> = {};
  for (const d of DISTRICTS) {
    if (d.park || !d.vote) continue;
    let v = 0;
    for (const r of p.serves) v += 1.4 * quality * (presence(d.cd, r.faction) - 1);
    for (const r of p.offends) v -= 1.6 * (presence(d.cd, r.faction) - 1);
    if (Math.abs(v) >= 0.1) sent[d.cd] = Math.round(v * 10) / 10;
  }
  return { factions, sent };
}

/** Groups the platform both serves and offends: the contradictions a debate opponent will find. */
export function contradictions(planks: Pick<Plank, "serves" | "offends">[]) {
  const served = new Set(planks.flatMap((p) => p.serves.map((r) => r.faction)));
  return [...new Set(planks.flatMap((p) => p.offends.map((r) => r.faction)))].filter((f) => served.has(f));
}

/** The fallback without a key: match the idea's words against each group's values and dislikes. */
export function rulesShape(req: ShapeRequest, by: string): Shaped {
  const words = req.idea.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const hits = (list: string[]) => list.reduce((n, v) => n + words.filter((w) => v.toLowerCase().includes(w) || w.includes(v.toLowerCase().split(" ")[0])).length, 0);
  const scored = req.factions.map((f) => ({ f, up: hits(f.values) + (req.focus === f.id ? 1 : 0), down: hits(f.dislikes) }));
  const serves = scored.filter((x) => x.up > 0).sort((a, b) => b.up - a.up).slice(0, 2).map((x) => ({ faction: x.f.id, why: `It speaks to what they value: ${x.f.values[0].toLowerCase()}.` }));
  const offends = scored.filter((x) => x.down > 0 && !serves.some((s) => s.faction === x.f.id)).sort((a, b) => b.down - a.down).slice(0, 1).map((x) => ({ faction: x.f.id, why: `It touches something they dislike: ${x.f.dislikes[0].toLowerCase()}.` }));
  const t = req.idea.trim().replace(/\.$/, "");
  return { text: `${t[0].toUpperCase()}${t.slice(1)}.`, serves, offends, tradeoff: "A rough draft: hire a Policy Director, or add an API key, for a sharper version.", mode: "rules", by };
}
