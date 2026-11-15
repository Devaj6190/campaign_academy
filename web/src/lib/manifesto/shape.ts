import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { DIRECTOR_MODEL, STAFF_MODEL } from "../staff/agents";
import { rulesShape, type ShapeRequest, type Shaped } from "./rules";

// Turn the student's rough idea into a concrete, realistic plank and name who it serves and who it costs, judged
// from who each voter group is, what it is likely to value, and the poll line given for it where one exists.
// The model names; code (rules.ts) sizes the effect. A filled Policy Director post shapes it on the stronger model
// and in that post's voice; otherwise it is a generic staff draft. From feat/combined, adapted to the case.

const Out = z.object({
  text: z.string().min(10).max(900),
  serves: z.array(z.object({ faction: z.string(), why: z.string() })).max(3),
  offends: z.array(z.object({ faction: z.string(), why: z.string() })).max(3),
  tradeoff: z.string(),
});

const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();

export async function shape(req: ShapeRequest): Promise<Shaped> {
  const by = req.director ? "pol" : "staff";
  const model = new ChatAnthropic({ model: req.director ? DIRECTOR_MODEL : STAFF_MODEL, maxTokens: 1500, outputConfig: { effort: "low" } });
  const who = req.director
    ? `You are ${req.director.name} for ${req.candidate}'s campaign. ${req.director.voice}`
    : `You are a generalist staffer on ${req.candidate}'s campaign, drafting policy because the Policy Director post is vacant. Your drafts are workable but less precise than an expert's.`;
  const res = await model.invoke([
    {
      role: "system",
      content: `${who} ${req.framing}
Turn the campaigner's rough idea into ONE concrete, realistic plank for a New York City mayoral platform: what it does, roughly how, and how it is paid for or phased in. One or two sentences (under 60 words), plain language, no slogans.
Then say which voter groups it serves and which it costs, using ONLY the group ids given. Judge from who each group is, the values and dislikes listed for it (these are inferred, and may be empty), and its poll line where one is given (that is real 2013 data and outweighs inference). Be honest: most real policies cost someone. At most three each; a group cannot be in both lists. Do not assign a view to a group on the strength of race, religion or gender alone; use those groups only where a poll line supports it.
Never attribute statements or positions to real people. Do not invent statistics.
Reply with JSON only: {"text":"...","serves":[{"faction":"id","why":"..."}],"offends":[{"faction":"id","why":"..."}],"tradeoff":"one sentence on the main trade-off"}`,
    },
    { role: "user", content: JSON.stringify({ idea: req.idea, groups: req.factions, currentPlatform: req.planks }) },
  ]);
  const raw = text(res.content);
  const parsed = Out.safeParse(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
  if (!parsed.success) {
    console.warn("[manifesto] unusable draft, rules instead:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    return rulesShape(req, by);
  }
  const ids = new Set(req.factions.map((f) => f.id));
  const serves = parsed.data.serves.filter((r) => ids.has(r.faction));
  const offends = parsed.data.offends.filter((r) => ids.has(r.faction) && !serves.some((s) => s.faction === r.faction));
  return { text: parsed.data.text, serves, offends, tradeoff: parsed.data.tradeoff, mode: "live", by };
}
