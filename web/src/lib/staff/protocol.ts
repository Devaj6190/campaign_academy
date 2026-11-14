import type { ActionId } from "../engine/catalog";
import { clarity, fitScore, resolve, type Effect } from "../engine/resolve";
import { hash } from "../util";
import { ENVELOPE_OF, ENVELOPES, type Envelope } from "../money/rules";
import type { Snapshot } from "./world";

// The wire format between /api/staff/instruct and the browser: one JSON event per line.

export type Ask = { amount: number; reason: string };
export type PlanItem = { title: string; status: "pending" | "in-progress" | "completed" };
export type Line = { who: "me" | "them"; text: string };

/** followOf: the original order when this run is an approved follow-up; targets and clarity come from it. */
export type RunRequest = { director: string; text: string; snapshot: Snapshot; history: Line[]; budget: number; runId: number; followOf?: string };

export type RunEvent =
  | { t: "start"; mode: "live" | "offline" }
  | { t: "say"; text: string }
  | { t: "plan"; items: PlanItem[] }
  | { t: "delegate"; to: string; job: string }
  | { t: "action"; effect: Effect }
  | { t: "job-done"; to: string; summary: string }
  | { t: "report"; text: string; ask: Ask | null; coaching: string; clarity: number; fit: number; missing: string[]; spent: number; raised: number }
  | { t: "error"; text: string }
  | { t: "done" };

/** Shared bookkeeping for one run: budget, effects, and what each person has been asked to do. */
export class RunCtx {
  spent = 0;
  raised = 0;
  effects: Effect[] = [];
  load: Record<string, number> = {};
  /** Spent from each daily budget during this run. */
  fromBudget: Record<Envelope, number> = { ads: 0, field: 0, events: 0 };
  /** Spent from cash during this run. */
  fromCash = 0;
  reported = false;
  quality: ReturnType<typeof clarity>;
  private n = 0;

  constructor(
    public req: RunRequest,
    public emit: (e: RunEvent) => void,
  ) {
    this.quality = clarity(req.followOf ?? req.text);
  }

  get left() {
    return Math.max(0, this.req.budget - this.spent);
  }

  /** Carry out one catalog action. Returns the line the agent reads back. */
  act(by: string, action: ActionId, p: { district?: number; faction?: string }) {
    const w = this.req.snapshot;
    if (!w.staff.some((s) => s.id === by && s.name)) return { ok: false, text: "That post is vacant now; nothing happened." };
    this.load[by] = (this.load[by] ?? 0) + 1;
    const effect = resolve(w, by, action, p, { quality: this.quality.mult, seed: this.req.runId * 31 + this.n++, load: this.load[by] });
    if (effect.cost > this.left) return { ok: false, text: `Not done: it costs $${effect.cost.toLocaleString("en-US")} and only $${this.left.toLocaleString("en-US")} of this order's budget is left. Ask the campaigner for more.` };
    // Approved money (a follow-up) is paid from cash; otherwise budget-paid work needs room in today's budget.
    const env = this.req.followOf ? undefined : ENVELOPE_OF[action];
    if (env && w.money) {
      const left = w.money.left[env] - this.fromBudget[env];
      const label = ENVELOPES.find((e) => e.id === env)!.label;
      if (effect.cost > left) return { ok: false, text: `Not done: today's ${label} budget has $${Math.max(0, left).toLocaleString("en-US")} left and this costs $${effect.cost.toLocaleString("en-US")}. Ask the campaigner for the extra money.` };
      this.fromBudget[env] += effect.cost;
      effect.paidFrom = env;
    } else {
      if (effect.cost > w.cash - this.fromCash + this.raised) return { ok: false, text: "Not done: the campaign does not have the cash." };
      this.fromCash += effect.cost;
      effect.paidFrom = "cash";
    }
    this.spent += effect.cost;
    this.raised += effect.raised;
    this.effects.push(effect);
    this.emit({ t: "action", effect });
    return { ok: true, text: `${effect.summary} Cost $${effect.cost.toLocaleString("en-US")}. Budget left $${this.left.toLocaleString("en-US")}.` };
  }

  report(text: string, ask: Ask | null, coaching: string) {
    if (this.reported) return;
    this.reported = true;
    const amount = ask ? Math.max(500, Math.min(25000, Math.round(ask.amount / 500) * 500)) : 0;
    this.emit({
      t: "report",
      text,
      ask: ask && amount ? { amount, reason: ask.reason } : null,
      coaching,
      clarity: this.quality.score,
      fit: fitScore(this.effects),
      missing: this.quality.missing,
      spent: this.spent,
      raised: this.raised,
    });
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const jitter = (seed: number, base: number) => base * (0.75 + hash(seed, 3) * 0.5);
