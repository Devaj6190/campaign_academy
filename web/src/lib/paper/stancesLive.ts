import { z } from "zod";
import { jsonIn, writeJson } from "./model";
import { clean, GROUPS, type StanceRequest, type StanceResult } from "./stances";

// The comms shop drafts three ways to answer the morning's lead story. The model names the groups each stance
// reaches or puts off; code sizes what it does. On Gemini when its key is set (lib/paper/model.ts, #52).

const Out = z.object({
  stances: z.array(z.object({ label: z.string().min(3).max(60), says: z.string().min(10).max(300), helps: z.array(z.string()), annoys: z.array(z.string()) })).length(3),
});

export async function stancesLive(req: StanceRequest): Promise<StanceResult> {
  const system = `You work in the communications shop of ${req.candidate}'s campaign in the 2013 Democratic primary for Mayor of New York, inside a nonpartisan teaching app.
This morning's lead story is below. Draft THREE genuinely different ways the campaign could answer it the same day.
Rules:
- "label": 2 to 6 words naming the approach. "says": one sentence describing what the campaign says, in the third person ("The campaign..."). Never write a quotation and never put words in a real person's mouth.
- Stay consistent with the candidate's record given below. Invent no facts, numbers, endorsements or events.
- Each stance must cost something: "helps" lists 1 to 3 voter groups it is likely to win over, "annoys" lists 1 to 3 it is likely to put off, judged from who the group is, what it is likely to value and its poll line. Use only these ids:
${GROUPS.map((g) => `${g.id} (${g.name}${g.values?.length ? `; values: ${g.values.join(", ")}` : ""}${g.dislikes?.length ? `; dislikes: ${g.dislikes.join(", ")}` : ""}${g.poll ? `; poll: ${g.poll}` : ""})`).join("\n")}
Reply with JSON only: {"stances":[{"label","says","helps":[ids],"annoys":[ids]} x3]}.`;
  // A reply is usable only with three stances that each reach someone; otherwise the next model, then the rules, try.
  const usable = (raw: string) => {
    const stances = Out.parse(jsonIn(raw)).stances.map(clean).filter((s) => s.helps.length);
    if (stances.length < 3) throw new Error("fewer than three usable stances");
    return stances;
  };
  const { out, by } = await writeJson(system, JSON.stringify({ story: req.story, candidateRecord: req.record }), 1200, usable);
  return { stances: out, mode: "live", by };
}
