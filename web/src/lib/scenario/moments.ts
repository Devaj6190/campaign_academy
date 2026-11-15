"use client";

import { effectOf as caseEffect, type Decision, type Shift } from "../cases/types";
import { districtBy } from "../geo";
import { effectOf } from "../engine/resolve";
import { pollOf, supportPerPoint } from "../engine/poll";
import { useGame } from "../store";
import { useStaff } from "../staff/store";
import { ACTIVE, ME, RIVAL_IDS } from "./index";
import { CASE } from "./case";

// The real race's moments, played inside the simulation. Each of the case's decisions arrives on the game day
// matching its real date. That morning, what really happened in the run-up (the case's `since`: a rival entering,
// a scandal, a court ruling) lands first, with its sourced notes. Then the student chooses one of the real
// options, or handles it their own way through the war room. Either way the engine carries on from there.

export type MomentState = { status: "pending" | "decided" | "own" | "missed"; option?: string; why?: string; day: number };

const dayOf = (iso: string) => {
  const a = Date.parse(CASE.briefingDate), b = Date.parse(CASE.electionDate);
  return Math.max(1, Math.min(30, Math.round(1 + (29 * (Date.parse(iso) - a)) / (b - a))));
};

/** The decisions, each with the game day it arrives. Empty in a fictional race. */
export const MOMENTS: (Decision & { day: number })[] = ACTIVE.kind === "real" ? CASE.decisions.map((d) => ({ ...d, day: dayOf(d.date) })) : [];
export const momentOn = (day: number) => MOMENTS.filter((m) => m.day === day);
export const momentById = (id: string) => MOMENTS.find((m) => m.id === id);

/** The case's choices so far, as picks, for synergies ("this works better if you ran on the break"). */
const picks = () => Object.fromEntries(Object.entries(useGame.getState().moments).filter(([, v]) => v.option).map(([k, v]) => [k, v.option!]));

/**
 * Turn one of the case's shifts into the engine's terms:
 * - the student's poll points become support in every district (sized so one point is one point citywide);
 * - group points become support where that group lives (census share), and union points warm the union members;
 * - a rival's poll points scale that rival's strength everywhere;
 * - money is scaled to the game (1:10) and comes out of cash.
 */
export function applyShift(s: Shift, label: string, summary: string, source: "event" | "moment") {
  const g = useGame.getState();
  const k = supportPerPoint(g.day);
  const sent: Record<number, number> = {};
  const mine = s.poll?.[ME.id] ?? 0;
  for (const cd of Object.keys(g.sent).map(Number)) {
    const race = districtBy(cd)?.demo?.race;
    let d = mine;
    for (const grp of CASE.groups) if (grp.census && race) d += ((s.groups?.[grp.id] ?? 0) * race[grp.census]) / 100;
    if (d) sent[cd] = Math.round(d * k * 10) / 10;
  }
  const unions = s.groups?.union ?? 0;
  const money = Math.round((s.budget ?? 0) * ACTIVE.finance.scale);
  const e = effectOf({ by: source, action: "plank", label, summary, sent, factions: unions ? { unions: unions * 0.8 } : {}, cost: Math.max(0, -money), raised: Math.max(0, money), paidFrom: "cash" });
  g.applyEffect(e, source);

  // Rivals: scale their strength by how far their share should move.
  const rivals = { ...useGame.getState().rivals };
  const truth = useGame.getState().truth;
  for (const id of RIVAL_IDS) {
    const delta = s.poll?.[id];
    if (!delta) continue;
    const cur = Math.max(1, truth[id] ?? 0);
    // A rival who entered today: the case's number is their level on entry, not a change.
    const def = ACTIVE.rivals.find((r) => r.id === id);
    const target = def?.joins === g.day ? Math.max(1, delta) : cur + delta;
    const factor = Math.max(0.15, Math.min(4, target / cur));
    const strength: Record<number, number> = {};
    for (const cd of Object.keys(g.sent).map(Number)) strength[cd] = Math.max(-90, (1 + (rivals[id].strength[cd] ?? 0) / 100) * factor * 100 - 100);
    rivals[id] = { ...rivals[id], strength };
  }
  const now = useGame.getState();
  useGame.setState({ rivals, truth: pollOf({ sent: now.sent, day: now.day, rivals }) });
}

/** Morning of a day: the real run-up lands, and that day's moment opens. */
export function morningMoments(day: number) {
  const g = useGame.getState();
  // Yesterday's unanswered moments lapse.
  for (const [id, m] of Object.entries(g.moments)) if (m.status === "pending" && m.day < day) setMoment(id, { ...m, status: "missed" });
  if (ACTIVE.kind === "real" && day === 29 && !g.moments.__close) {
    // Only the rivals' part: the student's own closing push is theirs to make.
    const { [ME.id]: _own, ...rivals } = CASE.close.shift.poll ?? {};
    void _own;
    applyShift({ poll: rivals }, "The final stretch", CASE.close.notes.map((n) => n.text).join(" "), "event");
    setMoment("__close", { status: "decided", day });
  }
  for (const d of momentOn(day)) {
    if (g.moments[d.id]) continue;
    if (d.since) applyShift(d.since.shift, "What happened", d.since.notes.map((n) => n.text).join(" "), "event");
    setMoment(d.id, { status: "pending", day });
    useGame.setState({ overlay: "moment", momentId: d.id });
  }
}

const setMoment = (id: string, m: MomentState) => useGame.setState((s) => ({ moments: { ...s.moments, [id]: m } }));

/** The student picks one of the real options. Returns a reason it can't, or null. */
export function decide(id: string, optionId: string, why: string): string | null {
  const d = momentById(id);
  const o = d?.options.find((x) => x.id === optionId);
  if (!d || !o) return "Unknown option.";
  const shifts = caseEffect(CASE, d, optionId, picks());
  const cost = -shifts.reduce((a, s) => a + (s.budget ?? 0), 0) * ACTIVE.finance.scale;
  if (cost > useGame.getState().cash) return "Not enough cash for this option.";
  for (const s of shifts) applyShift(s, d.title, `${d.title}: ${o.label}.`, "moment");
  setMoment(id, { status: "decided", option: optionId, why, day: useGame.getState().day });
  return null;
}

/** The student handles it their own way: the campaign manager gets the situation as an order to shape. */
export function handleMyself(id: string) {
  const d = momentById(id);
  if (!d) return;
  setMoment(id, { status: "own", day: useGame.getState().day });
  const order = `${d.title} ${d.situation.map((c) => c.text).join(" ")} Here is what I want to do:`;
  useStaff.setState((s) => ({ draft: { ...s.draft, cm: order } }));
  useGame.setState({ overlay: null, view: "war", person: "cm" });
}
