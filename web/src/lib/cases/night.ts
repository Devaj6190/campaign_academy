import { create } from "zustand";
import { hash } from "../util";
import adResult from "./mayor2013-ad.json";
import { currentCase, useCase, worldAt } from "./store";

// Election night for the student's own campaign, on real geography. The Board of Elections certified the 2013 primary
// in 65 Assembly Districts and publishes nothing finer, so those districts are the map. Each one starts from its
// certified result, and every candidate's share there moves by the gap between that candidate's citywide finish in
// the student's simulation and the real one (a uniform swing). Where each candidate is strong is therefore real;
// only the size of the swing is simulated.
// ponytail: the result file belongs to the one case that has one (see REAL_RESULT in views/MapView).

export type NightRow = { ad: number; total: number; votes: Record<string, number>; winner: string; share: number };

const REAL = (adResult as unknown as { features: { properties: Record<string, number> }[] }).features.map((f) => f.properties);

/** How many districts have reported. The Map view counts them in once the campaign reaches election day. */
export const useNight = create<{ shown: number }>(() => ({ shown: 0 }));
// A restarted case has not held its election.
useCase.subscribe((s) => { if (s.at === 0 && useNight.getState().shown) useNight.setState({ shown: 0 }); });

/** Every district's simulated result, the order they report in, and the candidates counted. */
export function night(): { rows: NightRow[]; order: number[]; ids: string[] } {
  const { caseId, picks } = useCase.getState();
  const c = currentCase(caseId);
  const final = worldAt(c, picks, c.decisions.length).poll;
  const ids = c.candidates.map((x) => x.id).filter((id) => id in REAL[0]);
  const all = REAL.reduce((a, r) => a + r.total, 0);
  const swing = Object.fromEntries(ids.map((id) => [id, (final[id] ?? 0) - (REAL.reduce((a, r) => a + r[id], 0) / all) * 100]));
  const rows = REAL.map((r) => {
    const votes = Object.fromEntries(ids.map((id) => [id, Math.round((r.total * Math.max(0, (r[id] / r.total) * 100 + swing[id])) / 100)]));
    return { ad: r.ad, total: r.total, votes, winner: ids.reduce((a, b) => (votes[b] > votes[a] ? b : a)), share: (votes[c.follow] / r.total) * 100 };
  });
  // No real reporting order is published; a fixed shuffle stands in for it.
  const order = [...rows].sort((a, b) => hash(a.ad, 7) - hash(b.ad, 7)).map((r) => r.ad);
  return { rows, order, ids };
}

/** Votes counted so far for each candidate, and all ballots counted, from the districts that have reported. */
export function tally(n: ReturnType<typeof night>, shown: number) {
  const reported = new Set(n.order.slice(0, shown));
  const votes: Record<string, number> = Object.fromEntries(n.ids.map((id) => [id, 0]));
  let total = 0;
  for (const r of n.rows) if (reported.has(r.ad)) { total += r.total; for (const id of n.ids) votes[id] += r.votes[id]; }
  return { votes, total };
}
