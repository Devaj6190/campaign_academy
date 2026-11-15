// Whether the live agents can run: an API key is set on the server. The War room says so from the start, before any
// order has run. Nothing about the key itself is sent.
export function GET() {
  return Response.json({ live: !!process.env.ANTHROPIC_API_KEY });
}
