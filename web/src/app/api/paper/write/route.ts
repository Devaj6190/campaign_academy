import { write, type WriteRequest } from "@/lib/paper/newsroom";

// Rewrite an edition's stories with the AI newsroom. Without a key, or on any failure, the template stands.
export async function POST(request: Request) {
  const req = (await request.json()) as WriteRequest;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ stories: {}, rejected: [], mode: "template" });
  try {
    const t0 = Date.now();
    const out = await write(req);
    console.log(`[paper] day ${String(req.facts.day)} written in ${((Date.now() - t0) / 1000).toFixed(1)}s; kept template for: ${out.rejected.join(", ") || "none"}`);
    return Response.json(out);
  } catch (err) {
    console.error("[paper] newsroom failed, keeping template:", err);
    return Response.json({ stories: {}, rejected: ["all (error)"], mode: "template" });
  }
}
