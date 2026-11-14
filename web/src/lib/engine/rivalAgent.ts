import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { createDeepAgent } from "deepagents";
import { z } from "zod";
import { CATALOG, STAFF_MODEL, world } from "../staff/agents"; // also registers the harness profile (no file tools)
import { PLACES, type Snapshot } from "../staff/world";
import { ACTION_IDS, ACTIONS } from "./catalog";
import type { Effect } from "./resolve";
import type { Rival } from "./poll";
import { RIVALS, rivalEffect, ruleMoves } from "./rivals";

// A rival campaign as a deep agent: it reads what Cole did, decides its moves for tonight, and makes them
// through one tool that the rules engine scores. Runs on the smaller model; the fallback is ruleMoves.

export const RIVAL_MODEL = STAFF_MODEL;

export type PlanRequest = { who: Rival; snapshot: Snapshot; cash: number; memory: string[]; coleYesterday: string[]; gained: number[]; extra: boolean };
export type PlanResult = { moves: Effect[]; memo: string; mode: "live" | "rules" };

const DISTRICTS = PLACES.map((p) => String(p.cd)) as [string, ...string[]];
const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join(" ") : "").trim();

export function rulePlan(req: PlanRequest): PlanResult {
  const r = RIVALS[req.who];
  const budget = Math.min(req.cash, r.perDay * (req.extra ? 1.6 : 1));
  const moves = ruleMoves(req.snapshot, req.who, req.gained, budget, req.extra).map((m, i) => rivalEffect(req.snapshot, req.who, m, req.snapshot.day * 100 + i));
  return { moves, memo: moves.map((m) => m.summary).join(" "), mode: "rules" };
}

export async function planLive(req: PlanRequest, signal?: AbortSignal): Promise<PlanResult> {
  const r = RIVALS[req.who];
  const w = req.snapshot;
  const budget = Math.min(req.cash, r.perDay * (req.extra ? 1.6 : 1));
  const cap = req.extra ? 3 : 2;
  const moves: Effect[] = [];
  let spent = 0;

  const makeMove = tool(
    async ({ action, district, faction }) => {
      if (moves.length >= cap) return `No more moves tonight (limit ${cap}).`;
      const cost = ACTIONS[action].cost;
      if (spent + cost > budget) return `Not done: costs about $${cost.toLocaleString("en-US")}, only $${(budget - spent).toLocaleString("en-US")} left tonight.`;
      const e = rivalEffect(w, req.who, { action, district: district ? Number(district) : undefined, faction: faction ?? undefined }, w.day * 100 + moves.length);
      moves.push(e);
      spent += e.cost;
      return `${e.summary} Cost $${e.cost.toLocaleString("en-US")}.`;
    },
    {
      name: "make_move",
      description: "Make one campaign move tonight. The result says exactly what it did. Call it once per move.",
      schema: z.object({
        action: z.enum(ACTION_IDS),
        district: z.enum(DISTRICTS).nullable().describe("Community district number, when the action needs a place"),
        faction: z.enum(w.factions.map((f) => f.id) as [string, ...string[]]).nullable().describe("Faction id the move courts"),
      }),
    },
  );

  const agent = createDeepAgent({
    model: new ChatAnthropic({ model: RIVAL_MODEL, maxTokens: 3000, outputConfig: { effort: "low" } }),
    name: req.who,
    tools: [makeMove],
    systemPrompt: `You are the campaign of ${r.name}, running for Mayor of New York City against Adrian Cole and one other rival. This is a fictional, nonpartisan teaching game; play fair and honest campaign moves only.
${r.name} runs on ${r.runsOn}. Her base: ${r.base}.
Tonight you have $${budget.toLocaleString("en-US")} and up to ${cap} moves${req.extra ? " (it is a debate day: make it count)" : ""}. Think like a real campaign: defend your base, contest districts Cole is gaining, and court groups who are cooling on him.
Make your moves with make_move. Then reply with one sentence (under 25 words) on your strategy tonight, as a campaign memo.

Actions available:
${CATALOG}

The city right now (support figures are for Cole):
${world(w)}`,
  });

  const memory = req.memory.length ? `Your recent moves: ${req.memory.join(" | ")}` : "This is your first night.";
  const cole = req.coleYesterday.length ? `What Cole did today: ${req.coleYesterday.join(" | ")}` : "Cole had a quiet day.";
  const res = await agent.invoke({ messages: [{ role: "user", content: `${cole}\n${memory}\nPlan and make tonight's moves.` }] }, { recursionLimit: 30, signal });
  const msgs = (res as { messages?: { content?: unknown; tool_calls?: unknown[] }[] }).messages ?? [];
  const memo = [...msgs].reverse().map((m) => text(m.content)).find((t) => t && t.length < 400) ?? moves.map((m) => m.summary).join(" ");
  return { moves, memo, mode: "live" };
}
