import raw from "./nyc.json";
import type { Demo } from "./geo";

// Where voter groups live, from the census. Only the groups the census can place are covered: the three race and
// ethnicity groups the case simulates. Every other voter group has no district figure and counts the same everywhere.

type RawD = { cd: number; demo: Demo | null };
const DEMO = new Map((raw as unknown as { districts: RawD[] }).districts.filter((d) => d.demo).map((d) => [d.cd, d.demo!]));

/** Voter group id (lib/cases/mayor2013-factions) to the census share that places it. */
const CENSUS: Record<string, keyof Demo["race"]> = { white: "white", black: "black", latino: "hispanic" };

const AVG: Record<string, number> = Object.fromEntries(
  Object.entries(CENSUS).map(([id, key]) => {
    const ds = [...DEMO.values()];
    return [id, ds.reduce((a, d) => a + d.race[key], 0) / ds.length];
  }),
);

/**
 * How strongly an action aimed at `group` lands in district `cd`: 0.6 where the group is scarce, 1.0 at the city
 * average, up to 1.4 where it is concentrated. 1 for groups the census cannot place.
 */
export function presence(cd: number | undefined, group: string | undefined) {
  if (!cd || !group || !CENSUS[group]) return 1;
  const share = DEMO.get(cd)?.race[CENSUS[group]];
  if (share == null || !AVG[group]) return 1;
  return Math.max(0.6, Math.min(1.4, 0.6 + 0.4 * (share / AVG[group])));
}
