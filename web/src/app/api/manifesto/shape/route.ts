import { rulesShape, type ShapeRequest } from "@/lib/manifesto/rules";
import { shape } from "@/lib/manifesto/shape";

// Shape a plank. Without a key, or on any failure, a rules draft from the groups' listed values.
export async function POST(request: Request) {
  const req = (await request.json()) as ShapeRequest;
  const by = req.director ? "pol" : "staff";
  if (!req.idea?.trim()) return Response.json({ error: "Empty idea" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json(rulesShape(req, by));
  try {
    const t0 = Date.now();
    const out = await shape(req);
    console.log(`[manifesto] shaped by ${by} in ${((Date.now() - t0) / 1000).toFixed(1)}s (${out.mode})`);
    return Response.json(out);
  } catch (err) {
    console.error("[manifesto] shaping failed, rules draft:", err);
    return Response.json(rulesShape(req, by));
  }
}
