import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { numbersIn, type Story } from "./edition";
import { CANDIDATES, FRAMING } from "../scenario";

// The Ledger's newsroom: one fast call that turns the template stories into readable copy. It may only use
// numbers that appear in the facts; any story with a number that is not there keeps its template text.

const MODEL = "claude-haiku-5-5";

const StorySchema = z.object({ kicker: z.string(), headline: z.string(), body: z.string() });
const OutSchema = z.object({
  lead: StorySchema,
  campaign: StorySchema,
  opposition: StorySchema,
  city: z.array(StorySchema).min(1).max(3),
  editorial: StorySchema,
  letters: z.array(StorySchema).length(2),
});
export type Rewrite = z.infer<typeof OutSchema>;

export type WriteRequest = { facts: { stories: Rewrite; allowedNumbers: string[] } & Record<string, unknown> };
export type WriteResult = { stories: Partial<Rewrite> & { city?: (Story | null)[]; letters?: (Story | null)[] }; rejected: string[]; mode: "live" | "template" };

const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();

/** True when every number in the story is in the allowed list. */
export function honest(s: Story, allowed: Set<string>) {
  return numbersIn(`${s.kicker} ${s.headline} ${s.body}`).every((n) => allowed.has(n));
}

export async function write(req: WriteRequest): Promise<WriteResult> {
  const allowed = new Set(req.facts.allowedNumbers);
  const model = new ChatAnthropic({ model: MODEL, maxTokens: 4000, outputConfig: { effort: "low" } });
  const res = await model.invoke([
    {
      role: "system",
      content: `You are the newsroom of The Five Borough Ledger, a fictional New York City newspaper in a teaching simulation about running for mayor. The candidates are ${CANDIDATES.map((c) => c.name).join(", ")}. ${FRAMING} Never quote anyone.
House rules:
- Rewrite each story as lively, concrete newspaper copy. Headlines under 12 words. Bodies of 2 to 4 sentences.
- Use ONLY facts and numbers present in the facts JSON. Do not invent any number, quote, event or cause. Never claim that one specific action moved the polls by a specific amount.
- The editorial weighs all three candidates' stated positions fairly and endorses no one.
- Letters are written in the first person by an ordinary member of the named voter group; no names.
- Keep each story's subject; you may improve wording, not change what happened.
Reply with JSON only, same shape as "stories": {"lead":{kicker,headline,body},"campaign":{...},"opposition":{...},"city":[{...}x${req.facts.stories.city.length}],"editorial":{...},"letters":[{...},{...}]}.`,
    },
    { role: "user", content: JSON.stringify(req.facts) },
  ]);
  const raw = text(res.content);
  const parsed = OutSchema.safeParse(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
  if (!parsed.success) return { stories: {}, rejected: ["all (unparseable)"], mode: "template" };
  const out = parsed.data;
  const rejected: string[] = [];
  const keep = <T extends Story>(name: string, s: T | undefined) => {
    if (!s) return undefined;
    if (honest(s, allowed)) return s;
    rejected.push(`${name} (${numbersIn(`${s.kicker} ${s.headline} ${s.body}`).filter((n) => !allowed.has(n)).join(", ")})`);
    return undefined;
  };
  return {
    stories: {
      lead: keep("lead", out.lead),
      campaign: keep("campaign", out.campaign),
      opposition: keep("opposition", out.opposition),
      editorial: keep("editorial", out.editorial),
      city: out.city.map((s, i) => keep(`city ${i + 1}`, s) ?? null),
      letters: out.letters.map((s, i) => keep(`letter ${i + 1}`, s) ?? null),
    } as WriteResult["stories"],
    rejected,
    mode: "live",
  };
}
