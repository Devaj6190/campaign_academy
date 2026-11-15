import { DEFAULT_ALLOCATION, type Allocation } from "../cases/allocation";
import { CASES } from "../cases/index";
import type { Work } from "../cases/store";
import { realPath } from "../cases/types";
import { runCampaign, TYPICAL_STAFF, type StaffPlan } from "./headless";

// What "the engine is accurate enough" means (#35), as checks. Run with `npm run check:engine`.
// 1. The real campaign's choices, with the typical staff plan and the rivals acting, finish within TOLERANCE points
//    of the certified result for every candidate, and the real winner wins outright, as in 2013.
// 2. The same inputs always give the same world, and changing an input changes it.
// 3. Every decision has an option that costs nothing, so a campaign out of money can still go on.
// 4. The weakest choice at every decision, with no staff, misses the runoff: choices can lose as well as win.
// 5. The weekly spending plan moves the world (#33): Bronx doors move Bronx districts, and donor dinners cool liberals.

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

    // 3. The campaign can always go on: every decision has an option that costs nothing. Options the campaign cannot
    //    afford are greyed out, so a decision with none free stops a campaign that has spent its money for good.
    for (const x of c.decisions) if (!x.options.some((o) => (o.effect.budget ?? 0) >= 0)) problems.push(`${c.id}: every option at "${x.id}" costs money; a campaign with less than the cheapest cannot decide`);

    // 4. Choices matter both ways: the weakest option at every decision, with no staff, misses the runoff. The record
    //    alone must not carry the candidate through whatever the student does.
    const dB = (o: (typeof c.decisions)[number]["options"][number]) => o.effect.poll?.[c.follow] ?? 0;
    const worst = Object.fromEntries(c.decisions.map((x) => [x.id, [...x.options].sort((a, b) => dB(a) - dB(b))[0].id]));
    const w = runCampaign({ picks: worst });
    const place = w.top.findIndex((t) => t.id === c.follow);
    report.push(`${c.id} weakest choices, no staff: ${c.follow} ${w.world.poll[c.follow].toFixed(1)}%, place ${place + 1}`);
    if (place <= 1) problems.push(`${c.id}: the weakest choice at every decision still makes the top two (${c.follow} ${w.world.poll[c.follow].toFixed(1)}%); no play can lose`);

    // 5. The weekly plan (the top bar's sliders) reaches the world through the engine, not just the ledger.
    const plan = (patch: Partial<Allocation>) => runCampaign({ allocation: { ...DEFAULT_ALLOCATION, ...patch } });
    const total = (r: ReturnType<typeof runCampaign>, f: (x: Work) => number) => r.work.reduce((a, x) => a + f(x), 0);
    const bronx = (x: Work) => Object.entries(x.districts).reduce((a, [cd, v]) => a + (Math.floor(+cd / 100) === 2 ? v : 0), 0);
    const base = plan({}), doors = plan({ doors: { n: 4, to: "2" } }), dinners = plan({ dinners: { n: 2 } });
    report.push(`${c.id} weekly plan: default ${base.world.poll[c.follow].toFixed(1)}%, Bronx doors ${doors.world.poll[c.follow].toFixed(1)}%, two donor dinners ${dinners.world.poll[c.follow].toFixed(1)}%`);
    if (total(doors, bronx) <= total(base, bronx)) problems.push(`${c.id}: four Bronx canvasses a week did not move the Bronx`);
    if (total(dinners, (x) => x.factions.liberal ?? 0) >= total(base, (x) => x.factions.liberal ?? 0)) problems.push(`${c.id}: donor dinners did not cool liberal voters`);
  }
  return { problems, report };
}
