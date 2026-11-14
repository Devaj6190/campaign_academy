import { candidates } from "@/lib/staff/chatter";

export async function POST(request: Request) {
  const { role, context } = (await request.json()) as { role: string; context: string };
  return Response.json(await candidates(role, context ?? ""));
}
