import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { genericPool, POOL, type Candidate } from "./roster";
import { FRAMING, MY_CAMPAIGN } from "../scenario";

// Short single calls: a staffer speaking up unprompted, and a shortlist of people to hire.

const MODEL = "claude-haiku-5-5";
const model = () => new ChatAnthropic({ model: MODEL, maxTokens: 2000, outputConfig: { effort: "low" } });
const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();
const live = () => !!process.env.ANTHROPIC_API_KEY;

export type SpeakRequest = { name: string; role: string; voice: string; situation: string; context: string; fallback: { text: string; suggest: string } };

export async function speak(r: SpeakRequest): Promise<{ text: string; suggest: string; mode: "live" | "offline" }> {
  if (!live()) return { ...r.fallback, mode: "offline" };
  try {
    const res = await model().invoke([
      { role: "system", content: `You are ${r.name}, ${r.role} on ${MY_CAMPAIGN} for mayor. ${FRAMING} Voice: ${r.voice}` },
      { role: "user", content: `Something your boss should hear about, unprompted:\n${r.situation}\n\nCampaign state: ${r.context}\n\nWrite exactly two lines.\nLine 1: what you say to your boss, under 35 words, in your voice, no greeting.\nLine 2: SUGGEST: a short instruction (under 12 words) your boss could give you to act on it.` },
    ]);
    const lines = text(res.content).split("\n").map((l) => l.trim()).filter(Boolean);
    const suggest = lines.find((l) => /^suggest:/i.test(l))?.replace(/^suggest:\s*/i, "") ?? r.fallback.suggest;
    const said = lines.find((l) => !/^suggest:/i.test(l)) ?? r.fallback.text;
    return { text: said.replace(/^["']|["']$/g, ""), suggest, mode: "live" };
  } catch (err) {
    console.error("[staff] speak failed:", err);
    return { ...r.fallback, mode: "offline" };
  }
}

const CandidateSchema = z.object({
  name: z.string(),
  pitch: z.string(),
  good: z.string(),
  weak: z.string(),
  salary: z.number(),
  cost: z.number(),
  effect: z.number(),
  voice: z.string(),
});

export async function candidates(role: string, context: string): Promise<{ list: Candidate[]; mode: "live" | "offline" }> {
  const fallback = POOL[role] ?? genericPool(role);
  if (!live()) return { list: fallback, mode: "offline" };
  try {
    const res = await model().invoke([
      { role: "system", content: "You write fictional job candidates for a nonpartisan campaign-management teaching game. Every person is invented." },
      {
        role: "user",
        content: `The campaign is hiring a ${role}. ${context}
Write three distinct candidates with real trade-offs (one experienced and expensive, one cheap and green, one brilliant but risky, or similar).
Return only a JSON array of three objects with keys: name, pitch (one sentence), good (3-5 words), weak (3-5 words), salary (dollars per day, 350-1500), cost (0.85-1.25, how much their work costs relative to normal), effect (0.9-1.25, how well their work lands), voice (how they talk, under 10 words).`,
      },
    ]);
    const raw = text(res.content);
    const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
    const parsed = z.array(CandidateSchema).length(3).safeParse(JSON.parse(json));
    if (!parsed.success) return { list: fallback, mode: "offline" };
    // Clamp whatever the model wrote into the game's ranges.
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    return { list: parsed.data.map((c) => ({ ...c, salary: Math.round(clamp(c.salary, 350, 1500) / 50) * 50, cost: clamp(c.cost, 0.85, 1.25), effect: clamp(c.effect, 0.9, 1.25) })), mode: "live" };
  } catch (err) {
    console.error("[staff] candidates failed:", err);
    return { list: fallback, mode: "offline" };
  }
}
