import { BOOKING, type ActionId, type BookingKind } from "../engine/catalog";
import { clarity, fitScore, resolve, type Effect } from "../engine/resolve";
import { hash } from "../util";
import { shortPlace, type Snapshot } from "./world";

// The wire format between /api/staff/instruct and the browser: one JSON event per line.

export type Ask = { amount: number; reason: string };
/** One way to act on a question the campaigner asked: a short title, the order that carries it out, a rough cost. */
export type Proposal = { title: string; order: string; cost: number; why: string };
/** How long a thought may be: one or two sentences. Asked of the model in words, and enforced when emitted. */
export const THOUGHT_MAX = 200;
export type PlanItem = { title: string; status: "pending" | "in-progress" | "completed" };
export type Line = { who: "me" | "them"; text: string };

/** followOf: the original order when this run is an approved follow-up; targets and clarity come from it. */
export type RunRequest = { director: string; text: string; snapshot: Snapshot; history: Line[]; budget: number; runId: number; followOf?: string };

export type RunEvent =
  | { t: "start"; mode: "live" | "offline" }
  | { t: "say"; text: string }
  /** Why someone on this run is doing what they do next. Display only: never reaches cash, support or the poll. */
  | { t: "thought"; who: string; text: string }
  | { t: "plan"; items: PlanItem[] }
  | { t: "delegate"; to: string; job: string }
  | { t: "action"; effect: Effect }
  | { t: "job-done"; to: string; summary: string }
  /** The campaigner asked rather than ordered: an answer in the director's voice and two or three ways to act on it. Nothing is spent. */
  | { t: "proposals"; text: string; options: Proposal[] }
  | { t: "report"; text: string; ask: Ask | null; coaching: string; clarity: number; fit: number; missing: string[]; spent: number; raised: number }
  | { t: "error"; text: string }
  | { t: "done" };

/** Shared bookkeeping for one run: budget, effects, and what each person has been asked to do. */
export class RunCtx {
  spent = 0;
  raised = 0;
  effects: Effect[] = [];
  load: Record<string, number> = {};
  reported = false;
  quality: ReturnType<typeof clarity>;
  private n = 0;

  constructor(
    public req: RunRequest,
    public emit: (e: RunEvent) => void,
  ) {
    this.quality = clarity(req.followOf ?? req.text);
  }

  /** Money promised to booked appearances: paid on their day, but it counts against this order's budget now. */
  committed = 0;

  get left() {
    return Math.max(0, this.req.budget - this.spent - this.committed);
  }

  /** Say why, in a sentence or two. A long one is cut at a word; an empty one is dropped. */
  think(who: string, text: string) {
    const t = text.replace(/\s+/g, " ").replace(/^\W*(thinking|why)\W*:\s*/i, "").trim();
    if (!t) return;
    if (t.length <= THOUGHT_MAX) return this.emit({ t: "thought", who, text: t });
    const cut = t.lastIndexOf(" ", THOUGHT_MAX - 1);
    this.emit({ t: "thought", who, text: `${t.slice(0, cut > 0 ? cut : THOUGHT_MAX - 1).replace(/[,;:\s]+$/, "")}…` });
  }

  /** Carry out one catalog action. Returns the line the agent reads back. */
  act(by: string, action: ActionId, p: { district?: number; faction?: string; on?: string; kind?: BookingKind }) {
    const w = this.req.snapshot;
    if (!w.staff.some((s) => s.id === by && s.name)) return { ok: false, text: "That post is vacant now; nothing happened." };
    if (action === "schedule_event") return this.book(by, p);
    this.load[by] = (this.load[by] ?? 0) + 1;
    const effect = resolve(w, by, action, p, { quality: this.quality.mult, seed: this.req.runId * 31 + this.n++, load: this.load[by] });
    if (effect.cost > this.left) return { ok: false, text: `Not done: it costs $${effect.cost.toLocaleString("en-US")} and only $${this.left.toLocaleString("en-US")} of this budget is left. Ask the campaigner for more.` };
    if (effect.cost > w.cash - this.spent + this.raised) return { ok: false, text: "Not done: the campaign does not have the cash." };
    this.spent += effect.cost;
    this.raised += effect.raised;
    this.effects.push(effect);
    this.emit({ t: "action", effect });
    return { ok: true, text: `${effect.summary} Cost $${effect.cost.toLocaleString("en-US")}. Budget left $${this.left.toLocaleString("en-US")}.` };
  }

