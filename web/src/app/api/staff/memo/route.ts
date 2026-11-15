import { rulesMemo, type MemoRequest } from "@/lib/staff/memo";

// One director's memo on one case decision. Without a key, or on any failure, the rules' memo.
export async function POST(request: Request) {
  const req = (await request.json()) as MemoRequest;
  if (!req.decision?.options?.some((o) => o.id === req.option) || !req.director?.id) return Response.json({ error: "No decision or director" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json(rulesMemo(req));
  try {
    const t0 = Date.now();
    const { liveMemo } = await import("@/lib/staff/memoLive");
    const out = await liveMemo(req);
    console.log(`[memo] ${req.director.id} on ${req.decision.id} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return Response.json(out);
  } catch (err) {
    console.error("[memo] live memo failed, rules instead:", err);
    return Response.json(rulesMemo(req));
  }
}
