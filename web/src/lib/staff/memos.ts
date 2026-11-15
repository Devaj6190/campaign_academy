"use client";

import { create } from "zustand";
import { currentCase, useCase } from "../cases/store";
import type { Decision } from "../cases/types";
import { useGame } from "../store";
import { assign, memoDecision, rulesMemo, WRITERS, type Memo, type MemoRequest } from "./memo";
import { profileOf } from "../engine/resolve";
import { snapshot } from "./run";
import { useStaff } from "./store";
import { describeWorld } from "./world";

// Writes the staff memos for a case decision in the background, from the campaign as it stands a few days before the
// decision date (LEAD_DAYS), or on arrival if the clock gets there first. Close enough to the date that the memo
// knows this campaign as it is; early enough that the decision never waits on an agent: the card says if they are
// still coming. A restarted case starts them over.

/** How many campaign days before a decision its memos are written. */
export const LEAD_DAYS = 3;

type Entry = { status: "writing" | "ready"; memos: Memo[] };
export const useMemos = create<{ byDecision: Record<string, Entry> }>(() => ({ byDecision: {} }));

const put = (id: string, e: Entry) => useMemos.setState((s) => ({ byDecision: { ...s.byDecision, [id]: e } }));

/** The two filled posts that write on a decision of this kind. */
export function writers(d: Decision) {
  const staff = useGame.getState().staff;
  const filled = (id: string) => staff.find((p) => p.id === id && p.name);
  const order = [...WRITERS[d.skill], "cm", "com", "fd", "fin"];
  return [...new Set(order)].map(filled).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 2);
}

/** Who writes a memo: the live route, with the rules if it fails. A check can put its own in (setMemoWriter). */
let writer: (req: MemoRequest) => Promise<Memo> = one;
export const setMemoWriter = (w: ((req: MemoRequest) => Promise<Memo>) | null) => { writer = w ?? one; };

async function one(req: MemoRequest): Promise<Memo> {
  try {
    const res = await fetch("/api/staff/memo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Memo;
  } catch (err) {
    console.warn("[memo] unavailable, rules instead:", err);
    return rulesMemo(req);
  }
}

/** Write both memos for one decision, each recommending a different option. Once per decision per campaign. */
export async function writeMemos(index: number) {
  const c = currentCase(useCase.getState().caseId);
  const d = c.decisions[index];
  if (!d || useMemos.getState().byDecision[d.id]) return;
  put(d.id, { status: "writing", memos: [] });
  // Everything is read now, so both memos are written from the same moment of the campaign.
  // The campaign as it will stand on the decision's day: the stretch's news (the card's "Since your last decision")
  // is in, so the memo quotes the figures the card shows, not the ones from before that news landed.
  const w = snapshot({ at: index + 1, date: d.date });
  const campaign = describeWorld(w);
  const memory = { ...useStaff.getState().memory };
  const memos: Memo[] = [];
  for (const p of writers(d)) {
    const first = memos[0];
    const decision = memoDecision(d);
    const req: MemoRequest = {
      decision,
      option: assign(d.id, p.id, decision.options, first?.option),
      director: { id: p.id, role: p.role, name: p.name, onRecord: p.onRecord, good: p.good, weak: p.weak },
      voice: profileOf(w, p.id).voice,
      campaign,
      memory: memory[p.id] ?? [],
    };
    memos.push(await writer(req));
    // A restart or a loaded save while writing: these belong to a campaign that no longer exists.
    if (useMemos.getState().byDecision[d.id]?.status !== "writing") return;
    put(d.id, { status: memos.length < 2 ? "writing" : "ready", memos: [...memos] });
  }
  put(d.id, { status: "ready", memos });
}

/** The first day a decision's memos may be written: LEAD_DAYS before it. */
export const memoDay = (date: string) => new Date(Date.parse(date) - LEAD_DAYS * 86_400_000).toISOString().slice(0, 10);

/**
 * Start each decision's memos once the campaign is within LEAD_DAYS of its date (or has reached it), and never before
 * the previous decision is made. The clock moves a day at a time, Skip included, so this fires on the right day.
 * Mount once.
 */
export function watchMemos() {
  const kick = () => {
    const s = useCase.getState(), c = currentCase(s.caseId);
    const next = c.decisions.findIndex((d) => !s.picks[d.id]);
    if (next < 0 || s.at < 1 || (next > 0 && !s.picks[c.decisions[next - 1].id])) return;
    const d = c.decisions[next];
    if (s.date >= memoDay(d.date) || s.at >= next + 1) void writeMemos(next);
  };
  kick();
  return useCase.subscribe((s, p) => {
    if (s.at < p.at || s.date < p.date) useMemos.setState({ byDecision: {} });
    if (s.picks !== p.picks || s.at !== p.at || s.date !== p.date) kick();
  });
}
