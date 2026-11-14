import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { createDeepAgent, registerHarnessProfile, type SubAgent } from "deepagents";
import { z } from "zod";
import { ACTION_IDS, ACTIONS } from "./catalog";
import { describeTeam, profileOf } from "./engine";
import type { RunCtx } from "./protocol";
import { PLACES, type Snapshot } from "./world";

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

function world(w: Snapshot) {
  const days = 30 - w.day;
  const factions = w.factions.map((f) => `${f.id} (${f.name}): feels ${Math.round(f.feel)}/100 toward Cole, size ${f.size}`).join("\n");
  const weakest = [...PLACES].sort((a, b) => (w.sent[a.cd] ?? 50) - (w.sent[b.cd] ?? 50));
  const line = (p: (typeof PLACES)[number]) => `${p.cd} ${p.name} (${p.boro}): support ${Math.round(w.sent[p.cd] ?? 50)}, top complaint "${p.issue}"`;
  return `Day ${w.day} of 30 (${days} left). Cash $${w.cash.toLocaleString("en-US")}. Poll: Hale ${w.poll.hale}, Cole ${w.poll.cole}, Brandt ${w.poll.brandt}.
Manifesto: ${w.manifesto.map((m, i) => `${i + 1}. ${m}`).join(" ")}
Factions (use the id):
${factions}
Districts (use the number). Support is simulated, 0-100:
${PLACES.map(line).join("\n")}
Weakest five: ${weakest.slice(0, 5).map((p) => p.name).join(", ")}.`;
}

const CATALOG = ACTION_IDS.map((id) => `- ${id}: ${ACTIONS[id].about} ~$${ACTIONS[id].cost.toLocaleString("en-US")}${ACTIONS[id].needs.district ? " [needs district]" : ""}${ACTIONS[id].needs.faction ? " [needs faction]" : ""}`).join("\n");

function actionTool(ctx: RunCtx, by: string) {
  return tool(
    async ({ action, district, faction }) => ctx.act(by, action, { district: district ? Number(district) : undefined, faction: faction ?? undefined }).text,
    {
      name: "take_action",
      description: "Carry out one campaign action in the real world. The result tells you exactly what happened and what it cost. Only report results you got from this tool.",
      schema: z.object({
        action: z.enum(ACTION_IDS),
        district: z.enum(DISTRICT_IDS).nullable().describe("Community district number, when the action needs a place"),
        faction: z.enum(ctx.req.snapshot.factions.map((f) => f.id) as [string, ...string[]]).nullable().describe("Faction id, when the action targets a group"),
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
    description: `${p.name}, ${p.role}. Good at: ${p.good ?? p.profile.skills.join(", ")}. Weak at: ${p.weak ?? "nothing noted"}. Skills: ${p.profile.skills.join(", ")}.`,
    model: worker(),
    tools: [actionTool(ctx, p.id)],
    systemPrompt: `You are ${p.name}, ${p.role} on Adrian Cole's campaign for Mayor of New York City. This is a fictional, nonpartisan teaching simulation.
Voice: ${p.profile.voice}
Your boss ${me.name} has handed you one job. Do it with take_action: usually one action, at most two. Pick the action, district and faction that best fit the job and your skills. If take_action says something was not done, do not retry the same thing.
Then reply in under 40 words, in your own voice, saying what happened. Use only the facts take_action gave you.

Actions you can take:
${CATALOG}

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
        reply: z.string().describe("Under 60 words, in your voice: what got done, what it cost, what changed. Facts from tool results only."),
        ask_amount: z.number().nullable().describe("Dollars of extra budget you want approved, or null"),
        ask_reason: z.string().nullable().describe("What the extra money is for, or null"),
        coaching: z.string().describe("One honest sentence of feedback on the campaigner's instruction: was it clear (what, where, who, by when) and did it go to the right person?"),
      }),
    },
  );

  const agent = createDeepAgent({
    model: director(),
    name: slug(me.name!),
    tools: team.length ? [send] : [actionTool(ctx, me.id), send],
    subagents,
    systemPrompt: `You are ${me.name}, ${me.role} on Adrian Cole's campaign for Mayor of New York City. This is a fictional, nonpartisan teaching simulation; the player is a student learning to run a campaign, and they are your boss.
Voice: ${prof.voice}
Strengths: ${me.good ?? prof.skills.join(", ")}. Weaknesses: ${me.weak ?? "none noted"}. Let both show in your choices.

How you work:
1. Start with write_todos: two to four concrete jobs.
2. ${team.length ? `Hand each job to the right person on your team with the task tool. Brief them precisely: what, where (district number), who (faction id), and why. Run independent jobs in parallel. Your team: ${team.map((p) => `${slug(p.name!)} (${p.role})`).join(", ")}.` : "Nobody reports to you, so do the jobs yourself with take_action."}
3. Budget for this instruction: $${req.budget.toLocaleString("en-US")}. Never plan past it. If the job needs more, ask in your report.
4. If the instruction is vague, make a sensible call and say what you assumed. If it is the wrong job for your department, do your best and say who should have had it.
5. Finish with send_report exactly once. Report only what tool results told you; never invent numbers.

Actions available to the campaign:
${CATALOG}

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
              emit({ t: "delegate", to, job: String(tc.args.description ?? "").slice(0, 160) });
            }
          }
        }
        if (m.tool_call_id && pending.has(m.tool_call_id)) {
          const to = pending.get(m.tool_call_id)!;
          pending.delete(m.tool_call_id);
          emit({ t: "job-done", to, summary: textOf(m.content).slice(0, 280) });
        }
        // The director's own words before it starts delegating.
        const said = textOf(m.content);
        if (!m.tool_call_id && !seen.has("said") && said && m.tool_calls?.length) {
          seen.add("said");
          emit({ t: "say", text: said.slice(0, 240) });
        }
      }
    }
  }
}
