import { photonReady, sendText } from "@/lib/photon/server";

// One text from the staff's line to the number the student entered (#53).
// A handle iMessage knows: a phone in E.164, or an email.
const E164 = /^(\+[1-9]\d{7,14}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export async function POST(request: Request) {
  if (!photonReady()) return Response.json({ ok: false, error: "Photon is not set up on this server" }, { status: 503 });
  const { to, text, thread } = (await request.json().catch(() => ({}))) as { to?: string; text?: string; thread?: boolean };
  if (!to || !E164.test(to) || !text?.trim()) return Response.json({ ok: false, error: "A number like +15551234567 and a text are needed" }, { status: 400 });
  try {
    await sendText(to, text.trim().slice(0, 1500), !!thread);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[photon] send failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    // Free and Pro Photon projects text only numbers registered as the project's users.
    const error = /target not allowed/i.test(msg)
      ? "Photon only texts numbers added as users of the project: add this number under Users at app.photon.codes, then try again."
      : msg.slice(0, 200) || "send failed";
    return Response.json({ ok: false, error }, { status: 502 });
  }
}
