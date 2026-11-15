import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { createDeepAgent, registerHarnessProfile, type SubAgent } from "deepagents";
import { z } from "zod";
import { ACTION_IDS, ACTIONS, BOOKING_KINDS } from "../engine/catalog";
import { describeTeam, profileOf } from "../engine/resolve";
import { THOUGHT_MAX, type RunCtx } from "./protocol";
import { humanize, PLACES, short, type Snapshot } from "./world";

// Real staff. Each director is a deep agent: it plans with write_todos and hands jobs to its people through the
// task tool. Each of their people is a subagent that does one job with take_action. All model ids live here.

export const DIRECTOR_MODEL = "claude-opus-5-5";
export const STAFF_MODEL = "claude-haiku-5-5"; // the README's "smaller agents that do one job each"

// Staff only delegate to real colleagues and act through the catalog: no generic helper agent, no file tools.
const NO_FILES = ["ls", "read_file", "write_file", "edit_file", "glob", "grep", "execute"];
for (const m of [DIRECTOR_MODEL, STAFF_MODEL]) registerHarnessProfile(`anthropic:${m}`, { generalPurposeSubagent: { enabled: false }, excludedTools: NO_FILES });

const director = () => new ChatAnthropic({ model: DIRECTOR_MODEL, maxTokens: 8000, outputConfig: { effort: "low" } });
const worker = () => new ChatAnthropic({ model: STAFF_MODEL, maxTokens: 4000, outputConfig: { effort: "low" } });

const DISTRICT_IDS = PLACES.map((p) => String(p.cd)) as [string, ...string[]];

const textOf = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join(" ") : "").trim();

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");

/** How a post introduces itself to its agent. A post held by a real person is played as the post, not as that person. */
const post = (p: { name?: string; role: string; onRecord?: string }) =>
  p.onRecord ? `the ${p.role} (the post ${p.name} held in the real campaign; speak as a professional in that post, never as an impersonation of that person)` : p.name === p.role ? `the ${p.role}` : `${p.name}, ${p.role}`;

const frame = (w: Snapshot) => `on ${w.candidate}'s campaign in ${w.race}. This is a nonpartisan teaching simulation built on the real race: the people, dates and standings up to today are real, and what your work achieves is simulated`;

