import { propose } from "@/lib/money/dana";
import { rulesDraft, type BudgetFacts } from "@/lib/money/plan";

// Dana's budget proposal. Without a key, or on any failure, the rules draft.
export async function POST(request: Request) {
  const { facts } = (await request.json()) as { facts: BudgetFacts };
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ draft: rulesDraft(facts), mode: "rules" });
  try {
    const t0 = Date.now();
    const out = await propose(facts);
    console.log(`[money] Dana's day ${facts.day} budget in ${((Date.now() - t0) / 1000).toFixed(1)}s (${out.mode})`);
    return Response.json(out);
  } catch (err) {
    console.error("[money] Dana failed, rules draft:", err);
    return Response.json({ draft: rulesDraft(facts), mode: "rules" });
  }
}
