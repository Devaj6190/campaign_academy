import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { DIRECTOR_MODEL } from "../staff/agents";
import { check, rulesDraft, type BudgetFacts, type Draft } from "./plan";

// Dana Whitfield, Finance Director, drafts the week's budget. The model chooses; check() makes it fit the
// money and the spending limit. Any failure falls back to the rules draft.

const Out = z.object({
  ads: z.number(),
  field: z.number(),
  events: z.number(),
  fundraising: z.array(z.string()).min(1).max(3),
  note: z.string(),
});

const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();

export async function propose(f: BudgetFacts): Promise<{ draft: Draft; mode: "live" | "rules" }> {
  const model = new ChatAnthropic({ model: DIRECTOR_MODEL, maxTokens: 2000, outputConfig: { effort: "low" } });
  const res = await model.invoke([
    {
      role: "system",
      content: `You are Dana Whitfield, Finance Director for Adrian Cole's (fictional) campaign for Mayor of New York City, in a nonpartisan teaching game. You draft the campaign's daily budgets for the coming week: ads, field and events, in dollars per day. Money in a daily budget that nobody uses that day is lost, so don't over-budget. Payroll is separate and fixed.
Your style: careful with money, trusts large donors, skeptical that small-dollar giving is worth the effort (but you follow the public financing rules). Be direct, two or three sentences, first person, no lists in the note.
Rules: the three budgets added together must not exceed maxPerDay in the facts. Use only numbers from the facts in your note, and write money as dollars with commas (e.g. $12,600). Suggest one to three concrete fundraising steps for the week (e.g. call time with a named donor list, a donor dinner, a house party in a district, a small-dollar email to a voter group).
Reply with JSON only: {"ads":n,"field":n,"events":n,"fundraising":["..."],"note":"..."}`,
    },
    { role: "user", content: JSON.stringify(f) },
  ]);
  const raw = text(res.content);
  const parsed = Out.safeParse(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
  if (!parsed.success) return { draft: rulesDraft(f), mode: "rules" };
  return { draft: check(f, parsed.data), mode: "live" };
}
