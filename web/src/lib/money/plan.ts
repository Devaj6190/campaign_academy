import { avgIncome, limitStatus, matchStatus, nextPaymentDay, runway } from "./finance";
import { GAME, sum, type Envelopes, type Money } from "./rules";

// Dana's weekly budget. The model (or the rules, with no key) drafts it; check() makes sure it fits the
// cash, the runway and the spending limit before the player ever sees it.

export type BudgetFacts = {
  day: number;
  daysLeft: number;
  cash: number;
  payroll: number;
  avgIncome: number;
  /** What Dana expects her own fundraising plan to bring in per day (at least the week's average). */
  plannedIncome: number;
  current: Envelopes;
  wastedYesterday: number;
  participant: boolean | null;
  spentTotal: number;
  spendingLimit: number | null;
  limitLeft: number | null;
  match: { qualified: boolean; nycDonors: number; matchable: number; owed: number; thresholdDonors: number; thresholdDollars: number; nextPaymentDay: number | null };
  runwayDays: number | null;
  rivals: { name: string; raised: number; spent: number; cash: number }[];
  /** The most this campaign can budget per day for ads, field and events combined and still be safe. */
  maxPerDay: number;
};

export type Draft = { ads: number; field: number; events: number; fundraising: string[]; note: string };

export function facts(g: { day: number; cash: number; losses: { v: number }[]; money: Money; rivals: Record<"hale" | "brandt", { cash: number; raised: number; spent: number }> }): BudgetFacts {
  const m = g.money;
  const payroll = g.losses[0]?.v ?? 0;
  const daysLeft = Math.max(1, 30 - g.day);
  const ms = matchStatus(m);
  const lim = limitStatus(m);
  const income = avgIncome(m, g.day);
  const rw = runway(g.cash, payroll, m, g.day);
  // What the campaign can afford per day until election day, counting expected income and public funds owed.
  const planned = Math.max(income, PLANNED_INCOME);
  const affordable = (g.cash + planned * daysLeft + ms.owed) / daysLeft - payroll;
  const underLimit = lim.limit === null ? Infinity : lim.left / daysLeft - payroll;
  return {
    day: g.day,
    daysLeft,
    cash: Math.round(g.cash),
    payroll,
    avgIncome: Math.round(income),
    plannedIncome: Math.round(planned),
    current: m.next,
    wastedYesterday: m.waste?.amount ?? 0,
    participant: m.participant,
    spentTotal: m.spentTotal,
    spendingLimit: lim.limit,
    limitLeft: lim.limit === null ? null : Math.round(lim.left),
    match: { qualified: ms.qualified, nycDonors: ms.nycDonors, matchable: ms.matchable, owed: ms.owed, thresholdDonors: GAME.thresholdDonors, thresholdDollars: GAME.thresholdDollars, nextPaymentDay: nextPaymentDay(g.day) },
    runwayDays: Number.isFinite(rw) ? Math.floor(rw) : null,
    rivals: (["hale", "brandt"] as const).map((k) => ({ name: k === "hale" ? "Hale" : "Brandt", raised: Math.round(g.rivals[k].raised), spent: Math.round(g.rivals[k].spent), cash: Math.round(g.rivals[k].cash) })),
    maxPerDay: Math.max(0, Math.floor(Math.min(affordable, underLimit) / 100) * 100),
  };
}

/** A steady week of call time, a dinner and house parties brings in about this much a day (balance runs). */
const PLANNED_INCOME = 10_000;

const r100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);

/** Clamp a draft to what the campaign can safely afford, keeping its proportions. */
export function check(f: BudgetFacts, d: Draft): Draft {
  const clean = { ads: r100(Math.min(40000, d.ads)), field: r100(Math.min(40000, d.field)), events: r100(Math.min(40000, d.events)) };
  const total = sum(clean);
  const k = total > f.maxPerDay && total > 0 ? f.maxPerDay / total : 1;
  const out = { ads: r100(clean.ads * k), field: r100(clean.field * k), events: r100(clean.events * k) };
  const fundraising = d.fundraising.filter(Boolean).slice(0, 3);
  const note = k < 1 ? `${d.note} (Trimmed to fit what we can afford through election day.)` : d.note;
  return { ...out, fundraising, note };
}

/** Dana by the rules: keep the budgets near where they are, trimmed to the money; lean on big donors. */
export function rulesDraft(f: BudgetFacts): Draft {
  const total = Math.min(sum(f.current), f.maxPerDay);
  const ads = total * 0.44, field = total * 0.31, events = total * 0.25;
  const fundraising = ["Two hours of call time with the real-estate and business list", "A donor dinner this week"];
  if (f.participant && !f.match.qualified) fundraising.push(`A small-dollar email to reach ${f.match.thresholdDonors} New York donors so we qualify for matching funds`);
  const tight = f.runwayDays !== null && f.runwayDays < f.daysLeft;
  const note = tight
    ? `At this burn we run out of money in about ${f.runwayDays} days, with ${f.daysLeft} to go. I've cut the budgets to what we can carry, and we need the big checks in this week.`
    : `We can carry this through election day. ${f.wastedYesterday ? `We left $${f.wastedYesterday.toLocaleString("en-US")} unused yesterday; give the directors work or I'll trim it. ` : ""}The big donors are still where the money is.`;
  return check(f, { ads, field, events, fundraising, note });
}
