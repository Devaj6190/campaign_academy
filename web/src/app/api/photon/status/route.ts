import { photonReady } from "@/lib/photon/server";

// Whether this server can text the student (#53): the Photon project's keys are set. Nothing about the keys is sent.
export function GET() {
  return Response.json({ enabled: photonReady() });
}
