import { mayor2013 } from "./mayor2013";
import { missingSources, realPath, simulate, type Case } from "./types";

export const CASES: Case[] = [mayor2013];

/**
 * The check every case has to pass: nothing is cited that is not listed, and the simulation is fitted to history,
 * meaning the real campaign's own choices finish within two points of the certified result.
 */
export function checkCase(c: Case): string[] {
  const problems = missingSources(c).map((id) => `cites a source that is not listed: ${id}`);
  const real = c.result.find((r) => r.candidate === c.follow)?.share ?? 0;
  const sim = simulate(c, realPath(c)).poll[c.follow];
  if (Math.abs(sim - real) > 2) problems.push(`the real campaign's choices simulate to ${sim.toFixed(1)}%, but the certified result was ${real}%`);
  if (simulate(c, realPath(c)).budget < 0) problems.push("the real campaign's choices overspend the simulated budget");
  return problems;
}

if (process.env.NODE_ENV !== "production") for (const c of CASES) for (const p of checkCase(c)) console.error(`[case ${c.id}] ${p}`);
