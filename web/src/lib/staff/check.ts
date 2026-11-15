import { useCase } from "../cases/store";
import { isQuestion, runOffline } from "./offline";
import { RunCtx, type RunEvent } from "./protocol";
import { BASE_BUDGET, snapshot } from "./run";

// Checks on the staff agents that need no API key (issue #41). Run with `npm run check:staff`.
// 1. An order and a question are told apart from their wording (the rules fallback; live agents decide themselves).
// 2. With no key, a question to any director gets two or three options and spends nothing; an order does work.

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

async function offline(director: string, text: string) {
  const events: RunEvent[] = [];
  const ctx = new RunCtx({ director, text, snapshot: snapshot(), history: [], budget: BASE_BUDGET, runId: 1 }, (e) => events.push(e));
  await runOffline(ctx, 0);
  return { events, spent: ctx.spent };
}

export async function checkStaff(): Promise<{ problems: string[]; report: string[] }> {
  const problems: string[] = [], report: string[] = [];
  for (const t of ORDERS) if (isQuestion(t)) problems.push(`read as a question, but it is an order: "${t}"`);
  for (const t of QUESTIONS) if (!isQuestion(t)) problems.push(`read as an order, but it is a question: "${t}"`);
  report.push(`wording: ${ORDERS.length} orders and ${QUESTIONS.length} questions checked`);

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
  return { problems, report };
}
