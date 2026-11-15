import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { createDeepAgent, type SubAgent } from "deepagents";
import { todoListMiddleware } from "langchain";
import { z } from "zod";
import type { Case } from "../cases/types";
import { Ledger } from "../staff/numbers";
import type { Files } from "./files";
import type { Debrief, DebriefDecision } from "./types";

// The end-of-campaign debrief as a deep agent. It reads the student's whole campaign and the sourced 2013 record from
// a virtual filesystem, plans with write_todos, sends one analyst per decision in parallel, and hands back its
// debrief through tools, the way the staff report (lib/staff/agents.ts send_report). It is read-only by
// construction: the file tools refuse every write, its record tools only fill this run's result, and nothing it
// returns reaches the campaign. It runs once, after election day.
//
// Its own model on purpose: the staff register a harness profile for their models (lib/staff/agents.ts) that hides
// the file tools, and profiles are global to the server. A different model keeps the two from touching each other.

export const DEBRIEF_MODEL = "claude-sonnet-5-5";
const model = () => new ChatAnthropic({ model: DEBRIEF_MODEL, maxTokens: 6000, outputConfig: { effort: "low" } });

const RULES = `Rules:
- The campaign is over, so compare freely with what really happened. Real-world facts come only from /record/, and each one is backed by its source ids. Never invent a fact, quote, number, event or motive for a real person.
- Everything in /campaign/ is simulated: say "in your campaign" for it. Use only figures that appear in the files.
- Judge a decision by what was known on its date, not only by how it turned out. Making the real campaign's call is not the same as being right; the record gives luck and rivals' mistakes a share of the credit.
- Write to the student, in plain words, with honest views and no flattery. The student ran the campaign; the candidate is a real person, so name him and his family in the third person, never as "you" or "your".`;

const PROMPT = (c: Case) => `You write the end-of-campaign debrief for a student who has just finished ${c.title}, played from inside a real campaign in a nonpartisan teaching simulation.
The files are listed in /README.md.
${RULES}

How to work:
1. Read /README.md and /campaign/summary.md. Plan with write_todos: one item per decision, one for the campaign review, one for the summary.
2. In a single turn, call the task tool for decision_analyst once per decision (give the decision id and the student's pick) and for campaign_reviewer once, so they run in parallel. Each records its own part of the debrief.
3. Read /record/result.md, then call submit_debrief exactly once with the headline, the summary of the student's whole campaign against the real one, and two to four lessons. Then stop.`;

/** Run the debrief over `files`. Throws when the agent cannot finish; the route turns that into the plain debrief. */
export async function runDebrief(c: Case, files: Files, signal?: AbortSignal): Promise<Debrief> {
  const ids = c.decisions.map((d) => d.id) as [string, ...string[]];
  const decisions = new Map<string, DebriefDecision>();
  let review: { staff: string; rivals: string } | null = null;
  let top: { headline: string; summary: string; lessons: string[] } | null = null;

  const recordDecision = tool(
    async (d) => { decisions.set(d.decision, d); return "Recorded. Reply with one word: done."; },
    {
      name: "record_decision",
      description: "Record your analysis of the decision. Call it exactly once, as your last step.",
      schema: z.object({
        decision: z.enum(ids).describe("The decision id"),
        same: z.boolean().describe("True when the student made the same call as the real campaign"),
        analysis: z.string().describe("At most 80 words, to the student: their call and what their campaign did around it, against what the real campaign knew, chose and did, and what followed"),
        lesson: z.string().describe("At most 25 words: the one thing to take from this decision"),
        sources: z.array(z.string()).describe("Source ids from /record/ backing every real-world fact in the analysis"),
      }),
    },
  );
  const recordReview = tool(
    async (r) => { review = r; return "Recorded. Reply with one word: done."; },
    {
      name: "record_review",
      description: "Record your review. Call it exactly once, as your last step.",
      schema: z.object({
        staff: z.string().describe("At most 90 words: how the student ran their staff"),
        rivals: z.string().describe("At most 60 words: what the simulated rivals did and how the student answered"),
      }),
    },
  );
  const submit = tool(
    async (t) => { top = t; return "Debrief delivered. Stop here."; },
    {
      name: "submit_debrief",
      description: "Deliver the debrief once the analysts and the reviewer have finished. Call it exactly once, as your very last step.",
      schema: z.object({
        headline: z.string().describe("At most 12 words, with no figures"),
        summary: z.string().describe("At most 90 words: the student's whole campaign against the real one"),
        lessons: z.array(z.string()).describe("Two to four lessons, each at most 25 words"),
      }),
    },
  );

  const subagents: SubAgent[] = [
    {
      name: "decision_analyst",
      description: "Compares the student's campaign with the real 2013 campaign at one decision and records the analysis. Brief it with the decision id and the student's pick.",
      systemPrompt: `You analyse one decision of a finished teaching simulation of the 2013 New York mayoral primary.
Read /campaign/decisions/<id>.md and /record/decisions/<id>.md for the decision you are given. Read a staff file under /campaign/staff/ only if the decision turns on the staff's work. Finish with record_decision.
${RULES}`,
      model: model(),
      tools: [recordDecision],
    },
    {
      name: "campaign_reviewer",
      description: "Reviews how the student ran their staff and dealt with the rival campaigns over the whole campaign, and records the review.",
      systemPrompt: `You review a finished teaching simulation of the 2013 New York mayoral primary.
Read /campaign/summary.md, the files under /campaign/staff/, /campaign/rivals.md and /campaign/platform.md. On the staff: were orders clear (what, where, who, by when) and given to the right person, did the student heed the staff's pushback and coaching, and how did they handle requests for money and offered options. On the rivals: what they did and whether the student answered. Finish with record_review.
${RULES}`,
      model: model(),
      tools: [recordReview],
    },
  ];

  const agent = createDeepAgent({
    model: model(),
    name: "debrief",
    systemPrompt: PROMPT(c),
    tools: [submit],
    subagents,
    middleware: [todoListMiddleware()],
    // Read-only: every write, edit or delete is refused, for this agent and the subagents that inherit it.
    permissions: [{ operations: ["write"], paths: ["/**"], mode: "deny" }],
  });

  const now = new Date().toISOString();
  const state = Object.fromEntries(Object.entries(files).map(([p, content]) => [p, { content, mimeType: "text/markdown", created_at: now, modified_at: now }]));
  await agent.invoke(
    { messages: [{ role: "user", content: "Write the debrief." }], files: state } as never,
    { recursionLimit: 120, signal, runName: "debrief", tags: ["debrief", c.id], metadata: { caseId: c.id, decisions: c.decisions.length } },
  );
  const head = top as { headline: string; summary: string; lessons: string[] } | null;
  if (!head) throw new Error("the debrief agent finished without submitting");
  const rev = review as { staff: string; rivals: string } | null;

  // Every figure must come from the files, and every citation must be one of the case's sources.
  const ledger = new Ledger().add(...Object.values(files));
  const clean = (t: string) => ledger.clean(t.trim());
  const known = new Set(c.sources.map((s) => s.id));
  return {
    headline: clean(head.headline).replace(/\.$/, "") || "Your campaign against the real one",
    summary: clean(head.summary),
    decisions: ids.flatMap((id) => { const d = decisions.get(id); return d ? [{ ...d, analysis: clean(d.analysis), lesson: clean(d.lesson), sources: [...new Set(d.sources.filter((s) => known.has(s)))] }] : []; }),
    staff: rev ? clean(rev.staff) : "",
    rivals: rev ? clean(rev.rivals) : "",
    lessons: head.lessons.map(clean).filter(Boolean).slice(0, 4),
  };
}
