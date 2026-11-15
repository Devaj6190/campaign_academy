import type { PollRecord } from "../engine/polls";
import { addGifts, recover, trickleGifts } from "./donors";
import { ENVELOPES, GAME, NYC, PAYMENT_DAYS, sum, TRICKLE, type Envelopes, type Money, type MoneyEvent, type Source } from "./rules";
import { ACTIVE, ME } from "../scenario";

// The campaign's books. Pure functions over the money state, so the store, the panels, Dana and the paper
// all read the same numbers.

type Books = { day: number; cash: number; payroll: number; money: Money; polls: PollRecord[]; ledger: { day: number; source: string; effect: { action: string; raised: number; momentum: number } }[] };

const k = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Matching funds: totals so far, whether Cole has qualified, and what the Board owes him. */
export function matchStatus(m: Money) {
  const d = Object.values(m.donors);
  const matchable = d.reduce((a, x) => a + x.matchable, 0);
  const nycDonors = d.reduce((a, x) => a + x.nyc, 0);
  const qualified = matchable >= GAME.thresholdDollars && nycDonors >= GAME.thresholdDonors;
  const earned = m.participant === false ? 0 : Math.min(GAME.publicCap, matchable * NYC.ratio);
  const owed = qualified && !m.matchStopped && m.participant !== false ? Math.max(0, earned - m.matchPaid) : 0;
  return { matchable, nycDonors, qualified, earned, owed };
}

export const nextPaymentDay = (day: number) => PAYMENT_DAYS.find((d) => d > day) ?? null;

/** Spending limit (participants only) and how much room is left. */
export function limitStatus(m: Money) {
  if (m.participant === false) return { limit: null, left: Infinity, over: 0, counted: m.spentTotal };
  // Where the race sets aside a fixed allowance for staff and overheads, payroll is that allowance.
  const F = ACTIVE.finance;
  const counted = F.fixedAllowance ? m.spentTotal - m.payrollTotal + F.fixedAllowance * F.scale : m.spentTotal;
  return { limit: GAME.spendingLimit, left: GAME.spendingLimit - counted, over: Math.max(0, counted - GAME.spendingLimit), counted };
}

/** Income over the last n days, by source. */
export function incomeBy(m: Money, day: number, days = 7) {
  const out: Record<Source, number> = { "Small donors": 0, Fundraisers: 0, "Large donors": 0, "Public funds": 0 };
  for (const i of m.income) if (i.day > day - days) out[i.source] += i.amount;
  return out;
}

/** Average daily income over the last week (public funds left out: they come in lumps on payment days). */
export function avgIncome(m: Money, day: number) {
  const days = Math.min(7, Math.max(1, day));
  const by = incomeBy(m, day, days);
  return (by["Small donors"] + by.Fundraisers + by["Large donors"]) / days;
}

/** Money out per day at tomorrow's budgets. */
export const burn = (payroll: number, m: Money) => payroll + sum(m.next);

/** How many days the cash lasts at the current burn and income (Infinity if it doesn't run out). */
export function runway(cash: number, payroll: number, m: Money, day: number) {
  const net = avgIncome(m, day) - burn(payroll, m);
  return net >= 0 ? Infinity : Math.max(0, cash / -net);
}

/** The small-donor trickle: grows when the latest poll shows the energetic groups warming to Cole,
 *  after recent emails, and after a good debate. */
export function trickle(b: Books, ended: number) {
  const g = b.polls[b.polls.length - 1]?.groups ?? {};
  const warm = TRICKLE.groups.reduce((a, [id, w]) => a + w * (g[id]?.feel ?? 50), 0) / 55;
  const emails = b.ledger.filter((l) => l.day >= ended - 1 && l.effect.action === "email_blast").reduce((a, l) => a + l.effect.raised, 0);
  const debate = b.ledger.find((l) => l.source === "debate" && l.day >= ended - 1 && l.day <= ended);
  const lift = debate && debate.effect.momentum > 0 ? 1 + debate.effect.momentum * 0.6 : 1;
  return Math.round((TRICKLE.base * warm ** 1.6 + emails * 0.15) * lift);
}

