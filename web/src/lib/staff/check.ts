import { useCase } from "../cases/store";
import { isQuestion, runOffline } from "./offline";
import { budgetIn, RunCtx, type RunEvent } from "./protocol";
import { BASE_BUDGET, DAILY, runBookings, snapshot } from "./run";

// Checks on the staff agents that need no API key (issue #41). Run with `npm run check:staff`.
// 1. An order and a question are told apart from their wording (the rules fallback; live agents decide themselves).
// 2. With no key, a question to any director gets two or three options and spends nothing; an order does work.
// 3. A scheduled event is a real appearance: it is booked on a date, paid for on the day and reserved from the order's
//    budget until then, happens as the candidate's own work, and never puts more on one day than he can do.

const ORDERS = [
  "Canvass Crown Heights this week with a $20,000 budget",
  "Can you canvass Crown Heights this week?",
  "Could you run call time with our past donors tomorrow?",
  "Please pitch reporters on the pre-K plan",
  "Let's hold a rally in Harlem on Saturday",
  "Spend $30,000 on digital ads for voters under 45",
];
const QUESTIONS = [
  "What should we be doing in Harlem right now?",
  "How do we win back Black voters?",
  "Any ideas for the Bronx?",
  "Can you suggest something for Queens?",
  "Give me options for the last two weeks",
  "Should we go negative on Quinn?",
  "Where are we weakest?",
];

/** An order's words, and the limit they state (null: none, so the default applies). */
const BUDGETS: [string, number | null][] = [
  ["Pitch reporters and run a small-dollar email. Under $15,000.", 15000],
  ["Spend at most $20,000 on call time and a fundraiser", 20000],
  ["Spend $30,000 on digital ads aimed at voters under 45", 30000],
  ["Canvass Crown Heights this week with a $20k budget", 20000],
  ["Run ads citywide, budget of 1.5 million, no more than $1m on TV", 1000000],
  ["Keep it under 8,000 dollars", 8000],
  ["Get the press talking about our plan to tax incomes over $500,000", null],
  ["Raise $100k from past donors this week", null],
  ["Book at most 3 events in Harlem", null],
  ["Canvass voters under 45 in Queens", null],
  ["Canvass Crown Heights this week", null],
];

async function offline(director: string, text: string, budget = BASE_BUDGET) {
  const events: RunEvent[] = [];
  const ctx = new RunCtx({ director, text, snapshot: snapshot(), history: [], budget, runId: 1 }, (e) => events.push(e));
  await runOffline(ctx, 0);
  return { events, spent: ctx.spent };
}

