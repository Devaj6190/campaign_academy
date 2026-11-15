"use client";

import { currentCase, useCase, worldNow } from "../cases/store";
import { useRivals } from "../cases/rivals";
import { usePlanks } from "../manifesto/run";
import { useMemos } from "../staff/memos";
import { useStaff, type ChatItem } from "../staff/store";
import { useGame } from "../store";
import type { DebriefRequest, StaffLog } from "./types";

// The student's whole campaign, read from the stores after election day for the debrief agent. Read only: nothing
// here writes to any store. Long campaigns are trimmed to the most recent lines so the request stays small.

const MAX_WORK = 600;
const MAX_LINES = 120;
const clip = (t: string, n = 320) => { const s = t.replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function line(item: ChatItem, name: (id: string) => string): string | null {
  switch (item.k) {
    case "me": return `ORDER from the campaigner: ${clip(item.text)}${item.budget !== undefined ? ` (budget ${usd(item.budget)})` : ""}`;
    case "them": return `SAID: ${clip(item.text)}`;
    case "receipt": return `DONE by ${name(item.by)}: ${clip(item.effect.summary)} (cost ${usd(item.effect.cost)}${item.effect.raised ? `, raised ${usd(item.effect.raised)}` : ""}${item.effect.fit ? "" : ", outside their skills"})`;
    case "report": return `REPORT: ${clip(item.text)} Spent ${usd(item.spent)}, raised ${usd(item.raised)}.${item.ask ? ` Asked for ${usd(item.ask.amount)} more ${item.ask.reason}: ${item.state}.` : ""}`;
    case "coach": return `COACHING on the order (clarity ${item.clarity} of 4, ${Math.round(item.fit * 100)}% of jobs within the doers' skills${item.missing.length ? `, missing: ${item.missing.join(", ")}` : ""}): ${clip(item.text)}`;
    case "proposals": return `OPTIONS offered: ${clip(item.text)} ${item.options.map((o, i) => `${i + 1}) ${o.title} (${usd(o.cost)})`).join("; ")}.${item.picked !== undefined ? ` The campaigner picked ${item.picked + 1}.` : " None picked."}`;
    case "thoughts": return item.items.length ? `THINKING: ${item.items.map((t) => `${name(t.who)}: ${clip(t.text, 200)}`).join(" | ")}` : null;
    case "note": return `NOTE: ${clip(item.text)}`;
  }
}

export function campaignRecord(): DebriefRequest {
  const k = useCase.getState();
  const c = currentCase(k.caseId);
  const { w } = worldNow();
  const people = useGame.getState().staff;
  const name = (id: string) => { const p = people.find((x) => x.id === id); return p ? (p.name && p.name !== p.role ? `${p.name} (${p.role})` : p.role) : id; };
  const chat = useStaff.getState().chat;

  const staff: StaffLog[] = people
    .filter((p) => chat[p.id]?.length)
    .map((p) => ({ post: p.id, role: p.role, name: p.name, lines: chat[p.id].map((x) => line(x, name)).filter((x): x is string => !!x).slice(-MAX_LINES) }));

  return {
    caseId: c.id,
    final: { poll: w.poll, budgetLeft: w.budget },
    picks: c.decisions.filter((d) => k.picks[d.id]).map((d) => ({ decision: d.id, option: k.picks[d.id].option })),
    memos: Object.entries(useMemos.getState().byDecision).flatMap(([decision, e]) => e.memos.map((m) => ({ decision, by: name(m.director), option: m.option, headline: m.headline, text: clip(m.text) }))),
    work: k.work.slice(-MAX_WORK).map((x) => ({ date: x.date, by: x.by, label: x.label, note: x.note ? clip(x.note, 240) : undefined, cost: x.cost, raised: x.raised })),
    staff,
    planks: usePlanks.getState().planks.map((p) => ({ date: p.date, text: clip(p.text), tradeoff: p.tradeoff ? clip(p.tradeoff, 200) : undefined })),
    rivals: useRivals.getState().memory,
  };
}
