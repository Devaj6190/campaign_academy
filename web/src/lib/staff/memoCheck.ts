import { run, skip } from "../cases/clock";
import { useRivals } from "../cases/rivals";
import { currentCase, useCase } from "../cases/store";
import { realPath } from "../cases/types";
import { rulesMemo, type Memo, type MemoRequest } from "./memo";
import { LEAD_DAYS, memoDay, setMemoWriter, useMemos, watchMemos } from "./memos";

// The staff memos, checked the way the game makes them (#41, item 8; review on #32). The clock runs through the whole
// campaign with Skip, taking the real campaign's choices, while the game's own watcher writes the memos and its own
// code builds each request; only the writer is swapped in. Each assertion can fail:
// 1. Every decision has its two memos by the time the campaign reaches it.
// 2. Each was written from the campaign as it stood within LEAD_DAYS of the decision's date, not months before.
// 3. No request carries any part of the record: what the real campaign did, what followed, what was said after.
// How often a memo lands on the real choice is reported, not judged: the option is assigned by rules (memo.ts).

const settle = () => new Promise((r) => setTimeout(r, 0));
const dateIn = (campaign: string) => campaign.match(/Today is (\d{4}-\d{2}-\d{2})/)?.[1] ?? "";

export async function checkMemos(write: (r: MemoRequest) => Promise<Memo>) {
  const problems: string[] = [], report: string[] = [];
  const c = currentCase(useCase.getState().caseId);
  const real = realPath(c);
  const sent: MemoRequest[] = [];
  setMemoWriter(async (r) => { sent.push(r); return write(r); });
  useCase.getState().restart();
  useMemos.setState({ byDecision: {} });
  // The rival agents plan over the network; there is no server here, so count every step as planned.
  useRivals.setState({ planned: Object.fromEntries(c.decisions.map((_, i) => [i + 1, true])) });
  const off = watchMemos();
  try {
    run();
    for (const [i, d] of c.decisions.entries()) {
      // Run the clock to this decision, as a student pressing Skip would.
      for (let k = 0; k < 400 && useCase.getState().at < i + 1; k++) { skip(); await settle(); }
      await settle();
      // Live memos take seconds to write; the game shows them as coming. The check waits up to a minute for them.
      for (let k = 0; k < 600 && useMemos.getState().byDecision[d.id]?.status === "writing"; k++) await new Promise((r) => setTimeout(r, 100));
      const entry = useMemos.getState().byDecision[d.id];
      if (!entry || entry.memos.length < 2) problems.push(`${d.id}: ${entry?.memos.length ?? 0} memos when the campaign reached the decision, not two`);
      const mine = sent.filter((r) => r.decision.id === d.id);
      for (const r of mine) {
        const on = dateIn(r.campaign);
        if (!on || on < memoDay(d.date) || on > d.date) problems.push(`${d.id}: ${r.director.id}'s memo was written from the campaign on ${on || "an unknown day"}, not within ${LEAD_DAYS} days of ${d.date}`);
        const body = JSON.stringify(r);
        const record = [...d.did, ...d.followed, ...d.saidAfter].map((x) => x.text).filter((t) => t.length >= 25);
        const leak = record.find((t) => body.includes(t));
        if (leak) problems.push(`${d.id}: ${r.director.id}'s request carries the record: "${leak.slice(0, 60)}…"`);
      }
      const on = [...new Set(mine.map((r) => dateIn(r.campaign)))].join(", ");
      report.push(`${d.id} (${d.date}): written from ${on || "nothing"}; ${(entry?.memos ?? []).map((m) => `${m.director} → ${m.option}${m.option === d.taken ? " (the real choice)" : ""}`).join(", ")}`);
      useCase.getState().decide(d.id, { option: real[d.id] ?? d.options[0].id });
      await settle();
    }
  } finally {
    off();
    setMemoWriter(null);
  }
  const byId = useMemos.getState().byDecision;
  const written = c.decisions.flatMap((d) => (byId[d.id]?.memos ?? []).map((m) => m.option === d.taken));
  report.push(`memos: ${written.length} written, ${written.filter(Boolean).length} on the real choice (assigned by rules; reported, not judged)`);
  useCase.getState().restart();
  return { problems, report };
}

export const checkMemosOffline = () => checkMemos(async (r) => rulesMemo(r));
