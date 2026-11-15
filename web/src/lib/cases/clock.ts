import { currentCase, useCase } from "./store";
import type { Case } from "./types";

// The campaign clock. It runs on the case's real calendar, one day at a time, between decisions. It never runs past
// a decision: on the decision's date it stops and the decision card opens, and it starts again only when the student
// has chosen and says so. Mornings with news pause it for the paper (the caller announces it). When a stretch gets
// under way, the rivals plan their moves for it (lib/cases/rivals).

/** One day of the campaign at 1x, in milliseconds. */
export const DAY_MS = 2000;
export const SPEEDS = [1, 2, 5];

const nextDay = (iso: string) => new Date(Date.parse(iso) + 86_400_000).toISOString().slice(0, 10);

/** The date of a step: the briefing, each decision, then the election. */
export const dateOf = (c: Case, step: number) => (step <= 0 ? c.briefingDate : (c.decisions[step - 1]?.date ?? c.electionDate));

/** A morning with news: the day after a press item, a finance filing, or a rival's move. More dated entries in the case mean more of these. */
export const isEventDay = (c: Case, date: string) =>
  [...c.press, ...c.finance].some((x) => nextDay(x.date) === date) ||
  useCase.getState().work.some((x) => x.by !== c.follow && c.candidates.some((r) => r.id === x.by) && nextDay(x.date) === date);

/** The decision the campaign has reached and not yet made, if any. */
export function waiting() {
  const s = useCase.getState(), c = currentCase(s.caseId);
  const d = c.decisions[s.at - 1];
  return d && !s.picks[d.id] ? d : null;
}

export const finished = () => useCase.getState().at > currentCase(useCase.getState().caseId).decisions.length;

function arrive(): "arrived" {
  const s = useCase.getState(), c = currentCase(s.caseId);
  const at = Math.min(s.at + 1, c.decisions.length + 1);
  useCase.setState({ at, step: at, date: dateOf(c, at), running: false, card: at <= c.decisions.length });
  return "arrived";
}

/** One day passes. Says when the campaign reached its next step, or woke to news. */
export function tick(): "arrived" | "event" | undefined {
  const s = useCase.getState(), c = currentCase(s.caseId);
  if (waiting() || finished()) return;
  // The stretch is under way, however it started (run or skip): the rivals plan for it, once per step.
  void import("./rivals").then((m) => m.planRivals());
  const date = nextDay(s.date);
  // Whatever is on the candidate's calendar for the new day happens as it starts.
  const bookings = () => void import("../staff/run").then((m) => m.runBookings());
  if (date >= dateOf(c, s.at + 1)) { const r = arrive(); bookings(); return r; }
  useCase.setState({ date });
  bookings();
  return isEventDay(c, date) ? "event" : undefined;
}

/** Start or resume the clock. Does nothing while a decision is waiting. A step on today's date arrives at once. */
export function run(): "arrived" | undefined {
  const s = useCase.getState(), c = currentCase(s.caseId);
  if (waiting() || finished()) return;
  if (dateOf(c, s.at + 1) <= s.date) return arrive();
  useCase.setState({ running: true, card: false });
}

export const pause = () => useCase.setState({ running: false });

/** Jump to the next morning with news, or to the next step, whichever comes first. */
export function skip(): "arrived" | "event" | undefined {
  for (let i = 0; i < 400; i++) {
    const r = tick();
    if (r || waiting() || finished()) return r;
  }
}
