import { planLive, rulePlan, type PlanRequest } from "@/lib/engine/rivalAgent";

// One rival's moves for the coming stretch. Live agent when there is an API key; the rules otherwise, or if it fails.
export async function POST(request: Request) {
  const req = (await request.json()) as PlanRequest;
  const names = req.snapshot?.names ?? {};
  if (!req.who || !(req.who in names) || req.who === req.snapshot.me) return Response.json({ error: "Unknown rival" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json(rulePlan(req));
  try {
    const t0 = Date.now();
    const out = await planLive(req, request.signal);
    console.log(`[rivals] ${req.who} planned ${out.moves.length} moves in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return Response.json(out.moves.length ? out : { ...rulePlan(req), memo: out.memo });
  } catch (err) {
    console.error(`[rivals] ${req.who} live plan failed, using rules:`, err);
    return Response.json(rulePlan(req));
  }
}
