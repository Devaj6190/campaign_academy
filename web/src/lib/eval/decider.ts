import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { createDeepAgent } from "deepagents";
import { z } from "zod";
import { DIRECTOR_MODEL } from "../staff/agents"; // also registers the harness profile (no file tools)
import { byChips } from "./conditions";

// The agent that decides one card as a real person (#28): the campaigner at the case's decisions, an adviser saying
// which option they argue for, or a rival at a held-out decision. A deep agent: it can read the map, the voter groups
// and the paper before it decides, as a student can, and it decides through one tool. Without a key, the chips decide
// (byChips), which is also the baseline for what the chips alone give away.

export const EVAL_MODEL = DIRECTOR_MODEL;

export type CardOption = { key: string; id: string; label: string; detail: string; cost?: number; up?: string[]; down?: string[] };
export type Card = {
  decision: string;
  /** What the agent is told the date is (relative when masked). */
  today: string;
  title: string;
  person: { name: string; role: string; facts: string[] };
  /** "decide" for the person's own choice, "advise" for an adviser saying what they argue for. */
  ask: "decide" | "advise";
  body: string;
  options: CardOption[];
  read: { map?: string; groups?: string; paper?: string };
};
export type Choice = { key: string | null; why: string; read: string[]; mode: "live" | "rules"; ms: number };
export type Trace = { tags: string[]; metadata: Record<string, unknown> };

const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();
const json = <T>(raw: string): T | null => { try { return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as T; } catch { return null; } };

export const optionLines = (c: Card, chips = true) =>
  c.options.map((o) => `${o.key}. ${o.label}. ${o.detail}${o.cost ? ` Costs $${o.cost.toLocaleString("en-US")}.` : ""}${chips && (o.up || o.down) ? ` Likely up: ${o.up?.join(", ") || "nothing"}. Likely down: ${o.down?.join(", ") || "nothing"}.` : ""}`).join("\n");

/**
 * Tuning 1 (after run 1): the agent kept the 2013 choice at three of six changed-facts cards and argued from what it
 * remembered, not from the card. This tells it the card's facts are the facts. It names no option and no outcome.
 */
export const GROUNDED = "The facts you are given are the facts of this campaign, even where they differ from anything you think you remember about a real election. This campaign has not happened yet and need not go the way any real one went. Argue only from what is in front of you.";

export function system(c: Card) {
  const verb = c.ask === "decide" ? "The decision is yours. Decide as you would" : "The candidate has asked where you stand. Say which option you would argue for, as you would";
  return `You are ${c.person.name}, ${c.person.role}.
${c.person.facts.length ? `What you know about yourself:\n${c.person.facts.map((f) => `- ${f}`).join("\n")}\n` : ""}
Today is ${c.today}. You know only what you are told here and what you knew as of today. Nothing after today has happened.
${GROUNDED}
${verb}: from who you are, what you know, and the situation below, not from what a textbook says is right.
Read what you need first: read_map (support by district), read_voter_groups (support and size by group) and read_paper (what the press has reported). Then call decide exactly once.`;
}

export async function decideLive(c: Card, trace: Trace): Promise<Choice> {
  const t0 = Date.now();
  const read: string[] = [];
  let picked: { key: string; why: string } | null = null;
  const reader = (name: string, body: string | undefined, about: string) =>
    tool(async () => { read.push(name); return body || "Nothing to read."; }, { name, description: about, schema: z.object({}) });
  const keys = c.options.map((o) => o.key) as [string, ...string[]];
  const decide = tool(
    async ({ option, why }) => { picked = { key: option, why }; return "Recorded."; },
    {
      name: "decide",
      description: c.ask === "decide" ? "Make the decision. Call once." : "Say which option you argue for. Call once.",
      // Tuning 2 (after run 5): the reason must name the facts it rests on, from what the agent was given.
      schema: z.object({ why: z.string().describe("Two or three sentences, in your own voice. Name the facts from the card, the map, the voter groups or the paper that your choice rests on, and the one fact that would most change your mind."), option: z.enum(keys) }),
    },
  );
  const agent = createDeepAgent({
    model: new ChatAnthropic({ model: EVAL_MODEL, maxTokens: 4000, outputConfig: { effort: "medium" } }),
    name: "campaigner",
    tools: [reader("read_map", c.read.map, "Support by community district."), reader("read_voter_groups", c.read.groups, "Support and size of each voter group."), reader("read_paper", c.read.paper, "What the press has reported so far, newest first."), decide],
    systemPrompt: system(c),
  });
  const user = `${c.title}\n\n${c.body}\n\nOptions:\n${optionLines(c)}`;
  await agent.invoke({ messages: [{ role: "user", content: user }] }, { recursionLimit: 30, runName: `eval:${c.decision}`, tags: trace.tags, metadata: trace.metadata });
  const p = picked as { key: string; why: string } | null;
  return { key: p?.key ?? null, why: p?.why ?? "", read, mode: "live", ms: Date.now() - t0 };
}

export function decideRules(c: Card, chips = true): Choice {
  return { key: chips ? byChips(c.options) : c.options[0].key, why: chips ? "The option whose chips point up most." : "The first option.", read: [], mode: "rules", ms: 0 };
}

/** After a masked card: does the model know which real race it was? */
export async function probe(c: Card, trace: Trace): Promise<string> {
  const model = new ChatAnthropic({ model: EVAL_MODEL, maxTokens: 1500, outputConfig: { effort: "low" } });
  const out = await model.invoke(
    [
      // Neutral since run 5: it no longer says names were replaced, which told the model to look for a real race.
      { role: "system", content: "You will see a decision from a teaching simulation." },
      { role: "user", content: `${c.title}\n\n${c.body}\n\nOptions:\n${optionLines(c)}\n\nIs this decision taken from a real election? If you think it is, name the city, the year and the real person in the candidate's place. If you do not know, say "unknown". Reply with JSON only: {"answer": "<text>"}.` },
    ],
    { runName: `eval:probe:${c.decision}`, tags: trace.tags, metadata: trace.metadata },
  );
  return json<{ answer: string }>(text(out.content))?.answer ?? text(out.content);
}

/** No card: what the model remembers the real person doing, from the title and the option labels alone. */
export async function recall(c: Card, who: string, date: string, trace: Trace): Promise<Choice> {
  const t0 = Date.now();
  const model = new ChatAnthropic({ model: EVAL_MODEL, maxTokens: 1500, outputConfig: { effort: "low" } });
  const options = c.options.map((o) => `${o.key}. ${o.label}`).join("\n");
  const out = await model.invoke(
    [{ role: "user", content: `In the 2013 Democratic primary for mayor of New York City, on ${date}, ${who} faced this choice: "${c.title}". Which of these did ${who} actually do?\n${options}\nReply with JSON only: {"option": "<letter>", "why": "<one sentence>"}.` }],
    { runName: `eval:recall:${c.decision}`, tags: trace.tags, metadata: trace.metadata },
  );
  const raw = text(out.content);
  // A reply cut short still names its letter first.
  const letter = json<{ option: string }>(raw)?.option ?? raw.match(/"option"\s*:\s*"([A-G])"/)?.[1];
  const key = c.options.some((o) => o.key === letter) ? letter! : null;
  return { key, why: json<{ why: string }>(raw)?.why ?? raw, read: [], mode: "live", ms: Date.now() - t0 };
}