export async function checkStaff(): Promise<{ problems: string[]; report: string[] }> {
  const problems: string[] = [], report: string[] = [];
  for (const t of ORDERS) if (isQuestion(t)) problems.push(`read as a question, but it is an order: "${t}"`);
  for (const t of QUESTIONS) if (!isQuestion(t)) problems.push(`read as an order, but it is a question: "${t}"`);
  report.push(`wording: ${ORDERS.length} orders and ${QUESTIONS.length} questions checked`);
  for (const [t, want] of BUDGETS) if (budgetIn(t) !== want) problems.push(`budget read as ${budgetIn(t)}, should be ${want}: "${t}"`);
  report.push(`budgets: ${BUDGETS.length} orders read for their own limit`);

  useCase.getState().restart();
  useCase.setState({ at: 1, step: 1 });
  for (const d of ["cm", "fd", "fin", "com"]) {
    const q = await offline(d, "What should we do this week?");
    const p = q.events.find((e) => e.t === "proposals");
    const n = p?.t === "proposals" ? p.options.length : 0;
    if (n < 2 || n > 3) problems.push(`${d}: a question got ${n} options, not two or three`);
    if (q.spent || q.events.some((e) => e.t === "action")) problems.push(`${d}: a question spent money or did work`);
    if (p?.t === "proposals" && p.options.some((o) => !o.title || !o.order)) problems.push(`${d}: an option has no title or no order`);
    const o = await offline(d, "Canvass Crown Heights and run call time this week");
    if (!o.events.some((e) => e.t === "action")) problems.push(`${d}: an order did no work`);
    if (o.events.some((e) => e.t === "proposals")) problems.push(`${d}: an order was answered with options`);
    report.push(`${d}: question → ${n} options, $0 spent; order → ${o.events.filter((e) => e.t === "action").length} jobs, $${o.spent.toLocaleString("en-US")}`);
  }

  // An order's own limit holds: a run given $20,000 works, and cannot spend past it.
  const tight = await offline("fd", "Canvass Crown Heights and train volunteers. Under $20,000.", budgetIn("Under $20,000.")!);
  if (tight.spent > 20000 || !tight.spent) problems.push(`budget: a $20,000 order spent $${tight.spent.toLocaleString("en-US")}`);
  report.push(`budget: a $20,000 order spent $${tight.spent.toLocaleString("en-US")}`);

  // Scheduling: book through the run, then let the day come.
  useCase.getState().restart();
  useCase.setState({ at: 1, step: 1 });
  const today = useCase.getState().date;
  const events: RunEvent[] = [];
  const ctx = new RunCtx({ director: "cm", text: "Book the candidate", snapshot: snapshot(), history: [], budget: 250_000, runId: 7 }, (e) => events.push(e));
  const wanted = new Date(Date.parse(today) + 3 * 86_400_000).toISOString().slice(0, 10);
  const texts = [0, 1, 2].map(() => ctx.act("sch", "schedule_event", { district: 308, on: wanted, kind: "rally" }).text);
  const booked = events.flatMap((e) => (e.t === "action" && e.effect.booking ? [e.effect] : []));
  if (booked.length !== 3) problems.push(`scheduling: 3 events asked for, ${booked.length} booked`);
  if (ctx.spent) problems.push("scheduling: booking cost money before the day came");
  if (ctx.committed <= 0 || ctx.left !== 250_000 - ctx.committed) problems.push("scheduling: the expected cost was not reserved from the order's budget");
  const over = new RunCtx({ director: "cm", text: "Book the candidate", snapshot: snapshot(), history: [], budget: 20_000, runId: 8 }, () => {});
  if (over.act("sch", "schedule_event", { district: 308, on: wanted, kind: "rally" }).ok) problems.push("scheduling: a rally was booked on a budget too small to pay for it");
  if (!over.act("sch", "schedule_event", { district: 308, on: wanted, kind: "doors" }).ok) problems.push("scheduling: door knocking was refused on a budget that covers it");
  const sameDay = booked.filter((e) => e.booking!.date === wanted).length;
  if (sameDay > DAILY) problems.push(`scheduling: ${sameDay} events on one day, the candidate can do ${DAILY}`);
  if (booked.some((e) => e.booking!.date <= today)) problems.push("scheduling: an event was booked for today or the past");
  for (const e of booked) useCase.getState().book({ date: e.booking!.date, kind: e.booking!.kind, cd: e.district!, by: e.by });
  const dates = [...new Set(booked.map((e) => e.booking!.date))].sort();
  for (const d of dates) { useCase.setState({ date: d }); runBookings(); }
  const done = useCase.getState().bookings.filter((b) => b.done && !/^(Cancelled|Dropped)/.test(b.done)).length;
  const mine = useCase.getState().work.filter((x) => x.by === "candidate");
  if (done !== 3 || mine.length !== 3) problems.push(`scheduling: ${done} of 3 bookings happened, ${mine.length} appearances on the case`);
  if (!mine.some((x) => x.cost > 0)) problems.push("scheduling: the appearances cost nothing on the day");
  report.push(`scheduling: 3 rallies asked for ${wanted} → booked on ${dates.join(", ")}; all happened, $${mine.reduce((a, x) => a + x.cost, 0).toLocaleString("en-US")} paid on the day (${texts[2].includes("full") ? "third moved: day was full" : "no day was full"})`);
  return { problems, report };
}
