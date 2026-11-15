import type { Decision } from "../cases/types";
import type { Staff } from "../data";

// Live staff memos before each case decision (issue #41, item 8; agreed by Devaj on #32). Two directors each argue
// for an option, from what has happened in the student's own campaign. Shown beside the fixed predicted advisers, not
// in their place, and labelled as the post's simulated view, never the tool's advice.
//
// The record must not leak through them. The request is built from what the student sees at that moment and nothing
// else: never `taken`, `did`, `followed` or `saidAfter`. That is not enough on its own: the model knows 2013 and
// recognises the real choice from the options themselves (left to choose, it picked the real one on all six decisions;
// npm run check:memos). So the model never chooses. Each director is assigned the option its post's interests favour,
// by the rules below, which know nothing of 2013; the second is assigned a different one. The model writes the case.

export type MemoOption = { id: string; label: string; detail: string; up: string[]; down: string[] };
export type MemoRequest = {
  decision: { id: string; date: string; title: string; situation: string[]; constraints: string; options: MemoOption[] };
  director: Pick<Staff, "id" | "role" | "name" | "onRecord" | "good" | "weak">;
  voice: string;
  /** The campaign as the director reads it today (lib/staff/agents world()). */
  campaign: string;
  memory: string[];
  /** The option the other director already argued for: this one must argue for another. */
  against?: { option: string; who: string };
  /** The option this director argues for, assigned by `assign()`. The model writes the case for it; it never picks. */
  option: string;
};
export type Memo = { director: string; option: string; text: string; mode: "live" | "rules" };

/** What a memo may be told about a decision: what the student sees on the card, and no part of the record. */
export function memoDecision(d: Decision): MemoRequest["decision"] {
  return {
    id: d.id,
    date: d.date,
    title: d.title,
    situation: d.situation.map((x) => x.text),
    constraints: [`${d.constraints.daysLeft} days to the primary`, ...(d.constraints.notes ?? [])].join("; "),
    options: d.options.map((o) => ({ id: o.id, label: o.label, detail: o.detail, up: o.preview.up, down: o.preview.down })),
  };
}

/** The two posts that write for a kind of decision, in order. Vacant posts are skipped by the caller. */
export const WRITERS: Record<Decision["skill"], string[]> = {
  delegating: ["cm", "com", "fd"],
  budgeting: ["fin", "cm", "com"],
  "voter-groups": ["fd", "com", "cm"],
  policy: ["pol", "com", "cm"],
};

/** Without a model: each post weighs the options by what it cares about, from the directions the card shows. */
const CARES: Record<string, (o: MemoOption) => number> = {
  fin: (o) => -3 * o.down.filter((x) => /money/i.test(x)).length + o.up.filter((x) => /money/i.test(x)).length * 2 + 0.5 * o.up.length,
  fd: (o) => o.up.filter((x) => !/money|poll/i.test(x)).length * 2 - o.down.filter((x) => !/money/i.test(x)).length,
  com: (o) => (o.up.some((x) => /poll/i.test(x)) ? 3 : 0) + o.up.length - o.down.filter((x) => !/money/i.test(x)).length,
  cm: (o) => o.up.length - o.down.length,
  pol: (o) => o.up.length - 0.5 * o.down.length,
};
const WHY: Record<string, string> = {
  fin: "It protects the money we will need at the end, and the close is where races are won.",
  fd: "It moves the voter groups we can still win, and that is where the votes are.",
  com: "It gives us a story that moves the poll, and right now we need to be heard.",
  cm: "On balance it gains the most for what it costs us.",
  pol: "It is the position we can defend on substance for the rest of the race.",
};

/** The option a post argues for: the one its interests favour, never the one the other director already took. */
export function assign(post: string, options: MemoOption[], against?: string): string {
  const score = CARES[post] ?? CARES.cm;
  const open = options.filter((o) => o.id !== against);
  return ([...open].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0] ?? options[0]).id;
}

export function rulesMemo(r: MemoRequest): Memo {
  const o = r.decision.options.find((x) => x.id === r.option) ?? r.decision.options[0];
  const differ = r.against ? ` I see it differently from ${r.against.who}.` : "";
  return { director: r.director.id, option: o.id, text: `I would go with "${o.label}". ${WHY[r.director.id] ?? WHY.cm}${differ}`, mode: "rules" };
}

/** Words that would mean a memo knows what came after its date: later years, the election, how the race ended. */
export const HINDSIGHT = /\b(201[4-9]|20[2-9]\d|won the (primary|race|nomination)|lost the (primary|race)|went on to|ended up|in the end|turned out|election night|september 10|primary night|landslide|mayor de blasio)\b/i;
