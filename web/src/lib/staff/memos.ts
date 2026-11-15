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

// Writes the staff memos for a case decision in the background, as the stretch before it begins, so a decision never
// waits on an agent: when the decision card opens they are usually there; if not, the card says they are coming.
// A restarted case starts them over.

type Entry = { status: "writing" | "ready"; memos: Memo[] };
export const useMemos = create<{ byDecision: Record<string, Entry> }>(() => ({ byDecision: {} }));

const put = (id: string, e: Entry) => useMemos.setState((s) => ({ byDecision: { ...s.byDecision, [id]: e } }));

/** The two filled posts that write on a decision of this kind. */
function writers(d: Decision) {
  const staff = useGame.getState().staff;
  const filled = (id: string) => staff.find((p) => p.id === id && p.name);
  const order = [...WRITERS[d.skill], "cm", "com", "fd", "fin"];
  return [...new Set(order)].map(filled).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 2);
}

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

/** Write both memos for one decision, the second against the first. Once per decision per campaign. */
export async function writeMemos(index: number) {
  const c = currentCase(useCase.getState().caseId);
  const d = c.decisions[index];
  if (!d || useMemos.getState().byDecision[d.id]) return;
  put(d.id, { status: "writing", memos: [] });
  const w = snapshot();
  const campaign = describeWorld(w);
  const memos: Memo[] = [];
  for (const p of writers(d)) {
    const first = memos[0];
    const firstBy = first && useGame.getState().staff.find((x) => x.id === first.director);
    const decision = memoDecision(d);
    const req: MemoRequest = {
      decision,
      option: assign(p.id, decision.options, first?.option),
      director: { id: p.id, role: p.role, name: p.name, onRecord: p.onRecord, good: p.good, weak: p.weak },
      voice: profileOf(w, p.id).voice,
      campaign,
      memory: useStaff.getState().memory[p.id] ?? [],
      against: first ? { option: first.option, who: firstBy?.onRecord || !firstBy?.name || firstBy.name === firstBy.role ? `the ${firstBy?.role ?? "other director"}` : firstBy.name } : undefined,
    };
    memos.push(await one(req));
    // A restart while writing: these belong to a campaign that no longer exists.
    if (!useMemos.getState().byDecision[d.id]) return;
    put(d.id, { status: memos.length < 2 ? "writing" : "ready", memos: [...memos] });
  }
  put(d.id, { status: "ready", memos });
}

/**
 * Start each decision's memos when the stretch before it begins: the moment the previous decision is made, or for
 * the first one when the campaign reaches it. Mount once.
 */
export function watchMemos() {
  const kick = () => {
    const s = useCase.getState(), c = currentCase(s.caseId);
    const next = c.decisions.findIndex((d) => !s.picks[d.id]);
    if (next >= 0 && s.at >= 1 && (next === 0 || s.picks[c.decisions[next - 1].id])) void writeMemos(next);
  };
  kick();
  return useCase.subscribe((s, p) => {
    if (s.at < p.at || s.date < p.date) useMemos.setState({ byDecision: {} });
    if (s.picks !== p.picks || s.at !== p.at) kick();
  });
}
