"use client";

import { create } from "zustand";
import type { Effect } from "../engine/resolve";
import type { PlanRequest, PlanResult } from "../engine/rivalAgent";
import { SCALE, snapshot } from "../staff/run";
import { FACTIONS_2013 } from "./mayor2013-factions";
import { platformAt } from "./platform";
import { currentCase, popShare, useCase, worldNow } from "./store";
import type { Candidate } from "./types";

// The other candidates as campaigns that act. The race stays grounded in the record: every rival starts from the
// case's real standing, and the case's real events still land on their dates. Between those, each rival who is in
// the race plans a few moves after every decision the student makes, reacting to what the student's campaign did.
// So the simulation can leave the history when the student does; it does not replay it.
//
// What a rival's move does is simulated, with the same rules that score the student's staff: the rival gains the
// citywide points its move is worth, and the student loses CONTEST of them where the move landed. A rival's own
// moves fade as their total nears RIVAL_CAP points, so the record stays the main force on the race.
// ponytail: one round per decision. Plan weekly from the clock if rivals should feel busier.

export const RIVAL_CAP = 4;
const CONTEST = 0.5;
/** What each rival has to spend on these moves per round, in case dollars. Simulated: the case has no rival budgets by date. */
const BUDGET = 150_000;

export const useRivals = create<{ planned: Record<number, boolean>; memory: Record<string, string[]>; mode: "live" | "rules" | null }>(() => ({ planned: {}, memory: {}, mode: null }));

// A restarted case starts the rivals over too.
useCase.subscribe((s) => { if (s.at === 0 && Object.keys(useRivals.getState().planned).length) useRivals.setState({ planned: {}, memory: {}, mode: null }); });

export const isRival = (by: string) => { const c = currentCase(useCase.getState().caseId); return by !== c.follow && c.candidates.some((x) => x.id === by); };

/** One rival move lands on the case: the rival's gain citywide, and the student's loss where it happened. */
export function land(x: Candidate, e: Effect) {
  const { c } = worldNow();
  const districts: Record<number, number> = {}, groups: Record<string, number> = {}, factions: Record<string, number> = {};
  let gain = 0;
  for (const [cd, d] of Object.entries(e.sent)) { gain += d * popShare(+cd); districts[+cd] = -d * CONTEST; }
  for (const [id, d] of Object.entries(e.factions)) {
    const f = FACTIONS_2013.find((k) => k.id === id);
    if (!f) continue;
    gain += (d * f.share) / 100;
    if (f.tracks) groups[f.tracks] = (groups[f.tracks] ?? 0) - d * CONTEST;
    else factions[id] = (factions[id] ?? 0) - d * CONTEST;
  }
  useCase.getState().addWork({ by: x.id, label: e.label, note: `${x.name}: ${e.summary[0].toLowerCase()}${e.summary.slice(1)}.`, cost: 0, raised: 0, poll: { [x.id]: gain, [c.follow]: -gain * CONTEST }, groups, factions, districts });
}

/** What a rival is told before it plans: who it is, the live case, its budget and memory, and what the student did. */
export function requestFor(x: Candidate, student: string[]): PlanRequest {
  const s = useCase.getState(), c = currentCase(s.caseId);
  const gained = s.work.reduce((a, k) => a + (k.by === x.id ? (k.poll[x.id] ?? 0) : 0), 0);
  const room = Math.max(0, 1 - gained / RIVAL_CAP);
  return {
    who: x.id,
    name: x.name,
    standing: x.standing,
    platform: platformAt(c, s.at, s.picks, x.id).map((p) => p.text),
    snapshot: { ...snapshot(), scale: { money: SCALE.money, local: SCALE.local * room, group: SCALE.group * room } },
    budget: BUDGET,
    memory: useRivals.getState().memory[x.id] ?? [],
    student,
  };
}

async function plan(x: Candidate, student: string[]) {
  const body = requestFor(x, student);
  let out: PlanResult;
  try {
    const res = await fetch("/api/rivals/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    out = (await res.json()) as PlanResult;
  } catch (err) {
    console.warn(`[rivals] ${x.id} plan failed:`, err);
    return;
  }
  for (const e of out.moves) land(x, e);
  const line = `${useCase.getState().date}: ${out.memo || out.moves.map((m) => m.summary).join(". ")}`;
  useRivals.setState((r) => ({ mode: out.mode, memory: { ...r.memory, [x.id]: [...(r.memory[x.id] ?? []), line].slice(-4) } }));
}

/** Every rival now in the race plans its moves for the stretch that is starting. Once per step; nothing waits on it. */
export function planRivals() {
  const s = useCase.getState();
  if (s.at < 1 || useRivals.getState().planned[s.at]) return;
  useRivals.setState((r) => ({ planned: { ...r.planned, [s.at]: true } }));
  for (const x of inRace()) void plan(x, studentDid());
}

/** The rivals still in the race: every other candidate with support. */
export function inRace(): Candidate[] {
  const { c, w } = worldNow();
  return c.candidates.filter((x) => x.id !== c.follow && (w.poll[x.id] ?? 0) > 0);
}

/** What the student's campaign did since the last step, as the rivals hear it. */
export function studentDid(): string[] {
  const s = useCase.getState(), c = currentCase(s.caseId);
  const d = c.decisions[s.at - 1];
  const chose = d && s.picks[d.id] ? [`Decided "${d.title}": ${d.options.find((o) => o.id === s.picks[d.id].option)?.label ?? ""}`] : [];
  const from = c.decisions[s.at - 2]?.date ?? c.briefingDate;
  const did = s.work.filter((k) => !isRival(k.by) && k.date >= from).map((k) => k.note ?? k.label).slice(-5);
  return [...chose, ...did];
}
