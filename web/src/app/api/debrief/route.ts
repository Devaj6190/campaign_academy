import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { caseOf, debriefFiles } from "@/lib/debrief/files";
import type { DebriefRequest, DebriefResponse } from "@/lib/debrief/types";

// The end-of-campaign debrief. Read only: it reads the campaign the browser sends and the case file, and writes
// nothing anywhere. With no API key, or on any failure, it says so and the screen keeps the plain debrief.

export const maxDuration = 300;

export async function POST(request: Request) {
  const req = (await request.json().catch(() => null)) as DebriefRequest | null;
  const c = req ? caseOf(req.caseId) : undefined;
  if (!req || !c || !Array.isArray(req.picks) || !Array.isArray(req.work) || !Array.isArray(req.staff)) return Response.json({ error: "Not a finished campaign" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ mode: "off" } satisfies DebriefResponse);
  try {
    const t0 = Date.now();
    const { runDebrief } = await import("@/lib/debrief/agent");
    const debrief = await runDebrief(c, debriefFiles(c, req), request.signal);
    console.log(`[debrief] written in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return Response.json({ mode: "live", debrief } satisfies DebriefResponse);
  } catch (err) {
    console.error("[debrief] failed, keeping the plain debrief:", err);
    return Response.json({ mode: "error" } satisfies DebriefResponse);
  } finally {
    // With LangSmith tracing on, send this run's trace before the function stops.
    await awaitAllCallbacks().catch(() => {});
  }
}
