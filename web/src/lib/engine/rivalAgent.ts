import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { createDeepAgent } from "deepagents";
import { z } from "zod";
import { catalog, STAFF_MODEL, world } from "../staff/agents"; // also registers the harness profile (no file tools)
import type { Profile } from "../staff/roster";
import { PLACES, shortPlace, type Snapshot } from "../staff/world";
import { hash } from "../util";
import { ACTION_IDS, type ActionId } from "./catalog";
import { resolve, type Effect } from "./resolve";

// A rival campaign as a deep agent. The rival is one of the case's real candidates: its name, standing and platform
// on record come from the case file. It reads what the student's campaign just did, decides its moves for the coming
// stretch, and makes them through one tool that the rules engine scores, the same rules that score the student's
// staff. Runs on the smaller model; the fallback is rulePlan.

export const RIVAL_MODEL = STAFF_MODEL;
export const MOVES = 2;

/** A rival campaign is a whole campaign: every skill, no bonus and no penalty. */
const PROFILE: Profile = { skills: ["planning", "scheduling", "field", "volunteers", "finance", "events", "comms", "press", "digital", "policy", "data"], cost: 1, effect: 1, voice: "", salary: 0 };

/** `student`: what the student's campaign did since this rival last moved. `snapshot` is the live case, with support figures for the student. */
export type PlanRequest = { who: string; name: string; standing: string; platform: string[]; snapshot: Snapshot; budget: number; memory: string[]; student: string[] };
/** Each move is scored as if the rival had done it: the points are the rival's gain where it worked (lib/cases/rivals lands them). */
export type PlanResult = { moves: Effect[]; memo: string; mode: "live" | "rules" };

type Move = { action: ActionId; district?: number; faction?: string };

const DISTRICTS = PLACES.map((p) => String(p.cd)) as [string, ...string[]];
const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join(" ") : "").trim();

function score(req: PlanRequest, m: Move, n: number): Effect {
  const w: Snapshot = { ...req.snapshot, hires: { ...req.snapshot.hires, [req.who]: PROFILE } };
  const e = resolve(w, req.who, m.action, { district: m.district, faction: m.faction }, { quality: 1, seed: w.day * 100 + n + req.who.length * 7, load: 1 });
  const group = w.factions.find((f) => f.id === e.faction)?.name;
  // The engine's own summary is written from the student's side; say plainly what the rival did.
  const summary = `${e.label}${e.district ? ` in ${shortPlace(e.district)}` : ""}${group && m.faction ? `${e.district ? "," : ""} aimed at ${group}` : ""}`;
  return { ...e, summary };
}

/** Without a model: contest the student where he is strongest, one large voter group and one district. */
export function rulePlan(req: PlanRequest): PlanResult {
  const w = req.snapshot, seed = w.day * 13 + req.who.length;
  const groups = [...w.factions].filter((f) => f.size >= 20).sort((a, b) => b.feel - a.feel).slice(0, 4);
  const places = [...PLACES].sort((a, b) => (w.sent[b.cd] ?? 0) - (w.sent[a.cd] ?? 0)).slice(0, 5);
  const wanted: Move[] = [
    { action: "digital_ads", faction: groups[Math.floor(hash(seed, 3) * groups.length)]?.id },
    { action: "canvass", district: places[Math.floor(hash(seed, 5) * places.length)]?.cd },
  ];
  const moves: Effect[] = [];
  let spent = 0;
  for (const m of wanted.slice(0, MOVES)) {
    const e = score(req, m, moves.length);
    if (spent + e.cost > req.budget) continue;
    spent += e.cost;
    moves.push(e);
  }
  return { moves, memo: moves.map((m) => m.summary).join(". "), mode: "rules" };
}

export async function planLive(req: PlanRequest, signal?: AbortSignal): Promise<PlanResult> {
  const w = req.snapshot;
  const moves: Effect[] = [];
  let spent = 0;

  const makeMove = tool(
    async ({ action, district, faction }) => {
      if (moves.length >= MOVES) return `No more moves for now (limit ${MOVES}).`;
      const e = score(req, { action, district: district ? Number(district) : undefined, faction: faction ?? undefined }, moves.length);
      if (spent + e.cost > req.budget) return `Not done: it costs $${e.cost.toLocaleString("en-US")} and only $${(req.budget - spent).toLocaleString("en-US")} is left.`;
      moves.push(e);
      spent += e.cost;
      return `Done: ${e.summary}. Cost $${e.cost.toLocaleString("en-US")}.`;
    },
    {
      name: "make_move",
      description: "Make one campaign move. The result says what was done and what it cost. Call it once per move.",
      schema: z.object({
        action: z.enum(ACTION_IDS),
        district: z.enum(DISTRICTS).nullable().describe("Community district number, when the action needs a place"),
        faction: z.enum(w.factions.map((f) => f.id) as [string, ...string[]]).nullable().describe("Voter group id the move courts"),
      }),
    },
  );

  const agent = createDeepAgent({
    model: new ChatAnthropic({ model: RIVAL_MODEL, maxTokens: 3000, outputConfig: { effort: "low" } }),
    name: req.who,
    tools: [makeMove],
    systemPrompt: `You are the campaign of ${req.name} (${req.standing}) in ${w.race}, running against ${w.candidate} and the rest of the field. This is a nonpartisan teaching simulation built on the real race: the candidates, dates and standings up to today are real, and what your moves achieve is simulated. Make fair, honest campaign moves only.
${req.platform.length ? `Your positions on record so far: ${req.platform.map((p, i) => `${i + 1}. ${p}`).join(" ")}` : "Nothing of your platform is on record yet."}
For the coming weeks you have $${req.budget.toLocaleString("en-US")} and up to ${MOVES} moves. Think like this campaign would: defend your own base, and contest the districts and voter groups where ${w.candidate} is gaining.
Make your moves with make_move. Then reply with one sentence (under 25 words) on your strategy, as a campaign memo.

Actions available:
${catalog(w)}

The city right now (support figures are for ${w.candidate}, not for you):
${world(w)}`,
  });

  const memory = req.memory.length ? `Your recent moves: ${req.memory.join(" | ")}` : "These are your first moves.";
  const student = req.student.length ? `What ${w.candidate}'s campaign has done since you last moved: ${req.student.join(" | ")}` : `${w.candidate}'s campaign has been quiet.`;
  const res = await agent.invoke({ messages: [{ role: "user", content: `${student}\n${memory}\nPlan and make your moves.` }] }, { recursionLimit: 30, signal });
  const msgs = (res as { messages?: { content?: unknown }[] }).messages ?? [];
  const memo = [...msgs].reverse().map((m) => text(m.content)).find((t) => t && t.length < 400) ?? moves.map((m) => m.summary).join(". ");
  return { moves, memo, mode: "live" };
}