  /**
   * Put the candidate on the calendar. Nothing happens and nothing is paid now: on the day he does it in person. The
   * date must be after today and before the election; a day that is already full moves to the next free one.
   */
  private book(by: string, p: { district?: number; faction?: string; on?: string; kind?: BookingKind }) {
    const w = this.req.snapshot;
    const kind: BookingKind = p.kind && p.kind in BOOKING ? p.kind : "rally";
    const day = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
    const last = day(w.date, w.daysLeft - 1);
    let date = p.on && /^\d{4}-\d{2}-\d{2}$/.test(p.on) && p.on > w.date && p.on <= last ? p.on : day(w.date, 1);
    const taken = (d: string) => w.booked.filter((b) => b.date === d).length + this.effects.filter((e) => e.booking?.date === d).length;
    while (taken(date) >= w.daily && date < last) date = day(date, 1);
    if (taken(date) >= w.daily) return { ok: false, text: "Not booked: the candidate's calendar is full until the election." };
    // What the appearance will cost when the candidate does it, as near as can be said now.
    const est = resolve(w, "candidate", BOOKING[kind].action, { district: p.district, faction: p.faction }, { quality: 1, seed: this.req.runId, load: 1 }).cost;
    const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
    if (est > this.left) return { ok: false, text: `Not booked: ${BOOKING[kind].label} costs about ${usd(est)} on the day and only ${usd(this.left)} of this budget is left. Book something cheaper (door knocking and meetings cost least) or ask the campaigner for more.` };
    this.committed += est;
    this.load[by] = (this.load[by] ?? 0) + 1;
    const base = resolve(w, by, "schedule_event", { district: p.district, faction: p.faction }, { quality: this.quality.mult, seed: this.req.runId * 31 + this.n++, load: this.load[by] });
    const when = new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const where = base.district ? shortPlace(base.district) : "the city";
    const moved = p.on && p.on !== date ? ` (${p.on} was full or out of range)` : "";
    const effect: Effect = { ...base, booking: { date, kind }, calendar: `${BOOKING[kind].label} · ${where}`, summary: `Booked the candidate for ${BOOKING[kind].label} in ${where} on ${when}, about ${usd(est)} on the day.` };
    this.effects.push(effect);
    this.emit({ t: "action", effect });
    return { ok: true, text: `${effect.summary}${moved} It happens that day and is paid for then. Budget left ${usd(this.left)}. He can do ${w.daily} things a day.` };
  }

  /** Answer a question with options instead of acting. It counts as the reply, so no report follows. */
  propose(text: string, options: Proposal[]) {
    if (this.reported) return;
    this.reported = true;
    const m = this.req.snapshot.scale.money;
    const clean = options
      .filter((o) => o.title?.trim() && o.order?.trim())
      .slice(0, 3)
      .map((o) => ({ title: o.title.trim().slice(0, 60), order: o.order.trim().slice(0, 240), why: (o.why ?? "").trim().slice(0, THOUGHT_MAX), cost: Math.max(0, Math.round((o.cost || 0) / (100 * m)) * 100 * m) }));
    this.emit({ t: "proposals", text: text.trim(), options: clean });
  }

  report(text: string, ask: Ask | null, coaching: string) {
    if (this.reported) return;
    this.reported = true;
    const m = this.req.snapshot.scale.money;
    const amount = ask ? Math.max(500 * m, Math.min(25000 * m, Math.round(ask.amount / (500 * m)) * 500 * m)) : 0;
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
