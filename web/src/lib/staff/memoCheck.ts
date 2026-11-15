import { CASES } from "../cases/index";
import { useCase } from "../cases/store";
import { realPath } from "../cases/types";
import { useGame } from "../store";
import { profileOf } from "../engine/resolve";
import { assign, HINDSIGHT, memoDecision, rulesMemo, WRITERS, type Memo, type MemoRequest } from "./memo";
import { snapshot } from "./run";
import { describeWorld } from "./world";

// The memo test Devaj asked for (#32): memos must not simply land on what the real campaign chose.
// For every decision, two directors write as the game would at that point, playing the real campaign's earlier
// choices. The model never picks the option (memo.ts assign); this checks that what is written keeps to it, that the
// two disagree, that no part of the record is in the request, and that no memo reaches past its date.
// Before the options were assigned, a model left to choose landed on the real choice on all six decisions.

const RECORD = ["taken", "did", "followed", "saidAfter", "advice"];

export async function checkMemos(write: (r: MemoRequest) => Promise<Memo>) {
  const problems: string[] = [], report: string[] = [];
  const c = CASES[0];
  const real = realPath(c);
  let anyOnReal = 0, total = 0, late = 0;
  for (const [i, d] of c.decisions.entries()) {
    useCase.getState().restart();
    const picks = Object.fromEntries(c.decisions.slice(0, i).map((x) => [x.id, { option: real[x.id] ?? x.options[0].id, why: "" }]));
    useCase.setState({ at: i + 1, step: i + 1, date: d.date, picks });
    const w = snapshot();
    const decision = memoDecision(d);
    const leaked = RECORD.filter((k) => k in decision);
    if (leaked.length) problems.push(`${d.id}: the memo request carries part of the record (${leaked.join(", ")})`);
    const staff = useGame.getState().staff;
    const writers = [...new Set([...WRITERS[d.skill], "cm", "com", "fd", "fin"])].map((id) => staff.find((p) => p.id === id && p.name)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 2);
    const memos: Memo[] = [];
    for (const p of writers) {
      const first = memos[0];
      const option = assign(p.id, decision.options, first?.option);
      const m = await write({ option, decision, director: { id: p.id, role: p.role, name: p.name, onRecord: p.onRecord, good: p.good, weak: p.weak }, voice: profileOf(w, p.id).voice, campaign: describeWorld(w), memory: [], against: first ? { option: first.option, who: `the ${staff.find((x) => x.id === first.director)?.role}` } : undefined });
      if (m.option !== option) problems.push(`${d.id}: ${p.id} was assigned ${option} but argued for ${m.option}`);
      if (HINDSIGHT.test(m.text)) { late++; problems.push(`${d.id}: ${p.id}'s memo reaches past ${d.date}: "${m.text.match(HINDSIGHT)?.[0]}"`); }
      memos.push(m);
    }
    if (memos.length === 2 && memos[0].option === memos[1].option) problems.push(`${d.id}: both memos argue for the same option`);
    if (memos.some((m) => !d.options.some((o) => o.id === m.option))) problems.push(`${d.id}: a memo argues for an option that does not exist`);
    total += memos.length;
    anyOnReal += memos.filter((m) => m.option === d.taken).length;
    report.push(`${d.id}: ${memos.map((m) => `${m.director} → ${m.option}${m.option === d.taken ? " (the real choice)" : ""}`).join(", ")}${write === offlineWriter ? "" : `\n    ${memos.map((m) => `${m.director}: ${m.text}`).join("\n    ")}`}`);
  }
  const n = c.decisions.length;
  report.push(`memos: options assigned by the rules, never the model; ${anyOnReal} of ${total} land on the real choice; ${late} reach past their date (${n} decisions)`);
  if (anyOnReal > total / 2) problems.push(`memos: more than half of all memos landed on the real choice (${anyOnReal} of ${total})`);
  useCase.getState().restart();
  return { problems, report };
}

const offlineWriter = async (r: MemoRequest) => rulesMemo(r);
export const checkMemosOffline = () => checkMemos(offlineWriter);
