"use client";

import { useGame } from "../store";
import { feed, instruct, letGo } from "../staff/run";
import { bumpMorale, pushChat, useStaff } from "../staff/store";
import { runway } from "./finance";
import { facts, rulesDraft, type Draft } from "./plan";
import { ENVELOPE_OF, ENVELOPES, type Envelope } from "./rules";

// Money in the browser: what happens each morning after the books settle, and Dana's budget proposals.

const PROPOSAL_DAYS = [1, 8, 15, 22];

/** Can a direct action (Cole in person, the paper's response, the contrast ad) be paid for right now? */
export function canPay(action: string, cost: number): { ok: true } | { ok: false; text: string } {
  const g = useGame.getState();
  const env = ENVELOPE_OF[action as keyof typeof ENVELOPE_OF] as Envelope | undefined;
  if (env) {
    const left = g.money.envelopes[env] - g.money.spent[env];
    if (left >= cost) return { ok: true };
    const label = ENVELOPES.find((e) => e.id === env)!.label;
    return { ok: false, text: `Today's ${label} budget has $${Math.max(0, left).toLocaleString("en-US")} left and this costs $${cost.toLocaleString("en-US")}. Raise tomorrow's ${label} budget in the top bar.` };
  }
  return cost <= g.cash ? { ok: true } : { ok: false, text: "Not enough cash for that." };
}

/** After the overnight books: missed payroll hits the team; Dana drafts a budget when it's due. */
export function morning(missedPayroll: boolean) {
  const g = useGame.getState();
  if (missedPayroll) {
    for (const p of g.staff) if (p.name) bumpMorale(p.id, -8);
    feed("fin", "Payroll was missed. The whole team took a pay cut they didn't agree to.", "neg");
    // Every second missed payday in a row, the unhappiest person who isn't mid-task walks.
    if (g.money.missed >= 2 && g.money.missed % 2 === 0) {
      const s = useStaff.getState();
      const who = g.staff.filter((p) => p.name && !s.active[p.id] && p.id !== "cm").sort((a, b) => (s.morale[a.id] ?? 70) - (s.morale[b.id] ?? 70))[0];
      if (who) {
        letGo(who.id, true);
        useGame.setState((x) => ({ money: { ...x.money, events: [...x.money.events, { day: x.day, kind: "quit", text: `${who.name}, ${who.role}, quit after two missed paydays.` }] } }));
      }
    }
  }
  const m = useGame.getState().money;
  const rw = runway(g.cash, g.losses[0]?.v ?? 0, m, g.day);
  const due = PROPOSAL_DAYS.includes(g.day) && m.proposalDay !== g.day;
  const alarm = rw < 30 - g.day && g.day - m.proposalDay >= 3;
  if (due || alarm) void requestProposal();
}

export async function requestProposal() {
  const g = useGame.getState();
  if (!g.staff.some((p) => p.id === "fin" && p.name)) return;
  useGame.setState((x) => ({ money: { ...x.money, proposalDay: x.day } }));
  const f = facts(g);
  let out: { draft: Draft; mode: "live" | "rules" };
  try {
    const res = await fetch("/api/money/propose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: f }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    out = (await res.json()) as typeof out;
  } catch (err) {
    console.warn("[money] proposal failed, rules draft:", err);
    out = { draft: rulesDraft(f), mode: "rules" };
  }
  const d = out.draft;
  useGame.setState((x) => ({ money: { ...x.money, proposal: { day: x.day, ads: d.ads, field: d.field, events: d.events, fundraising: d.fundraising, note: d.note, mode: out.mode, state: "open" } } }));
  pushChat("fin", { k: "them", text: `I've put a budget for the week on your desk (the cash total in the top bar). ${d.note}` });
}

/** Approve Dana's budget: it applies from tomorrow, and she starts on the first fundraising step. */
export function approveProposal() {
  const p = useGame.getState().money.proposal;
  if (!p || p.state !== "open") return;
  useGame.setState((x) => ({ money: { ...x.money, next: { ads: p.ads, field: p.field, events: p.events }, proposal: { ...p, state: "approved" } } }));
  feed("fin", `You approved the Finance Director's budget: ads $${p.ads.toLocaleString("en-US")}, field $${p.field.toLocaleString("en-US")}, events $${p.events.toLocaleString("en-US")} a day from tomorrow.`, "pos");
  if (p.fundraising[0]) instruct("fin", p.fundraising[0]);
}

export function dismissProposal() {
  useGame.setState((x) => (x.money.proposal ? { money: { ...x.money, proposal: { ...x.money.proposal, state: "dismissed" } } } : {}));
}
