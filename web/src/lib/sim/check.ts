import { CASES } from "../cases/index";
import { realPath } from "../cases/types";
import { runCampaign, TYPICAL_STAFF, type StaffPlan } from "./headless";

// What "the engine is accurate enough" means (#35), as checks. Run with `npm run check:engine`.
// 1. The real campaign's choices, with the typical staff plan and the rivals acting, finish within TOLERANCE points
//    of the certified result for every candidate, and the real winner wins outright, as in 2013.
// 2. The same inputs always give the same world, and changing an input changes it.

export const TOLERANCE = 2;

const key = (r: ReturnType<typeof runCampaign>) => JSON.stringify({ world: r.world, work: r.work.map(({ date, by, label, poll, groups, factions, districts, cost, raised }) => ({ date, by, label, poll, groups, factions, districts, cost, raised })) });

export function checkEngine(): { problems: string[]; report: string[] } {
  const problems: string[] = [], report: string[] = [];
  for (const c of CASES) {
    const r = runCampaign({ staff: TYPICAL_STAFF });
    for (const x of c.result) {
      const sim = r.world.poll[x.candidate] ?? 0;
      report.push(`${c.id} ${x.candidate.padEnd(10)} simulated ${sim.toFixed(1).padStart(5)}  certified ${x.share.toFixed(2).padStart(6)}  gap ${(sim - x.share >= 0 ? "+" : "") + (sim - x.share).toFixed(2)}`);
      if (Math.abs(sim - x.share) > TOLERANCE) problems.push(`${c.id}: ${x.candidate} simulates to ${sim.toFixed(1)}%, certified ${x.share}% (more than ${TOLERANCE} points off)`);
    }
    const winner = [...c.result].sort((a, b) => b.share - a.share)[0];
    if (r.top[0]?.id !== winner.candidate) problems.push(`${c.id}: ${r.top[0]?.id} wins the simulation; ${winner.candidate} won the election`);
    const realRunoff = winner.share < c.threshold;
    if (r.runoff !== realRunoff) problems.push(`${c.id}: the simulation ${r.runoff ? "goes" : "does not go"} to a runoff; the election ${realRunoff ? "did" : "did not"}`);

    // Same inputs, same world.
    const again = runCampaign({ staff: TYPICAL_STAFF });
    if (key(r) !== key(again)) problems.push(`${c.id}: two runs with the same inputs gave different worlds`);
    // A different input gives a different world: one staff job moved, and one decision changed.
    const moved: StaffPlan = (day, date) => TYPICAL_STAFF(day, date).map((j) => (j.by === "fd" && day === 14 ? { ...j, district: 101 } : j));
    if (key(runCampaign({ staff: moved })) === key(r)) problems.push(`${c.id}: moving one staff job did not change the world`);
    const d = c.decisions.find((x) => x.taken && x.options.length > 1)!;
    const other = d.options.find((o) => o.id !== d.taken)!.id;
    if (key(runCampaign({ staff: TYPICAL_STAFF, picks: { ...realPath(c), [d.id]: other } })) === key(r)) problems.push(`${c.id}: changing decision "${d.id}" did not change the world`);
  }
  return { problems, report };
}
