"use client";

import { snapshot } from "../staff/run";
import { useGame, type RivalState } from "../store";
import { debate, DEBATE_DAYS } from "./debate";
import type { Rival } from "./poll";
import type { PlanResult } from "./rivalAgent";

// When things happen. Rivals plan from noon in the background and their moves land overnight, so the
// morning paper can report them and nothing ever waits on an agent. A plan that is still running at the
// rollover lands the moment it arrives. Debates are judged at the end of their day.

const WHO: Rival[] = ["hale", "brandt"];

const setRival = (who: Rival, patch: (r: RivalState) => Partial<RivalState>) =>
  useGame.setState((g) => ({ rivals: { ...g.rivals, [who]: { ...g.rivals[who], ...patch(g.rivals[who]) } } }));

/** What Cole did today, in a few lines a rival can react to, and where he gained support. */
function coleToday() {
  const g = useGame.getState();
  const today = g.ledger.filter((l) => l.day === g.day && l.source !== "rival");
  const gained = [...new Set(today.flatMap((l) => Object.entries(l.effect.sent).filter(([, d]) => d > 0).map(([cd]) => +cd)))];
  return { lines: today.slice(-6).map((l) => l.effect.summary.replace(/ \(Not their strength.*$/, "")), gained };
}

async function plan(who: Rival, forDay?: number) {
  const g = useGame.getState();
  const r = g.rivals[who];
  const day = forDay ?? g.day;
  if (r.plan.day === day && r.plan.status !== "idle") return;
  setRival(who, () => ({ plan: { day, status: "planning", moves: [] } }));
  const { lines, gained } = coleToday();
  const body = { who, snapshot: snapshot(), cash: r.cash, memory: r.memory, coleYesterday: lines, gained, extra: DEBATE_DAYS.includes(day) };
  let out: PlanResult;
  try {
    const res = await fetch("/api/rivals/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    out = (await res.json()) as PlanResult;
  } catch (err) {
    console.warn(`[rivals] ${who} plan failed:`, err);
    out = { moves: [], memo: "", mode: "rules" };
  }
  setRival(who, () => ({ plan: { day, status: "ready", moves: out.moves, memo: out.memo, mode: out.mode } }));
  // The night already passed while this rival was thinking: land the moves now.
  if (useGame.getState().day > day) land(who);
}

function land(who: Rival) {
  const r = useGame.getState().rivals[who];
  if (r.plan.status !== "ready") return;
  for (const e of r.plan.moves) useGame.getState().applyEffect(e, "rival");
  setRival(who, (cur) => ({ plan: { ...cur.plan, status: "landed" }, memory: [...cur.memory, `Day ${cur.plan.day}: ${cur.plan.memo || r.plan.moves.map((m) => m.summary).join(" ")}`].slice(-6) }));
  useGame.setState((g) => ({ news: { ...g.news, opposition: [...g.news.opposition, ...r.plan.moves.map((m) => m.summary)] } }));
}

/** Called at noon game time. */
export function planRivals() {
  for (const who of WHO) void plan(who);
}

/** Called at the day rollover with the day that just ended. */
export function overnight(ended: number) {
  if (DEBATE_DAYS.includes(ended)) {
    const g = useGame.getState();
    const d = debate({ day: ended, manifesto: g.manifesto, ledger: g.ledger, pollHistory: g.pollHistory });
    g.applyEffect(d.effect, "debate");
    useGame.setState((s) => ({ news: { ...s.news, debate: d.story } }));
  }
  for (const who of WHO) {
    const r = useGame.getState().rivals[who];
    if (r.plan.day === ended && r.plan.status === "ready") land(who);
    // Never started (e.g. the clock jumped past noon): plan now; it lands when it arrives.
    else if (r.plan.day !== ended) void plan(who, ended);
  }
}
