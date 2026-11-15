import { photonReady, whoSent } from "@/lib/photon/server";

// Linking a phone (#53): who texted the line this join code ("JOIN 4821")? Photon's free lines are inbound-first,
// so the student texts the line and the phone that sent the code is theirs.
export function GET(request: Request) {
  if (!photonReady()) return Response.json({ from: null });
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!/^JOIN \d{4}$/i.test(code)) return Response.json({ from: null }, { status: 400 });
  return Response.json({ from: whoSent(code) });
}
