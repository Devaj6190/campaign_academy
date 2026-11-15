import { paperLive } from "@/lib/paper/model";
import { rulesStances, type StanceRequest } from "@/lib/paper/stances";
import { stancesLive } from "@/lib/paper/stancesLive";

// Three ways to answer the morning's lead story. Without a key, or on any failure, the rules' three.
export async function POST(request: Request) {
  const req = (await request.json()) as StanceRequest;
  if (!req.story?.trim()) return Response.json({ error: "No story" }, { status: 400 });
  if (!paperLive()) return Response.json(rulesStances(req));
  try {
    const t0 = Date.now();
    const out = await stancesLive(req);
    console.log(`[paper] stances (${out.by}) drafted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return Response.json(out);
  } catch (err) {
    console.error("[paper] stances failed, rules instead:", err);
    return Response.json(rulesStances(req));
  }
}
