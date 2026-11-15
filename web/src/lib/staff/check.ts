import { skip } from "../cases/clock";
import { useRivals } from "../cases/rivals";
import { currentCase, useCase } from "../cases/store";
import { Ledger } from "./numbers";
import { isQuestion, runOffline, runSteps } from "./offline";
import { budgetIn, RunCtx, type Proposal, type RunEvent } from "./protocol";
import { BASE_BUDGET, DAILY, pick, runBookings, snapshot } from "./run";
import "./speak"; // its restart hook is part of what is checked
import { useStaff } from "./store";

// Checks on the staff agents that need no API key (issue #41). Run with `npm run check:staff`.
// 1. An order and a question are told apart from their wording (the rules fallback; live agents decide themselves).
// 2. With no key, a question to any director gets two or three options and spends nothing; an order does work.
// 3. A scheduled event is a real appearance: it is booked on a date, paid for on the day and reserved from the order's
//    budget until then, happens as the candidate's own work, and never puts more on one day than he can do.
// 5. No invented numbers: a figure the staff were not given is caught, and one they were given (also rounded) passes.
// 4. An option's price is the engine's: picking it carries out exactly its steps and costs exactly what the card said.

const ORDERS = [
  "Canvass Crown Heights this week with a $20,000 budget",
  "Can you canvass Crown Heights this week?",
  "Could you run call time with our past donors tomorrow?",
  "Please pitch reporters on the pre-K plan",
  "Let's hold a rally in Harlem on Saturday",
  "Do a canvass in Crown Heights this week",
  "Is it worth canvassing Harlem? Do it if so: canvass Harlem this week",
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
  ["Run ads citywide, budget of 1.5 million, no more than $1m on TV", 1500000],
  ["Keep it under 8,000 dollars", 8000],
  // From Devaj's review: ordinary phrasings that were missed, and counts or prohibitions read as budgets.
  ["Don't spend more than $10,000", 10000],
  ["Budget: $20,000. Canvass Harlem", 20000],
  ["Keep it to $10,000", 10000],
  ["Cap it at $10,000", 10000],
  ["Canvass Harlem with $15k", 15000],
  ["Knock up to 2,000 doors in Harlem", null],
  ["Do not spend $30,000 on TV", null],
  ["Spend $50,000 on TV, with up to $2,000 for flyers", 52000],
  // Not budgets at all.
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

  // What the staff were shown, then lines they might write: [line, the figures in it nobody gave].
  const given = new Ledger().add(
    "Left to spend under the cap: $4,312,000. Poll: Quinn 36, de Blasio 12. black (Black voters): 10.4% support; 29% of likely voters. 110 Harlem: support 11%.",
    "Door canvass ~$18,000. Knocked 1,213 doors in Harlem. Support +3.6. Call time raised $114,250 from 23 donors.",
    "Tax incomes above $500,000 to pay for pre-kindergarten. Today is 2013-01-28; 225 days to the primary.",
  );
  const LINES: [string, string[]][] = [
    ["We're at 12% citywide and 10% with Black voters, who are 29% of the electorate.", []],
    ["We have $4.3M under the cap and Harlem sits at 11%.", []],
    ["1,213 doors in Harlem, support up 3.6. Call time brought in $114,250 from 23 donors.", []],
    ["Book him on 125th St on the 9th, 2 events a day for 3 weeks.", []],
    ["The $500,000 tax plan is our best story with 225 days to go.", []],
    ["I'd put $1.5M into outer-borough radio.", ["$1.5M"]],
    ["That canvass moved us 7% in Harlem.", ["7%"]],
    ["We knocked 5,000 doors and signed up 340 volunteers.", ["5,000", "340"]],
    ["A digital buy costs about $50,000 and Thompson is at 21%.", ["$50,000", "21%"]],
  ];
  for (const [line, want] of LINES) {
    const got = given.unknown(line);
    if (got.join("|") !== want.join("|")) problems.push(`numbers: in "${line}" caught [${got.join(", ")}], should catch [${want.join(", ")}]`);
  }
  const trimmed = given.clean("Harlem sits at 11%. I'd put $1.5M into radio there. Doors first.");
  if (trimmed !== "Harlem sits at 11%. Doors first.") problems.push(`numbers: trimming left "${trimmed}"`);
  report.push(`numbers: ${LINES.length} lines checked for figures the staff were not given`);

  useCase.getState().restart();
  useCase.setState({ at: 1, step: 1 });
  const priced: { d: string; opt: Proposal }[] = [];
  for (const d of ["cm", "fd", "fin", "com"]) {
    const q = await offline(d, "What should we do this week?");
    const p = q.events.find((e) => e.t === "proposals");
    const n = p?.t === "proposals" ? p.options.length : 0;
    if (n < 2 || n > 3) problems.push(`${d}: a question got ${n} options, not two or three`);
    if (q.spent || q.events.some((e) => e.t === "action")) problems.push(`${d}: a question spent money or did work`);
    if (p?.t === "proposals" && p.options.some((o) => !o.title || !o.steps.length)) problems.push(`${d}: an option has no title or no steps`);
    if (p?.t === "proposals") for (const opt of p.options) priced.push({ d, opt });
    const o = await offline(d, "Canvass Crown Heights and run call time this week");
    if (!o.events.some((e) => e.t === "action")) problems.push(`${d}: an order did no work`);
    if (o.events.some((e) => e.t === "proposals")) problems.push(`${d}: an order was answered with options`);
    report.push(`${d}: question → ${n} options, $0 spent; order → ${o.events.filter((e) => e.t === "action").length} jobs, $${o.spent.toLocaleString("en-US")}`);
  }

  // Every option offered above, plus two built by hand with several steps and a booking: the price on the card is
  // what picking it costs, to the dollar, and exactly its steps are carried out.
  const today0 = useCase.getState().date;
  const soon = new Date(Date.parse(today0) + 2 * 86_400_000).toISOString().slice(0, 10);
  const byHand = new RunCtx({ director: "fd", text: "What should we do in Brooklyn?", snapshot: snapshot(), history: [], budget: BASE_BUDGET, runId: 3 }, (e) => { if (e.t === "proposals") for (const opt of e.options) priced.push({ d: "fd", opt }); });
  byHand.propose("Two ways.", [
    { title: "Canvass and train in Crown Heights", steps: [{ action: "canvass", district: 308 }, { action: "volunteer_training", district: 308 }, { action: "phone_bank" }] },
    { title: "Put the candidate on doors", steps: [{ action: "schedule_event", district: 308, on: soon, kind: "doors" }, { action: "coalition_meeting", by: "nobody" }] },
  ]);
  let exact = 0;
  for (const { d, opt } of priced) {
    const events: RunEvent[] = [];
    const ctx = new RunCtx({ director: d, text: opt.order, snapshot: snapshot(), history: [], budget: opt.cost, runId: 5, steps: opt.steps }, (e) => events.push(e));
    await runSteps(ctx, "offline", undefined, 0);
    const paid = ctx.spent + ctx.committed;
    const did = events.flatMap((e) => (e.t === "action" ? [e.effect.action] : []));
    if (paid !== opt.cost) problems.push(`pricing: "${opt.title}" was offered at $${opt.cost.toLocaleString("en-US")} and cost $${paid.toLocaleString("en-US")}`);
    else exact++;
    if (did.join() !== opt.steps.map((s) => s.action).join()) problems.push(`pricing: "${opt.title}" did ${did.join()} instead of its steps ${opt.steps.map((s) => s.action).join()}`);
    if (events.some((e) => e.t === "report" && /Not all/.test(e.text))) problems.push(`pricing: "${opt.title}" did not go through on its own price`);
  }
  if (priced.length < 10) problems.push(`pricing: only ${priced.length} options to test, wanted ten`);
  report.push(`pricing: ${exact} of ${priced.length} options cost exactly the price on the card, and ran exactly their steps`);

  // An order's own limit holds: a run given $20,000 works, and cannot spend past it.
  const tight = await offline("fd", "Canvass Crown Heights and train volunteers. Under $20,000.", budgetIn("Under $20,000.")!);
  if (tight.spent > 20000 || !tight.spent) problems.push(`budget: a $20,000 order spent $${tight.spent.toLocaleString("en-US")}`);
  report.push(`budget: a $20,000 order spent $${tight.spent.toLocaleString("en-US")}`);

  // With no key, a booking order books what it names (door knocking when nothing is named), on different days.
  {
    useCase.getState().restart();
    useCase.setState({ at: 1, step: 1 });
    const e = await offline("cm", "Book the candidate for events in Harlem and Crown Heights this week");
    const b = e.events.flatMap((x) => (x.t === "action" && x.effect.booking ? [x.effect.booking] : []));
    if (!b.length) problems.push("offline booking: nothing was booked");
    if (b.some((x) => x.kind === "rally")) problems.push("offline booking: a rally was booked though none was asked for");
    if (new Set(b.map((x) => x.date)).size < b.length) problems.push(`offline booking: several events on one day (${b.map((x) => x.date).join(", ")})`);
    const r = (await offline("cm", "Book a rally in Harlem this week", 300_000)).events.flatMap((x) => (x.t === "action" && x.effect.booking ? [x.effect.booking.kind] : []));
    if (!r.includes("rally")) problems.push("offline booking: asked for a rally, got none");
    report.push(`offline booking: ${b.map((x) => `${x.kind} on ${x.date}`).join(", ")}; a rally when asked`);
  }

  // "Play it again" starts the staff's remarks over.
  {
    useCase.setState({ at: 3, step: 3, date: "2013-07-20" });
    useStaff.setState({ spoken: { _last: 170, "rivals-3": 170 } });
    useCase.getState().restart();
    if (Object.keys(useStaff.getState().spoken).length) problems.push("remarks: a restarted case kept the old campaign's record of who spoke when");
    report.push("remarks: a restart starts them over");
  }

  // An option card is used only when its order starts (Devaj's review, item 3): picking while the director is still
  // on another job leaves the card open and starts nothing.
  {
    const offer = { k: "proposals" as const, text: "Two ways.", options: [{ title: "Canvass Crown Heights", why: "", steps: [{ by: "ob", action: "canvass" as const, district: 308 }], cost: 18000, order: "Door canvass in Crown Heights." }] };
    useStaff.setState({ chat: { fd: [offer] }, active: { fd: 123 } });
    pick("fd", 0, 0);
    const after = useStaff.getState().chat.fd[0];
    if (after.k === "proposals" && after.picked !== undefined) problems.push("option card: picked while the director was busy, so it was used up without running");
    useStaff.setState({ chat: {}, active: {} });
    report.push("option card: picking while the director is busy leaves it open");
  }

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
  // Through the clock, as a student plays: bookings on three days, then Skip. Each must run on its own day, inside
  // the daily limit, and none may be pushed to a later day as if its day were full (Devaj's review, item 1).
  {
    useCase.getState().restart();
    const c = currentCase(useCase.getState().caseId);
    useCase.setState({ at: 1, step: 1, picks: { [c.decisions[0].id]: { option: c.decisions[0].options[0].id } } });
    const start = useCase.getState().date;
    const d = (n: number) => new Date(Date.parse(start) + n * 86_400_000).toISOString().slice(0, 10);
    for (const n of [2, 3, 4]) useCase.getState().book({ date: d(n), kind: "doors", cd: 308, by: "sch" });
    // The clock asks the rival agents to plan, over the network; there is no server here, so count them as planned.
    useRivals.setState({ planned: { 1: true } });
    for (let i = 0; i < 6 && useCase.getState().date < d(4); i++) skip();
    const done = useCase.getState().bookings;
    const ran = useCase.getState().work.filter((x) => x.by === "candidate").map((x) => x.date);
    const want = [d(2), d(3), d(4)].join();
    if (ran.join() !== want) problems.push(`scheduling: through Skip, bookings for ${want} ran on ${ran.join() || "no day"}`);
    if (done.some((b) => b.done && /moves to tomorrow|Dropped/.test(b.done))) problems.push("scheduling: through Skip, a booking was pushed or dropped");
    report.push(`scheduling through Skip: bookings for three days ran on ${ran.length === 3 ? "their own days" : ran.join()}`);
  }
  // Never on or after election day (Devaj's review, item 2): with one day left nothing can be booked.
  {
    const c = currentCase(useCase.getState().caseId);
    const eve = new Date(Date.parse(c.electionDate) - 86_400_000).toISOString().slice(0, 10);
    const two = new Date(Date.parse(c.electionDate) - 2 * 86_400_000).toISOString().slice(0, 10);
    const at = (date: string) => { useCase.setState({ date }); return new RunCtx({ director: "cm", text: "Book", snapshot: snapshot(), history: [], budget: 500_000, runId: 11 }, () => {}); };
    const onEve = at(eve).act("sch", "schedule_event", { district: 308, kind: "doors" });
    if (onEve.ok) problems.push(`scheduling: on the eve of the election an event was booked (${onEve.text})`);
    const ctx = at(two), ev: string[] = [];
    const late = new RunCtx({ ...ctx.req }, (e) => { if (e.t === "action" && e.effect.booking) ev.push(e.effect.booking.date); });
    late.act("sch", "schedule_event", { district: 308, kind: "doors", on: c.electionDate });
    late.act("sch", "schedule_event", { district: 308, kind: "doors" });
    late.act("sch", "schedule_event", { district: 308, kind: "doors" });
    if (ev.some((x) => x >= c.electionDate)) problems.push(`scheduling: booked for ${ev.find((x) => x >= c.electionDate)}, on or after the election`);
    report.push(`scheduling near the end: nothing booked on the eve; two days out, ${ev.length} booked for the last day and the rest refused`);
  }
  report.push(`scheduling: 3 rallies asked for ${wanted} → booked on ${dates.join(", ")}; all happened, $${mine.reduce((a, x) => a + x.cost, 0).toLocaleString("en-US")} paid on the day (${texts[2].includes("full") ? "third moved: day was full" : "no day was full"})`);
  return { problems, report };
}
