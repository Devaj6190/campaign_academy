import { photonReady, repliesFrom } from "@/lib/photon/server";

// The student's replies by text since `after` (ms), for the browser to turn into orders (#53).
export function GET(request: Request) {
  if (!photonReady()) return Response.json({ messages: [] });
  const u = new URL(request.url);
  const from = u.searchParams.get("from") ?? "";
  const after = Number(u.searchParams.get("after") ?? 0) || 0;
  if (!/^(\+[1-9]\d{7,14}|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(from)) return Response.json({ messages: [] }, { status: 400 });
  return Response.json({ messages: repliesFrom(from, after) });
}
