import { photonReady, sendText } from "@/lib/photon/server";

// One text from the staff's line to the number the student entered (#53).
const E164 = /^\+[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  if (!photonReady()) return Response.json({ ok: false, error: "Photon is not set up on this server" }, { status: 503 });
  const { to, text, thread } = (await request.json().catch(() => ({}))) as { to?: string; text?: string; thread?: boolean };
  if (!to || !E164.test(to) || !text?.trim()) return Response.json({ ok: false, error: "A number like +15551234567 and a text are needed" }, { status: 400 });
  try {
    await sendText(to, text.trim().slice(0, 1500), !!thread);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[photon] send failed:", err);
    return Response.json({ ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "send failed" }, { status: 502 });
  }
}
