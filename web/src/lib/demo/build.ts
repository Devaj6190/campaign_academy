import { run, skip, waiting } from "../cases/clock";
import { useRivals } from "../cases/rivals";
import { currentCase, useCase } from "../cases/store";
import { realPath } from "../cases/types";
import { announce, usePaper } from "../paper/run";
import { resetAll, snapshot, type Save } from "../save";
import { useMemos, watchMemos } from "../staff/memos";
import { instruct } from "../staff/run";
import { speakUp, watch } from "../staff/speak";
import { useStaff } from "../staff/store";

// The demo start point (npm run demo:start): the campaign on May 22, 2013, the morning Weiner enters, played by the
// game's own rules with no API key. The first decision is made (the real choice), the staff have done a stretch of
// work, events are on the calendar, the rivals have moved, the paper has its archive, and the Weiner decision is
// waiting with its two memos. Saved in lib/save.ts's format, so it loads through the same restore() as any save.
//
// The game's network calls (/api/...) go straight to the route handlers here: with no key each one answers with its
// rules, as the deployed game does without one.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every staff run settled, and the bar animations' timers (up to 8 s for a misfit flash) past. */
async function settled() {
  await wait(50);
  for (let k = 0; k < 600 && Object.keys(useStaff.getState().active).length; k++) await wait(100);
  await wait(1500);
}

async function order(id: string, text: string) {
  await instruct(id, text);
  await settled();
}

/** Run the clock day by day, as Skip does, until `date` or the next decision; each morning with news puts the paper out and it is read. */
async function until(date: string) {
  for (let k = 0; k < 400 && useCase.getState().date < date && !waiting(); k++) {
    const r = skip();
    if (r === "event") { announce(); usePaper.setState({ unread: false }); }
    await speakUp();
    await settled();
  }
}

export async function buildDemo(): Promise<{ save: Save; problems: string[]; report: string[] }> {
  const c = currentCase(useCase.getState().caseId);
  const real = realPath(c);
  const first = c.decisions[0], weiner = c.decisions[1];
  resetAll();
  const offSpeak = watch(), offMemos = watchMemos();
  try {
    // The briefing, then the first decision: the real campaign's choice.
    run();
    useCase.getState().decide(first.id, { option: real[first.id] ?? first.options[0].id });
    await settled();

    await order("fin", "Run call time with our past donors this week");
    await order("fd", "Canvass Crown Heights this week with a $20,000 budget");
    await until("2013-03-04");
    await order("com", "Pitch reporters on the plan to tax incomes over $500,000 to pay for pre-K");
    await until("2013-04-08");
    await order("fd", "Knock doors in Harlem and the South Bronx this week. Under $25,000.");
    await until("2013-05-06");
    await order("fin", "Hold a fundraiser with labor donors this week");
    // A question, so the War room shows options waiting to be picked.
    await order("cm", "What should we be doing in Harlem right now?");
    await until(weiner.date);

    // The morning Weiner enters: two appearances on the calendar for the days ahead, and the memos in.
    // "Schedule" puts them on the calendar; with no key, "a rally in Harlem" alone would hold the rally at once.
    await order("cm", "Schedule the candidate for house parties in Park Slope and Harlem this week");
    await order("cm", "Schedule the candidate in Harlem and the South Bronx next week");
    for (let k = 0; k < 600 && useMemos.getState().byDecision[weiner.id]?.status !== "ready"; k++) await wait(100);
    await settled();
  } finally {
    offSpeak();
    offMemos();
  }
  // The card opens from "Decision waiting" when the presenter is ready, not on load.
  useCase.setState({ card: false, running: false });

  const s = useCase.getState();
  const problems: string[] = [];
  if (s.date !== weiner.date || s.at !== 2) problems.push(`the demo is on ${s.date} at step ${s.at}, not ${weiner.date} at step 2`);
  if (!s.picks[first.id]) problems.push("the first decision is not made");
  if (s.picks[weiner.id]) problems.push("the Weiner decision is already made");
  const staffWork = s.work.filter((w) => !c.candidates.some((x) => x.id === w.by && x.id !== c.follow));
  const rivalWork = s.work.filter((w) => c.candidates.some((x) => x.id === w.by && x.id !== c.follow));
  if (!staffWork.length) problems.push("no staff work is done");
  if (!s.bookings.some((b) => b.date > s.date)) problems.push("nothing is on the calendar after today");
  if (!rivalWork.length) problems.push(`no rival has moved (planned: ${JSON.stringify(useRivals.getState().planned)})`);
  if (!usePaper.getState().editions.length) problems.push("the paper has no editions");
  if ((useMemos.getState().byDecision[weiner.id]?.memos.length ?? 0) < 2) problems.push("the Weiner memos are not written");
  const save = snapshot();
  const report = [
    `${s.date}, step ${s.at}: ${Object.keys(s.picks).length} decision made`,
    `work: ${staffWork.length} staff entries, ${rivalWork.length} rival moves`,
    `calendar: ${s.bookings.map((b) => `${b.kind} on ${b.date}${b.done ? " (done)" : ""}`).join(", ")}`,
    `paper: ${usePaper.getState().editions.length} editions`,
    `chats: ${Object.entries(useStaff.getState().chat).map(([k, v]) => `${k} ${v.length}`).join(", ")}`,
    `memos for ${weiner.id}: ${useMemos.getState().byDecision[weiner.id]?.memos.map((m) => m.director).join(", ") ?? "none"}`,
    `save: ${Math.round(JSON.stringify(save).length / 1024)} KB`,
  ];
  return { save, problems, report };
}
