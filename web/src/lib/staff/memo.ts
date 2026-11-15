import type { Decision } from "../cases/types";
import { hash } from "../util";
import type { Staff } from "../data";

// Live staff memos before each case decision (issue #41, item 8; agreed by Devaj on #32). Two directors each argue
// for an option, from what has happened in the student's own campaign. They are the decision card's advisers (the
// case's fixed advisers were removed), labelled as the posts' simulated views, never the tool's advice.
//
// The record must not leak through them. The request is built from what the student sees at that moment and nothing
// else: never `taken`, `did`, `followed` or `saidAfter`. That is not enough on its own: the model knows 2013 and
// recognises the real choice from the options themselves (left to choose, it picked the real one on all six decisions).
// So the model never chooses. Each director is assigned an option by a fixed rotation (assign below), which knows
// nothing of 2013; the second is assigned a different one. The model writes the case, from its post's point of view.

export type MemoOption = { id: string; label: string; detail: string; up: string[]; down: string[] };
export type MemoRequest = {
  decision: { id: string; date: string; title: string; situation: string[]; constraints: string; options: MemoOption[] };
  director: Pick<Staff, "id" | "role" | "name" | "onRecord" | "good" | "weak">;
  voice: string;
  /** The campaign as the director reads it today (lib/staff/agents world()). */
  campaign: string;
  memory: string[];
  /** The option the other director already argued for: this one must argue for another. */
  /** The option this director argues for, assigned by `assign()`. The model writes the case for it; it never picks. */
  option: string;
};
/** `headline`: the recommendation in a few words; `text`: the case for it in a sentence or two. Older saves have no headline. */
export type Memo = { director: string; option: string; headline?: string; text: string; mode: "live" | "rules" };

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

/** Without a model: what each post says for the option it was given. */
const WHY: Record<string, string> = {
  fin: "It protects the money we will need at the end, and the close is where races are won.",
  fd: "It moves the voter groups we can still win, and that is where the votes are.",
  com: "It gives us a story that moves the poll, and right now we need to be heard.",
  cm: "On balance it gains the most for what it costs us.",
  pol: "It is the position we can defend on substance for the rest of the race.",
};

/**
 * The option a post argues for. Not chosen from the cards' up and down chips: those were fitted to the record, so
 * scoring them sent the first memo to the real choice at four of six decisions (Devaj's review). A fixed rotation by
 * decision and post instead, the same on every run, never the option the other director already took.
 */
export function assign(decision: string, post: string, options: MemoOption[], against?: string): string {
  const open = options.filter((o) => o.id !== against);
  if (!open.length) return options[0].id;
  const seed = [...`${decision}:${post}`].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return open[Math.floor(hash(seed, open.length) * open.length)].id;
}

export function rulesMemo(r: MemoRequest): Memo {
  const o = r.decision.options.find((x) => x.id === r.option) ?? r.decision.options[0];
  return { director: r.director.id, option: o.id, headline: `Go with "${o.label}"`, text: WHY[r.director.id] ?? WHY.cm, mode: "rules" };
}

/** Words that would mean a memo knows what came after its date: later years, the election, how the race ended. */
export const HINDSIGHT = /\b(201[4-9]|20[2-9]\d|won the (primary|race|nomination|election)|lost the (primary|race|election)|went on to|ended up|in the end|turned out|election night|september 10|primary night|landslide|mayor de blasio|in real life|in reality|in the real (race|campaign|world|primary|election)|the real race|historically|came from behind|beat (joe )?lhota|became mayor|was elected|won outright|won it)\b/i;

/**
 * The text with every sentence that reaches past the case's date taken out: how the real race went, who won, what came
 * later. The staff work from the campaign's own date and the student plays it out; the debrief tells the record.
 */
export const withoutHindsight = (text: string) => text.split(/(?<=[.!?])\s+/).filter((s) => !HINDSIGHT.test(s)).join(" ").trim();