/** The night's books: budgets lapse, small gifts come in, the Board pays, payroll goes out, tomorrow's
 *  budgets are paid for, and the spending limit is checked. `ended` is the day that just finished. */
export function settle(b: Books, ended: number): { cash: number; money: Money; missedPayroll: boolean } {
  const today = ended + 1;
  let m = b.money;
  let cash = b.cash;
  const events: MoneyEvent[] = [];

  // Anyone who hasn't decided on public financing by the end of day 1 is in (the default for most campaigns).
  if (m.participant === null) {
    m = { ...m, participant: true };
    events.push({ day: today, kind: "joined", text: `${ME.short} joined the city's public financing program: matching funds, and a spending limit.` });
  }

  // Whatever was not used from yesterday's budgets is gone.
  const by = Object.fromEntries(ENVELOPES.map(({ id }) => [id, Math.max(0, m.envelopes[id] - m.spent[id])])) as Envelopes;
  const waste = { day: ended, amount: sum(by), by };

  // Small online gifts.
  const t = trickle(b, ended);
  const gifts = trickleGifts(t);
  m = { ...m, ...addGifts(m, gifts, []), income: [...m.income, { day: today, source: "Small donors" as const, amount: t }], raisedTotal: m.raisedTotal + t };
  cash += t;

  // Public funds arrive on payment days for everything matched so far.
  const before = matchStatus(b.money);
  const ms = matchStatus(m);
  if (ms.qualified && !before.qualified && m.participant) events.push({ day: today, kind: "qualified", text: `${ME.short} qualified for public matching funds: ${ms.nycDonors.toLocaleString("en-US")} New York donors and ${k(ms.matchable)} in matchable gifts.` });
  if (PAYMENT_DAYS.includes(today) && ms.owed > 0) {
    cash += ms.owed;
    m = { ...m, matchPaid: m.matchPaid + ms.owed, payments: [...m.payments, { day: today, amount: ms.owed }], income: [...m.income, { day: today, source: "Public funds" as const, amount: ms.owed }] };
    events.push({ day: today, kind: "payment", text: `The Campaign Finance Board paid ${ME.short} ${k(ms.owed)} in matching funds.`, amount: ms.owed });
  }

  // Payroll, or a missed payday.
  let missedPayroll = false;
  if (cash >= b.payroll) {
    cash -= b.payroll;
    m = { ...m, spentTotal: m.spentTotal + b.payroll, payrollTotal: m.payrollTotal + b.payroll, missed: 0 };
  } else {
    missedPayroll = true;
    m = { ...m, missed: m.missed + 1 };
    events.push({ day: today, kind: "missed", text: `The ${ME.short} campaign missed payroll: ${k(b.payroll)} due, ${k(Math.max(0, cash))} in the bank.`, amount: b.payroll });
  }

  // Tomorrow's budgets are paid for now, as far as the cash goes.
  const want = sum(m.next);
  const fund = cash > 0 ? Math.min(cash, want) : 0;
  const f = want ? fund / want : 0;
  const envelopes = Object.fromEntries(ENVELOPES.map(({ id }) => [id, Math.floor(m.next[id] * f)])) as Envelopes;
  cash -= sum(envelopes);
  if (want && f < 1) events.push({ day: today, kind: "broke", text: f === 0 ? "Out of money: none of today's ads, field or events budgets could be paid for." : `Short of money: only ${Math.round(f * 100)}% of today's budgets could be paid for.` });
  m = { ...m, envelopes, spent: { ads: 0, field: 0, events: 0 }, spentTotal: m.spentTotal + sum(envelopes), waste, fatigue: recover(m.fatigue) };

  // The spending limit: a participant who goes over is fined the overage and loses future matching payments.
  const lim = limitStatus(m);
  const fined = m.fines.reduce((a, x) => a + x.amount, 0);
  if (lim.over > fined) {
    const amount = lim.over - fined;
    cash -= amount;
    m = { ...m, fines: [...m.fines, { day: today, amount }], matchStopped: true };
    events.push({ day: today, kind: "fine", text: `${ME.short}'s campaign broke the spending limit by ${k(lim.over)}. It is fined ${k(amount)} and its remaining matching funds are stopped.`, amount });
  }

  return { cash, money: { ...m, events: [...m.events, ...events] }, missedPayroll };
}
