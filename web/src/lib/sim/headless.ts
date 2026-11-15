import { rulePlan } from "../engine/rivalAgent";
import type { ActionId } from "../engine/catalog";
import { resolve } from "../engine/resolve";
import { dateOf } from "../cases/clock";
import { inRace, land, requestFor, studentDid } from "../cases/rivals";
import { currentCase, useCase, worldNow, type Work } from "../cases/store";
import { realPath, type Case, type World } from "../cases/types";
import { apply, snapshot } from "../staff/run";
import { PLACES } from "../staff/world";
import { hash } from "../util";

// A whole campaign without the browser: briefing to election night, through the same stores, staff actions and
// rival rules the game uses. For the engine checks (scripts/check-engine.ts), the refit, and the evals (#28).
//
// Deterministic: the same picks, staff plan and seed give the same world. The rivals run in rules mode (the live
// agents are not deterministic), and they plan once per step, right after the student decides, as in the game.

/** One staff job on one day: who does what, where. */
export type Job = { by: string; action: ActionId; district?: number; faction?: string };
/** The staff's jobs for a given campaign day (1 is the briefing). */
export type StaffPlan = (day: number, date: string) => Job[];
export type RunOptions = { picks?: Record<string, string>; staff?: StaffPlan; rivals?: boolean; seed?: number };
export type RunResult = { world: World; work: Work[]; runoff: boolean; top: { id: string; share: number }[] };

const DAY = 86_400_000;
const nextDay = (iso: string) => new Date(Date.parse(iso) + DAY).toISOString().slice(0, 10);
const dayOf = (c: Case, iso: string) => Math.round((Date.parse(iso) - Date.parse(c.briefingDate)) / DAY) + 1;

const BROOKLYN = PLACES.filter((p) => Math.floor(p.cd / 100) === 3).map((p) => p.cd);
const PITCH = ["liberal", "black", "income-low", "brooklyn"];

/**
 * The typical staff plan the real path is checked with: once a week the Field Director canvasses a Brooklyn district
 * (rotating), the Finance Director runs call time, and Communications pitches the press to one of the campaign's
 * core groups (rotating). A fixed routine, not a record of what the real staff did: the record does not say.
 */
export const TYPICAL_STAFF: StaffPlan = (day) => {
  if (day % 7 !== 0) return [];
  const week = day / 7;
  return [
    { by: "fd", action: "canvass", district: BROOKLYN[week % BROOKLYN.length] },
    { by: "fin", action: "call_time" },
    { by: "com", action: "press_pitch", faction: PITCH[week % PITCH.length] },
  ];
};

/** Play one campaign. Leaves the case store holding the finished campaign. */
export function runCampaign(opts: RunOptions = {}): RunResult {
  const s0 = useCase.getState();
  const c = currentCase(s0.caseId);
  const picks = opts.picks ?? realPath(c);
  const seed = opts.seed ?? 1;
  s0.restart();

  const work = (date: string) => {
    if (!opts.staff) return;
    opts.staff(dayOf(c, date), date).forEach((j, i) => {
      const e = resolve(snapshot(), j.by, j.action, { district: j.district, faction: j.faction }, { quality: 1, seed: Math.floor(hash(seed, dayOf(c, date) * 31 + i) * 1e6), load: 1 });
      if (e.cost <= worldNow().w.budget) apply(e);
    });
  };

  for (let at = 1; at <= c.decisions.length + 1; at++) {
    // The days up to this step pass, with the staff at work.
    for (let date = useCase.getState().date; date < dateOf(c, at); date = nextDay(date)) {
      useCase.setState({ date });
      work(date);
    }
    useCase.setState({ at, step: at, date: dateOf(c, at) });
    const d = c.decisions[at - 1];
    if (!d) break;
    const option = picks[d.id] ?? d.options[0].id;
    useCase.getState().decide(d.id, { option });
    // The rivals plan for the stretch that starts now.
    if (opts.rivals !== false) for (const x of inRace()) for (const m of rulePlan(requestFor(x, studentDid())).moves) land(x, m);
  }

  const world = worldNow().w;
  const top = Object.entries(world.poll).map(([id, share]) => ({ id, share })).sort((a, b) => b.share - a.share);
  return { world, work: useCase.getState().work, runoff: (top[0]?.share ?? 0) < c.threshold, top };
}
