import { paperLive } from "@/lib/paper/model";
import { write, type WriteRequest } from "@/lib/paper/newsroom";

// Rewrite one edition's simulated stories, on Gemini or Claude (lib/paper/model). Without a key, or on any failure, the
// template copy stands.
export async function POST(request: Request) {
  const req = (await request.json()) as WriteRequest;
  if (!req.facts?.stories) return Response.json({ error: "No stories" }, { status: 400 });
  if (!paperLive()) return Response.json({ stories: {}, rejected: [], mode: "template" });
  try {
    const t0 = Date.now();
    const out = await write(req);
    console.log(`[paper] newsroom (${out.by ?? "template"}) wrote in ${((Date.now() - t0) / 1000).toFixed(1)}s${out.rejected.length ? `; kept the template for ${out.rejected.join("; ")}` : ""}`);
    return Response.json(out);
  } catch (err) {
    console.error("[paper] newsroom failed, template stands:", err);
    return Response.json({ stories: {}, rejected: [], mode: "template" });
  }
}