export function world(w: Snapshot) {
  const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  const poll = Object.entries(w.poll).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${w.names[id] ?? id} ${Math.round(v)}`).join(", ");
  const factions = w.factions.map((f) => `${f.id} (${f.name}): ${Math.round(f.feel)}% support ${w.candidate}; ${f.size}% of likely voters`).join("\n");
  const weakest = [...PLACES].sort((a, b) => (w.sent[a.cd] ?? 0) - (w.sent[b.cd] ?? 0));
  const line = (p: (typeof PLACES)[number]) => `${p.cd} ${p.name} (${p.boro}): support ${Math.round(w.sent[p.cd] ?? 0)}%`;
  return `Today is ${w.date}; ${w.daysLeft} days to the primary. Left to spend under the cap: ${usd(w.cash)}. Poll: ${poll}.
The candidate's calendar (he can do ${w.daily} things a day): ${w.booked.length ? w.booked.map((b) => `${b.date} ${b.label}`).join("; ") : "nothing booked"}.
Platform: ${w.manifesto.map((m, i) => `${i + 1}. ${m}`).join(" ")}
Voter groups (use the id). They overlap: one voter is in several.
${factions}
Districts (use the number). Support is simulated, in percent:
${PLACES.map(line).join("\n")}
Weakest five: ${weakest.slice(0, 5).map((p) => p.name).join(", ")}.`;
}

export const catalog = (w: Snapshot) => ACTION_IDS.map((id) => `- ${id}: ${ACTIONS[id].about} ~$${(ACTIONS[id].cost * w.scale.money).toLocaleString("en-US")}${ACTIONS[id].needs.district ? " [needs district]" : ""}${ACTIONS[id].needs.faction ? " [needs voter group]" : ""}`).join("\n");

function actionTool(ctx: RunCtx, by: string) {
  return tool(
    async ({ why, action, district, faction, on, kind }) => {
      ctx.think(by, humanize(why, ctx.req.snapshot.factions));
      return ctx.act(by, action, { district: district ? Number(district) : undefined, faction: faction ?? undefined, on: on ?? undefined, kind: kind ?? undefined }).text;
    },
    {
      name: "take_action",
      description: "Carry out one campaign action in the real world. The result tells you exactly what happened and what it cost. Only report results you got from this tool.",
      // `why` comes first so it is written before the choice it explains, not as a justification after it.
      schema: z.object({
        why: z.string().describe(`Fill this in first. One or two sentences, under ${THOUGHT_MAX} characters, that your boss the campaigner will read: why this action, this place and this group, given the job and the numbers. Name places and groups in words, not ids.`),
        action: z.enum(ACTION_IDS),
        district: z.enum(DISTRICT_IDS).nullable().describe("Community district number, when the action needs a place"),
        faction: z.enum(ctx.req.snapshot.factions.map((f) => f.id) as [string, ...string[]]).nullable().describe("Voter group id, when the action targets a group"),
        on: z.string().nullable().describe("Only for schedule_event: the date the candidate appears, YYYY-MM-DD, after today. Otherwise null"),
        kind: z.enum(BOOKING_KINDS).nullable().describe("Only for schedule_event: what the candidate does there. Otherwise null"),
      }),
    },
  );
}

export async function runLive(ctx: RunCtx, signal: AbortSignal) {
  const { req, emit } = ctx;
  const w = req.snapshot;
  const me = w.staff.find((s) => s.id === req.director)!;
  const prof = profileOf(w, me.id);
  const team = describeTeam(w, me.id);
  const names = new Map(team.map((p) => [slug(p.name!), p.id]));

  const subagents: SubAgent[] = team.map((p) => ({
    name: slug(p.name!),
    description: `${p.onRecord ? `The ${p.role}` : `${p.name}, ${p.role}`}. Good at: ${p.good ?? p.profile.skills.join(", ")}. Weak at: ${p.weak ?? "nothing noted"}. Skills: ${p.profile.skills.join(", ")}.`,
    model: worker(),
    tools: [actionTool(ctx, p.id)],
    systemPrompt: `You are ${post(p)} ${frame(w)}.
Voice: ${p.profile.voice}
Your boss, ${short(me)}, has handed you one job. Do it with take_action: usually one action, at most two. Pick the action, district and voter group that best fit the job and your skills. If take_action says something was not done, do not retry the same thing.
Then reply in under 40 words, in your own voice, saying what happened. Use only the facts take_action gave you.

Actions you can take:
${catalog(w)}

The city right now:
${world(w)}`,
  }));

  const send = tool(
    async ({ reply, ask_amount, ask_reason, coaching }) => {
      ctx.report(reply, ask_amount && ask_reason ? { amount: ask_amount, reason: ask_reason } : null, coaching);
      return "Report delivered.";
    },
    {
      name: "send_report",
      description: "Report back to the campaigner. Call this exactly once, as your very last step.",
      schema: z.object({
        reply: z.string().describe("Under 50 words, in your voice and with your honest view: what this adds up to and what you would do next. The campaigner already sees a receipt for every action with its cost and effect, so do not repeat those figures. Facts from tool results only."),
        ask_amount: z.number().nullable().describe("Dollars of extra budget you want approved, or null"),
        ask_reason: z.string().nullable().describe("What the extra money is for, as a short phrase starting with \"to\" or \"for\" (it follows the words \"wants $X more\"), or null"),
        coaching: z.string().describe("One honest sentence of feedback on the campaigner's instruction: was it clear (what, where, who, by when) and did it go to the right person?"),
      }),
    },
  );
  const propose = tool(
    async ({ reply, options }) => {
      ctx.propose(reply, options);
      return "Options delivered. Stop here: the campaigner will pick one.";
    },
    {
      name: "propose",
      description: "Answer a question from the campaigner with your view and two or three concrete options. Use it instead of doing any work whenever they ask rather than order. Call it once; it ends your turn.",
      schema: z.object({
        reply: z.string().describe("Under 60 words, in your own voice: answer what they asked, with your honest view. Disagree if the numbers say so. Name places and groups in words."),
        options: z
          .array(
            z.object({
              title: z.string().describe("At most eight plain words, places and groups in words (e.g. \"Canvass Black voters in Crown Heights\")"),
              order: z.string().describe("The exact order the campaigner could send you to do it: what, where, for whom, by when, and a budget in dollars"),
              cost: z.number().describe("Rough cost in dollars"),
              why: z.string().describe(`One sentence, under ${THOUGHT_MAX} characters: why this, given the numbers`),
            }),
          )
          .min(2)
          .max(3),
      }),
    },
  );

  const agent = createDeepAgent({
    model: director(),
    name: slug(me.name!),
    tools: team.length ? [send, propose] : [actionTool(ctx, me.id), send, propose],
    subagents,
    systemPrompt: `You are ${post(me)} ${frame(w)}. The player is a student learning to run a campaign, and they are your boss.
Voice: ${prof.voice}
Strengths: ${me.good ?? prof.skills.join(", ")}. Weaknesses: ${me.weak ?? "none noted"}. Let both show in your choices.

Who you are: a professional with views, not an order-taker. Everything the campaigner reads from you is in your voice. If an order is a poor use of money or time given the numbers below, say so plainly in one sentence, in your first thought and again in your report, then carry it out anyway: the campaigner decides. If it is a good call, you may say so in a few words. Never flatter.

First, decide what the campaigner wants.
- If they are ASKING you something (a question, ideas, options, advice, "what should we do", "what do you think", "any suggestions"), do not plan, delegate or act, and spend nothing. Call propose exactly once: your answer and two or three concrete options, each with an order they could send you. Then stop.
- Only an ORDER (do this, run that, spend this) starts the work below. A polite request is an order too: "Can you canvass Crown Heights this week?" means do it.

How you work on an order:
1. Start with write_todos: two to four concrete jobs. In the same message, before the call, write one or two sentences of plain text (under ${THOUGHT_MAX} characters) on why you are splitting the work this way. The campaigner reads it as your thinking, so make it the real reason, with places and groups in words.
2. ${team.length ? `Hand each job to the right person on your team with the task tool. Open each brief with a one-line title of at most eight plain words that uses place and group names, not ids (for example "Canvass union households in Jackson Heights"). On the second line write "Why:" and one sentence (under ${THOUGHT_MAX} characters, places and groups in words) on why this job and why this person. Then brief them precisely: what, where (district number), who (voter group id), and why. Run independent jobs in parallel. Your team: ${team.map((p) => `${slug(p.name!)} (${p.role})`).join(", ")}.` : "Nobody reports to you, so do the jobs yourself with take_action."}
3. Budget for this instruction: $${req.budget.toLocaleString("en-US")}. Never plan past it. If the job needs more, ask in your report.
4. If the instruction is vague, make a sensible call and say what you assumed. If it is the wrong job for your department, do your best and say who should have had it.
5. Finish with send_report exactly once. Report only what tool results told you; never invent numbers. In the report, name places and voter groups in words; never print a district number or a group id.

Actions available to the campaign:
${catalog(w)}

The city right now:
${world(w)}`,
  });

  emit({ t: "start", mode: "live" });
  const seen = new Set<string>();
  const pending = new Map<string, string>();
  const past = req.history.slice(-8).map((l) => ({ role: l.who === "me" ? "user" : "assistant", content: l.text }));
  while (past[0]?.role === "assistant") past.shift(); // the conversation must open with the campaigner
  const ask = req.followOf ? `${req.text}\n(This continues my earlier order: "${req.followOf}". Use the extra budget on that, and do not ask for more this time.)` : req.text;
  const messages = [...past, { role: "user", content: ask }];

  const stream = await agent.stream({ messages }, { streamMode: "updates", recursionLimit: 80, signal });
  for await (const chunk of stream as AsyncIterable<Record<string, unknown>>) {
    for (const update of Object.values(chunk ?? {})) {
      const msgs = (update as { messages?: unknown[] } | null)?.messages;
      if (!Array.isArray(msgs)) continue;
      for (const m of msgs as { id?: string; tool_calls?: { id?: string; name: string; args: Record<string, unknown> }[]; tool_call_id?: string; content?: unknown }[]) {
        // The director's words alongside its tool calls are its thinking: why this plan, why these hand-offs.
        // They used to open the chat as a `say`; now they lead the run's thoughts instead, so nothing shows twice.
        const said = textOf(m.content);
        if (!m.tool_call_id && said && m.tool_calls?.length && !seen.has(`said:${said}`)) {
          seen.add(`said:${said}`);
          ctx.think(me.id, humanize(said, w.factions));
        }
        for (const tc of m.tool_calls ?? []) {
          const key = tc.id ?? JSON.stringify(tc);
          if (seen.has(key)) continue;
          seen.add(key);
          if (tc.name === "write_todos") {
            const todos = (tc.args.todos as { content: string; status: string }[] | undefined) ?? [];
            emit({ t: "plan", items: todos.map((x) => ({ title: x.content, status: x.status === "completed" ? "completed" : x.status === "in_progress" ? "in-progress" : "pending" })) });
          } else if (tc.name === "task") {
            const to = names.get(String(tc.args.subagent_type));
            if (to) {
              pending.set(key, to);
              // The first line of the brief is its title, and its "Why:" line the hand-off's reason; ids that slip through become names.
              const lines = String(tc.args.description ?? "").trim().split("\n");
              const title = lines[0].replace(/^(title|job)\s*:\s*/i, "").replace(/^["'*#\s]+|["'*\s.]+$/g, "");
              const why = lines.find((l) => /^\W*why\W*:/i.test(l.trim()));
              if (why) ctx.think(me.id, humanize(why, w.factions));
              emit({ t: "delegate", to, job: humanize(title, w.factions).slice(0, 90) });
            }
          }
        }
        if (m.tool_call_id && pending.has(m.tool_call_id)) {
          const to = pending.get(m.tool_call_id)!;
          pending.delete(m.tool_call_id);
          emit({ t: "job-done", to, summary: textOf(m.content).slice(0, 280) });
        }
      }
    }
  }
}
