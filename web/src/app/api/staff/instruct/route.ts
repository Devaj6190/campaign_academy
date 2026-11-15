import { profileOf } from "@/lib/engine/resolve";
import { runOffline, runSteps } from "@/lib/staff/offline";
import { RunCtx, type RunEvent, type RunRequest } from "@/lib/staff/protocol";

// One instruction to one director. Streams the run as newline-delimited JSON so the war room can show the work
// travelling down the hierarchy and back up as it happens.

export async function POST(request: Request) {
  const req = (await request.json()) as RunRequest;
  const me = req.snapshot?.staff?.find((s) => s.id === req.director);
  if (!me?.name || !req.text?.trim()) return Response.json({ error: "Unknown staffer or empty instruction" }, { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const emit = (e: RunEvent) => {
        if (open) controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      };
      const ctx = new RunCtx(req, emit);
      try {
        if (req.steps?.length) {
          // A picked option: its steps were set and priced when it was offered, so they run as they are.
          const live = !!process.env.ANTHROPIC_API_KEY;
          const w = req.snapshot;
          const say = live
            ? async (results: string[]) => {
                const { wrapUp } = await import("@/lib/staff/chatter");
                return wrapUp({ name: `the ${me.role}`, campaign: `${w.candidate}'s campaign in ${w.race}`, voice: profileOf(w, me.id).voice, option: req.text, results });
              }
            : undefined;
          await runSteps(ctx, live ? "live" : "offline", say);
        } else if (process.env.ANTHROPIC_API_KEY) {
          try {
            const { runLive } = await import("@/lib/staff/agents");
            await runLive(ctx, request.signal);
            if (!ctx.reported) ctx.report(ctx.effects.length ? "Done. The details are in the receipts above." : "I couldn't get anything done on that.", null, "");
            emit({ t: "done" });
          } catch (err) {
            if (request.signal.aborted) throw err;
            console.error("[staff] live run failed, finishing offline:", err);
            // Nothing spent yet: run the whole thing in the simulation. Otherwise just close out what happened.
            if (!ctx.effects.length) {
              emit({ t: "error", text: "The live agent hit an error, so this run is simulated." });
              await runOffline(ctx);
            } else {
              ctx.report(`Partly done before something broke. Spent $${ctx.spent.toLocaleString("en-US")}.`, null, "");
              emit({ t: "done" });
            }
          }
        } else {
          await runOffline(ctx);
        }
      } catch {
        // Client went away; nothing to tell it.
      } finally {
        open = false;
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
