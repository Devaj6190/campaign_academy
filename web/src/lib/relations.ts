// How voter groups move together. When Cole wins (or loses) one group, the groups that share its interests
// warm a little and the groups that oppose them cool a little. Hand-written from each group's values and
// dislikes (data.ts), symmetric, applied once per change: no chain reactions.

type Link = [a: string, b: string, weight: number, why: string];

const LINKS: Link[] = [
  ["renters", "homeowners", -0.25, "Density and rent rules split tenants and owners"],
  ["renters", "donors", -0.35, "Real-estate money fights rent regulation"],
  ["renters", "immigrants", 0.2, "Many immigrant families rent and want stable housing"],
  ["renters", "students", 0.2, "Students rent and want affordable housing"],
  ["renters", "activists", 0.15, "Both push for bold housing action"],
  ["homeowners", "donors", 0.2, "Both care about property values and predictability"],
  ["homeowners", "activists", -0.3, "Upzoning and protest politics worry owners"],
  ["homeowners", "seniors", 0.2, "Many older New Yorkers own their homes"],
  ["donors", "activists", -0.4, "Activists see big money as the problem"],
  ["donors", "unions", -0.15, "Contracts and taxes pull them apart"],
  ["donors", "smallbiz", 0.1, "Both want less red tape"],
  ["unions", "transit", 0.2, "Transit workers are union members"],
  ["unions", "smallbiz", -0.1, "Wages and staffing costs put them at odds"],
  ["unions", "seniors", 0.1, "Retirees and pensions tie them together"],
  ["transit", "students", 0.2, "Students ride the bus and subway"],
  ["transit", "homeowners", -0.1, "Bus lanes take parking"],
  ["smallbiz", "immigrants", 0.2, "Many small businesses are immigrant-owned"],
  ["smallbiz", "transit", -0.1, "Street changes without consultation hurt shops"],
  ["seniors", "students", -0.1, "Different priorities, and seniors distrust sudden change"],
  ["seniors", "activists", -0.2, "Seniors want stability and safety; activists want change"],
  ["students", "activists", 0.3, "Young voters organise together"],
  ["immigrants", "activists", 0.1, "Overlap on language access and enforcement"],
];

export type Rel = { id: string; weight: number; why: string };

const MAP: Record<string, Rel[]> = {};
for (const [a, b, weight, why] of LINKS) {
  (MAP[a] ||= []).push({ id: b, weight, why });
  (MAP[b] ||= []).push({ id: a, weight, why });
}

/** Every link for one group, strongest first. */
export const relationsOf = (id: string) => [...(MAP[id] ?? [])].sort((x, y) => Math.abs(y.weight) - Math.abs(x.weight));

/** The strongest links, for drawing on the factions canvas. */
export const strongest = (n: number) => [...LINKS].sort((x, y) => Math.abs(y[2]) - Math.abs(x[2])).slice(0, n).map(([a, b, weight, why]) => ({ a, b, weight, why }));

const CAP = 0.4;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Knock-on effects of direct changes in faction feeling. Each one is capped at 40% of the change that
 * caused it and is computed only from direct changes, so nothing cascades.
 */
export function knockOns(direct: Record<string, number>): Record<string, { delta: number; from: string }> {
  const out: Record<string, { delta: number; from: string; size: number }> = {};
  for (const [src, d] of Object.entries(direct)) {
    for (const rel of MAP[src] ?? []) {
      if (rel.id in direct) continue; // the action already moved them directly
      const delta = Math.sign(d * rel.weight) * Math.min(Math.abs(d * rel.weight), Math.abs(d) * CAP);
      const cur = out[rel.id];
      // Several sources can move the same group; keep the sum and credit the biggest mover.
      if (cur) {
        const sum = cur.delta + delta;
        out[rel.id] = { delta: sum, from: Math.abs(delta) > cur.size ? src : cur.from, size: Math.max(cur.size, Math.abs(delta)) };
      } else out[rel.id] = { delta, from: src, size: Math.abs(delta) };
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { delta: r1(v.delta), from: v.from }]).filter(([, v]) => (v as { delta: number }).delta !== 0));
}
