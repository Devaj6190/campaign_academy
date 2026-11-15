"use client";

import { snapshot } from "../staff/run";
import { useGame, type RivalState } from "../store";
import { debate, DEBATE_DAYS } from "./debate";
import { isPollDay, publish } from "./polls";
import type { Rival } from "./poll";
import type { PlanResult } from "./rivalAgent";
import { RIVALS } from "./rivals";
import { activeRivals, ME, RIVAL_IDS } from "../scenario";
import { GAME, NYC, PAYMENT_DAYS } from "../money/rules";
import { hash } from "../util";

// When things happen. Rivals plan from noon in the background and their moves land overnight, so the
// morning paper can report them and nothing ever waits on an agent. A plan that is still running at the
// rollover lands the moment it arrives. Debates are judged at the end of their day.

const WHO: Rival[] = RIVAL_IDS;

const setRival = (who: Rival, patch: (r: RivalState) => Partial<RivalState>) =>
  useGame.setState((g) => ({ rivals: { ...g.rivals, [who]: { ...g.rivals[who], ...patch(g.rivals[who]) } } }));

/** What Cole did today, in a few lines a rival can react to, and where he gained support. */
function coleToday() {
  const g = useGame.getState();
  const today = g.ledger.filter((l) => l.day === g.day && l.source !== "rival");
  const gained = [...new Set(today.flatMap((l) => Object.entries(l.effect.sent).filter(([, d]) => d > 0).map(([cd]) => +cd)))];
  const ignored = g.editions.filter((e) => e.day === g.day && e.decision === "pass").map((e) => `${ME.short} chose not to respond to this story in today's paper: "${e.lead.headline}"`);
  return { lines: [...today.slice(-6).map((l) => l.effect.summary.replace(/ \(Not their strength.*$/, "")), ...ignored], gained };
}

async function plan(who: Rival, forDay?: number) {
  const g = useGame.getState();
  const r = g.rivals[who];
  const day = forDay ?? g.day;
  if (r.plan.day === day && r.plan.status !== "idle") return;
  setRival(who, () => ({ plan: { day, status: "planning", moves: [] } }));
  const { lines, gained } = coleToday();
  const body = { who, snapshot: snapshot(), cash: r.cash, spent: r.spent, memory: r.memory, coleYesterday: lines, gained, extra: DEBATE_DAYS.includes(day) };
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

/** The rivals' own fundraising overnight, and public funds for a participant on payment days. */
function rivalIncome(today: number) {
  for (const who of WHO) {
    const def = RIVALS[who];
    const income = Math.round(def.income * (0.8 + hash(today * 13, WHO.indexOf(who) * 2 + 3) * 0.4));
    setRival(who, (r) => {
      const matchable = r.matchable + Math.round(income * def.smallShare);
      const owed = def.participant && PAYMENT_DAYS.includes(today) ? Math.max(0, Math.min(GAME.publicCap, matchable * NYC.ratio) - r.matchPaid) : 0;
      return { cash: r.cash + income + owed, raised: r.raised + income + owed, matchable, matchPaid: r.matchPaid + owed };
    });
  }
}

/** Called at noon game time. */
export function planRivals() {
  // Only rivals already in the race plan tonight.
  for (const who of activeRivals(useGame.getState().day)) void plan(who);
}

/** Called at the day rollover with the day that just ended. */
export function overnight(ended: number) {
  if (DEBATE_DAYS.includes(ended)) {
    const g = useGame.getState();
    const d = debate({ day: ended, manifesto: g.manifesto, ledger: g.ledger, polls: g.polls });
    g.applyEffect(d.effect, "debate");
    useGame.setState((s) => ({ news: { ...s.news, debate: d.story } }));
  }
  for (const who of activeRivals(ended)) {
    const r = useGame.getState().rivals[who];
    if (r.plan.day === ended && r.plan.status === "ready") land(who);
    // Never started (e.g. the clock jumped past noon): plan now; it lands when it arrives.
    else if (r.plan.day !== ended) void plan(who, ended);
  }
  // Poll mornings: a new poll is published and the campaign's map catches up with the whole city.
  // Rival moves still thinking land after this and show up in the next poll.
  const today = ended + 1;
  rivalIncome(today);
  if (isPollDay(today)) {
    const g = useGame.getState();
    const p = publish(g, today);
    useGame.setState({ polls: [...g.polls, p], poll: p.shares, fieldRead: { ...g.sent } });
  }
  // Then the paper goes to press: a debate extra, election eve on day 30, a daily edition otherwise.
  void import("../paper/run").then((m) => m.publishEdition(today === 30 ? "eve" : DEBATE_DAYS.includes(ended) ? "debate" : "daily"));
}
