import { z } from "zod";
import { numbersIn, type Story } from "./edition";
import { jsonIn, writeJson, type Writer } from "./model";

// The Ledger's newsroom: one fast call that turns the simulated stories into readable copy, on Gemini when its key is
// set (lib/paper/model.ts, #52). It never sees the cited record, and it may only use numbers that appear in the facts:
// a story with any other number keeps its template.

const StorySchema = z.object({ headline: z.string(), body: z.string() });
const OutSchema = z.object({ campaign: StorySchema, rivals: StorySchema, voices: z.array(StorySchema).length(2) });

export type WriteRequest = { facts: { stories: z.infer<typeof OutSchema>; allowedNumbers: string[] } & Record<string, unknown> };
/** `by`: the model that wrote it, when one did. */
export type WriteResult = { stories: { campaign?: Story; rivals?: Story; voices?: (Story | null)[] }; rejected: string[]; mode: "live" | "template"; by?: Writer };

/** True when every number in the story is in the allowed list. */
export const honest = (s: Story, allowed: Set<string>) => numbersIn(`${s.headline} ${s.body}`).every((n) => allowed.has(n));

export async function write(req: WriteRequest): Promise<WriteResult> {
  const allowed = new Set(req.facts.allowedNumbers);
  const system = `You are the newsroom of The Five Borough Ledger, a fictional newspaper in a nonpartisan teaching app that replays the real 2013 Democratic primary for Mayor of New York from inside one campaign.
You rewrite three simulated items: what the student's campaign did, what the rival campaigns did (both from the simulation), and two letters from members of named voter groups.
House rules:
- The candidates are real people, but these events are simulated. Never invent a quote from a real person, an event, an endorsement or a cause. Keep each story's subject; improve wording only.
- Campaign staff are named only by their post (for example "the Field Director"), never by a personal name unless the facts give one.
- Use ONLY numbers present in the facts. Never claim that one action moved the polls by a specific amount.
- Write in the register of a broadsheet's metro desk: third person, past tense, who did what and where. No exclamation marks, rhetorical questions, slang, puns, hype or sports and war metaphors. Do not copy the facts' tallies (such as "Support +3.5"); describe the work instead.
- Headlines under 12 words, in sentence case, stating who did what, like a newspaper headline, not a slogan.
- Bodies of 2 to 3 sentences, plain and concrete.
- Letters read as letters to the editor: they open "To the editor:", are first person, measured and specific, by an ordinary member of the named group, no names, no endorsement.
Reply with JSON only: {"campaign":{"headline","body"},"rivals":{"headline","body"},"voices":[{"headline","body"},{"headline","body"}]}.`;
  let written;
  try {
    written = await writeJson(system, JSON.stringify(req.facts), 1500, (raw) => OutSchema.parse(jsonIn(raw)));
  } catch {
    return { stories: {}, rejected: ["all (no usable reply)"], mode: "template" };
  }
  const rejected: string[] = [];
  const keep = (name: string, s: Story) => {
    if (honest(s, allowed)) return s;
    rejected.push(`${name} (${numbersIn(`${s.headline} ${s.body}`).filter((n) => !allowed.has(n)).join(", ")})`);
    return undefined;
  };
  const out = written.out;
  return {
    stories: { campaign: keep("campaign", out.campaign), rivals: keep("rivals", out.rivals), voices: out.voices.map((s, i) => keep(`letter ${i + 1}`, s) ?? null) },
    rejected,
    mode: "live",
    by: written.by,
  };
}
