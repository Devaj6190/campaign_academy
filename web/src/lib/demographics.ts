import raw from "./nyc.json";
import type { Demo } from "./geo";

// Where each voter group lives. Five groups come straight from the census; the other five have no census
// measure, so they use simple borough and income estimates and are labelled Simulated wherever shown.

type RawD = { cd: number; demo: Demo | null };
const DEMO = new Map((raw as unknown as { districts: RawD[] }).districts.filter((d) => d.demo).map((d) => [d.cd, d.demo!]));

export const REAL_GROUPS = new Set(["renters", "homeowners", "seniors", "immigrants", "students"]);

// Borough priors (1 Manhattan, 2 Bronx, 3 Brooklyn, 4 Queens, 5 Staten Island). Simulated.
const TRANSIT = [0, 0.75, 0.6, 0.65, 0.5, 0.2];
const UNIONS = [0, 0.12, 0.2, 0.17, 0.2, 0.22];
const SMALLBIZ = [0, 0.14, 0.1, 0.12, 0.12, 0.1];

/** Share of a district's people in each group, 0-1. Null outside the 59 voting districts. */
export function shares(cd: number): Record<string, number> | null {
  const d = DEMO.get(cd);
  if (!d) return null;
  const b = Math.floor(cd / 100);
  const r = d.renters / 100;
  return {
    renters: r,
    homeowners: 1 - r,
    seniors: d.over65 / 100,
    immigrants: d.otherLang / 100,
    students: d.age20to24 / 100,
    transit: TRANSIT[b],
    unions: UNIONS[b],
    smallbiz: SMALLBIZ[b],
    donors: Math.min(0.2, (d.income / 200000) * 0.15),
    progressives: Math.min(0.25, (d.age20to24 / 100) * r * 3),
  };
}

const AVG: Record<string, number> = (() => {
  const sum: Record<string, number> = {};
  let n = 0;
  for (const cd of DEMO.keys()) {
    const s = shares(cd)!;
    for (const [k, v] of Object.entries(s)) sum[k] = (sum[k] ?? 0) + v;
    n++;
  }
  return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / n]));
})();

/**
 * How strongly an action aimed at `group` lands in district `cd`: 0.6 where the group is scarce,
 * 1.0 at the city average, up to 1.4 where it is concentrated.
 */
export function presence(cd: number | undefined, group: string | undefined) {
  if (!cd || !group) return 1;
  const s = shares(cd)?.[group];
  if (s == null || !AVG[group]) return 1;
  return Math.max(0.6, Math.min(1.4, 0.6 + 0.4 * (s / AVG[group])));
}

/** Groups in a district, most concentrated relative to the city first. */
export function groupsHere(cd: number) {
  const s = shares(cd);
  if (!s) return [];
  return Object.entries(s)
    .map(([id, share]) => ({ id, share, rel: share / (AVG[id] || 1), real: REAL_GROUPS.has(id) }))
    .sort((a, b) => b.rel - a.rel);
}

/** The group a town hall in this district would meet: the one most over-represented here. */
export const largestGroup = (cd: number) => groupsHere(cd)[0]?.id ?? "renters";
