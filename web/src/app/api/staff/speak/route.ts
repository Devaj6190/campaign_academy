import { speak, type SpeakRequest } from "@/lib/staff/chatter";

export async function POST(request: Request) {
  const body = (await request.json()) as SpeakRequest;
  return Response.json(await speak(body));
}
