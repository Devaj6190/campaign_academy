import { ChatAnthropic } from "@langchain/anthropic";
import { STAFF_MODEL } from "../staff/agents";

// Who writes the paper (#52). The Ledger's newsroom and its comms desk run on Gemini when GEMINI_API_KEY is set, and on
// Claude when only ANTHROPIC_API_KEY is: a Gemini failure, or a reply that does not parse, hands the same request to
// Claude. With neither key the routes keep the template and the rules. Everything outside the paper stays on Claude.

/** The Gemini model for the paper. A fast one: the edition is written while the student reads the template. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export type Writer = "gemini" | "claude";

/** Is any model available to write the paper? */
export const paperLive = () => !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();
/** The JSON object in a reply, however it is wrapped. */
export const jsonIn = (raw: string): unknown => JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

async function gemini(system: string, user: string, maxTokens: number): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens,
      // A Flash model thinks only when asked: the paper needs none, and thinking would eat the output budget.
      ...(/flash/.test(GEMINI_MODEL) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  });
  const raw = res.text ?? "";
  if (!raw.trim()) throw new Error("Gemini returned nothing");
  return raw;
}

async function claude(system: string, user: string, maxTokens: number): Promise<string> {
  const model = new ChatAnthropic({ model: STAFF_MODEL, maxTokens, outputConfig: { effort: "low" } });
  const res = await model.invoke([{ role: "system", content: system }, { role: "user", content: user }]);
  return text(res.content);
}

/**
 * One JSON reply for the paper: Gemini first, Claude if Gemini is missing or fails, either way checked by `parse`
 * (which throws on a reply it cannot use). Throws only when no model gave a usable reply.
 */
export async function writeJson<T>(system: string, user: string, maxTokens: number, parse: (raw: string) => T): Promise<{ out: T; by: Writer }> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return { out: parse(await gemini(system, user, maxTokens)), by: "gemini" };
    } catch (err) {
      if (!process.env.ANTHROPIC_API_KEY) throw err;
      console.warn(`[paper] Gemini (${GEMINI_MODEL}) failed, Claude writes it:`, err instanceof Error ? err.message : err);
    }
  }
  const raw = await claude(system, user, maxTokens);
  try {
    return { out: parse(raw), by: "claude" };
  } catch (err) {
    console.warn("[paper] Claude's reply was not usable:", err instanceof Error ? err.message.slice(0, 300) : err, "| reply starts:", raw.slice(0, 200));
    throw err;
  }
}
