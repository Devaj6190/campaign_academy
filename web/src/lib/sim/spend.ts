import { ACTIONS } from "../engine/catalog";
import { resolve, type Effect } from "../engine/resolve";
import { FATIGUE, jobsFor, LINES, spill, type Allocation, type Job, type Line } from "../cases/allocation";
import { currentCase, useCase, worldNow } from "../cases/store";
import { profileFor } from "../staff/roster";
import { apply, feed, SCALE, snapshot } from "../staff/run";
import { bumpMorale } from "../staff/store";
import { hash } from "../util";

// Spends jobs on the case's work layer: the weekly plan from the top bar's sliders (#33), and the headless runner's
// staff plan. One path for both, so the engine check measures what a student gets.

const DAY = 86_400_000;
/** The seed the browser spends the plan with: the headless runner's default, so the two give the same work. */
export const SEED = 1;

export const campaignDay = (iso: string) => Math.round((Date.parse(iso) - Date.parse(currentCase(useCase.getState().caseId).briefingDate)) / DAY) + 1;

/**
 * What plan work does beyond a staff job, both simulated: a donor pool asked in the last four weeks gives less
 * (FATIGUE per ask, compounding), and a voter group's gain or loss spills into the groups the 2013 polls link to it.
 */
function shape(e: Effect, today: string) {
  if (e.raised) {
    const asked = useCase.getState().work.filter((x) => x.plan && x.label === e.label && Date.parse(today) - Date.parse(x.date) < 28 * DAY).length;
    if (asked) {
      const was = e.raised;
      e.raised = Math.round((was * (1 - FATIGUE) ** asked) / 50) * 50;
      e.summary = `${e.summary.replace(`$${Math.round(was).toLocaleString("en-US")}`, `$${e.raised.toLocaleString("en-US")}`)} Donors asked recently gave less.`;
    }
  }
  for (const [g, d] of Object.entries(spill(e.factions))) e.factions[g] = Math.round(((e.factions[g] ?? 0) + d) * 100) / 100;
}

/** Do one day's jobs in order, each only if the money is there. Deterministic for a given day and seed. */
export function runJobs(jobs: Job[], day: number, seed: number): { done: Effect[]; unpaid: number } {
  const today = useCase.getState().date;
  const done: Effect[] = [];
  jobs.forEach((j, i) => {
    const e = resolve(snapshot(), j.by, j.action, { district: j.district, faction: j.faction }, { quality: 1, seed: Math.floor(hash(seed, day * 31 + i) * 1e6), load: j.load ?? 1 });
    if (e.cost > worldNow().w.budget) return;
    if (j.line) shape(e, today);
    apply(e, Infinity, j.line ? { plan: j.line } : undefined);
    done.push(e);
  });
  return { done, unpaid: jobs.length - done.length };
}

/** The clock's weekly step: on a plan day the plan is spent, the War room feed says what it did, and posts left with nothing to do lose heart. */
export function spendPlan() {
  const s = useCase.getState();
  const day = campaignDay(s.date);
  const jobs = jobsFor(s.allocation, day);
  if (!jobs.length) return;
  const { done, unpaid } = runJobs(jobs, day, SEED);
  const spent = done.reduce((a, e) => a + e.cost, 0), raised = done.reduce((a, e) => a + e.raised, 0);
  const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  feed("you", `The weekly plan ran: ${done.length} jobs, ${usd(spent)} spent${raised ? `, ${usd(raised)} raised` : ""}.${unpaid ? ` ${unpaid} could not be paid for.` : ""}`, unpaid ? "neg" : undefined);
  // ponytail: browser only. The headless runner leaves morale alone, so two runs with the same inputs stay identical.
  for (const by of ["fd", "fin", "com"]) if (!LINES.some((l) => l.by === by && s.allocation[l.id].n)) bumpMorale(by, -2);
}

/** About what one of a line's actions costs and raises, at today's rates. For the panel and the runway. */
export function rate(l: Line): { cost: number; raised: number } {
  const a = ACTIONS[l.action], p = profileFor(l.by, "");
  return { cost: Math.round((a.cost * SCALE.money * p.cost) / 50) * 50, raised: a.raise ? Math.round((((a.raise[0] + a.raise[1]) / 2) * SCALE.money * p.effect * (p.special?.[l.action] ?? 1)) / 50) * 50 : 0 };
}

/**
 * What the plan costs a week net of what it raises, and how long the money lasts at that rate. Raised money only
 * pays for work (the cap), so a plan that raises more than it spends burns nothing and wastes the rest.
 */
export function runway(a: Allocation) {
  const { c, w } = worldNow();
  const week = LINES.reduce((t, l) => { const r = rate(l), n = a[l.id]?.n ?? 0; return { cost: t.cost + r.cost * n, raised: t.raised + r.raised * n }; }, { cost: 0, raised: 0 });
  const burn = Math.max(0, week.cost - week.raised);
  const weeksLeft = Math.max(0, (Date.parse(c.electionDate) - Date.parse(useCase.getState().date)) / (7 * DAY));
  const close = -(c.close.shift.budget ?? 0);
  const left = Math.max(0, w.budget);
  const runsOut = burn > 0 && left / burn < weeksLeft ? new Date(Date.parse(useCase.getState().date) + (left / burn) * 7 * DAY).toISOString().slice(0, 10) : null;
  return { ...week, burn, runsOut, eatsClose: close > 0 && left - burn * weeksLeft < close, close };
}
