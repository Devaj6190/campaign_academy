import { numbersIn } from "../paper/edition";
import { mayor2013 } from "./mayor2013";
import { missingSources, realPath, simulate, type Case } from "./types";

export const CASES: Case[] = [mayor2013];

/**
 * The check every case has to pass in the browser: nothing is cited that is not listed, and the real campaign's
 * choices do not overspend. Whether the simulation is fitted to history is checked by `npm run check:engine`
 * (lib/sim/check.ts): the record is fitted together with the rivals and a typical staff plan, so the record alone
 * no longer adds up to the result.
 */
export function checkCase(c: Case): string[] {
  const problems = missingSources(c).map((id) => `cites a source that is not listed: ${id}`);
  if (simulate(c, realPath(c)).budget < 0) problems.push("the real campaign's choices overspend the simulated budget");
  // A short version may not carry a number its full sentence does not.
  const walk = (x: unknown): void => {
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    if (typeof o.short === "string") {
      const full = numbersIn(String(o.text ?? o.says ?? o.summary ?? ""));
      const extra = numbersIn(o.short).filter((n) => !full.includes(n));
      if (extra.length) problems.push(`a short version has a number its sentence does not (${extra.join(", ")}): ${o.short}`);
    }
    Object.values(o).forEach(walk);
  };
  walk(c);
  return problems;
}

if (process.env.NODE_ENV !== "production") for (const c of CASES) for (const p of checkCase(c)) console.error(`[case ${c.id}] ${p}`);
