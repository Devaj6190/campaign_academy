import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { STAFF_MODEL } from "../staff/agents";
import { numbersIn, type Story } from "./edition";

// The Ledger's newsroom: one fast call that turns the simulated stories into readable copy. It never sees the cited
// record, and it may only use numbers that appear in the facts: a story with any other number keeps its template.

const StorySchema = z.object({ headline: z.string(), body: z.string() });
const OutSchema = z.object({ campaign: StorySchema, rivals: StorySchema, voices: z.array(StorySchema).length(2) });

export type WriteRequest = { facts: { stories: z.infer<typeof OutSchema>; allowedNumbers: string[] } & Record<string, unknown> };
export type WriteResult = { stories: { campaign?: Story; rivals?: Story; voices?: (Story | null)[] }; rejected: string[]; mode: "live" | "template" };

const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();

/** True when every number in the story is in the allowed list. */
export const honest = (s: Story, allowed: Set<string>) => numbersIn(`${s.headline} ${s.body}`).every((n) => allowed.has(n));

export async function write(req: WriteRequest): Promise<WriteResult> {
  const allowed = new Set(req.facts.allowedNumbers);
  const model = new ChatAnthropic({ model: STAFF_MODEL, maxTokens: 1500, outputConfig: { effort: "low" } });
  const res = await model.invoke([
    {
      role: "system",
      content: `You are the newsroom of The Five Borough Ledger, a fictional newspaper in a nonpartisan teaching app that replays the real 2013 Democratic primary for Mayor of New York from inside one campaign.
You rewrite three simulated items: what the student's campaign did, what the rival campaigns did (both from the simulation), and two letters from members of named voter groups.
House rules:
- The candidates are real people, but these events are simulated. Never invent a quote from a real person, an event, an endorsement or a cause. Keep each story's subject; improve wording only.
- Campaign staff are named only by their post (for example "the Field Director"), never by a personal name unless the facts give one.
- Use ONLY numbers present in the facts. Never claim that one action moved the polls by a specific amount.
- Headlines under 12 words. Bodies of 2 to 3 sentences, plain and concrete.
- Letters are first person, by an ordinary member of the named group, no names, no endorsement.
Reply with JSON only: {"campaign":{"headline","body"},"rivals":{"headline","body"},"voices":[{"headline","body"},{"headline","body"}]}.`,
    },
    { role: "user", content: JSON.stringify(req.facts) },
  ]);
  const raw = text(res.content);
  let parsed;
  try {
    parsed = OutSchema.safeParse(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
  } catch {
    return { stories: {}, rejected: ["all (unparseable)"], mode: "template" };
  }
  if (!parsed.success) return { stories: {}, rejected: ["all (wrong shape)"], mode: "template" };
  const rejected: string[] = [];
  const keep = (name: string, s: Story) => {
    if (honest(s, allowed)) return s;
    rejected.push(`${name} (${numbersIn(`${s.headline} ${s.body}`).filter((n) => !allowed.has(n)).join(", ")})`);
    return undefined;
  };
  const out = parsed.data;
  return {
    stories: { campaign: keep("campaign", out.campaign), rivals: keep("rivals", out.rivals), voices: out.voices.map((s, i) => keep(`letter ${i + 1}`, s) ?? null) },
    rejected,
    mode: "live",
  };
}
