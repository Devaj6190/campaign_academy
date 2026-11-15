import { ACTIONS, BOOKING, type ActionId, type BookingKind } from "../engine/catalog";
import { clarity, describeTeam, fitScore, profileOf, resolve, type Effect } from "../engine/resolve";
import { hash } from "../util";
import type { Ledger } from "./numbers";
import { PLACES, shortPlace, type Snapshot } from "./world";

// The wire format between /api/staff/instruct and the browser: one JSON event per line.

export type Ask = { amount: number; reason: string };
/** One concrete action by one person: what the engine can price before it happens and carry out exactly. */
export type Step = { by: string; action: ActionId; district?: number; faction?: string; on?: string; kind?: BookingKind };
/**
 * One way to act on a question the campaigner asked. `steps` is what would be done; `cost` is the engine's price
 * for exactly those steps (a booked appearance counts what it will cost on its day); `order` says it in words.
 */
export type Proposal = { title: string; why: string; steps: Step[]; cost: number; order: string };
/** An option as a director drafts it: steps may lack a place, a group or a person, which propose() fills in. */
export type Draft = { title: string; why?: string; steps: (Omit<Step, "by"> & { by?: string })[] };
const AMOUNT = String.raw`\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|m|thousand|million)?\b`;
const LIMIT_BEFORE = new RegExp(String.raw`\b(?:under|below|within|at most|up to|no more than|not more than|less than|max(?:imum)?(?: of)?|cap(?:ped)?(?: (?:of|at))?|limit(?: of)?|budget(?: (?:of|is|:))?|spend(?:ing)?(?: (?:only|just|about|around))?)\s+${AMOUNT}`, "gi");
const LIMIT_AFTER = new RegExp(String.raw`${AMOUNT}\s+(?:budget|max(?:imum)?|cap|limit|or less|at most|tops)\b`, "gi");

/**
 * The spending limit an order states in its own words ("under $15,000", "at most 20k", "spend $30,000", "a $5k
 * budget"), in dollars, or null when it states none. Only an amount tied to a limit word counts: "tax incomes over
 * $500,000" and "raise $100k" are not budgets. The smallest stated limit wins.
 */
export function budgetIn(text: string): number | null {
  const found: number[] = [];
  for (const re of [LIMIT_BEFORE, LIMIT_AFTER]) {
    for (const m of text.matchAll(re)) {
      // A bare small number is a count, not money ("at most 3 events"): it needs a $ sign, a unit, or four digits.
      const raw = m[1].replace(/,/g, ""), unit = (m[2] ?? "").toLowerCase();
      if (!m[0].includes("$") && !unit && raw.replace(/\..*/, "").length < 4) continue;
      const n = Number(raw) * (unit === "k" || unit === "thousand" ? 1e3 : unit === "m" || unit === "million" ? 1e6 : 1);
      if (Number.isFinite(n) && n > 0) found.push(Math.round(n));
    }
  }
  return found.length ? Math.min(...found) : null;
}

/** How long a thought may be: one or two sentences. Asked of the model in words, and enforced when emitted. */
export const THOUGHT_MAX = 200;
export type PlanItem = { title: string; status: "pending" | "in-progress" | "completed" };
export type Line = { who: "me" | "them"; text: string };

/** followOf: the original order when this run is an approved follow-up; targets and clarity come from it. */
export type RunRequest = { director: string; text: string; snapshot: Snapshot; history: Line[]; budget: number; runId: number; followOf?: string; /** A picked option: carry out exactly these, with no planning. */ steps?: Step[] };

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

  /** Set when live agents write this run's text: every figure they may state. Templated runs need none. */
  ledger?: Ledger;

  /** Money promised to booked appearances: paid on their day, but it counts against this order's budget now. */
  committed = 0;

  get left() {
    return Math.max(0, this.req.budget - this.spent - this.committed);
  }

  /** Say why, in a sentence or two. A long one is cut at a word; an empty one is dropped. */
  think(who: string, text: string) {
    const said = text.replace(/\s+/g, " ").replace(/^\W*(thinking|why)\W*:\s*/i, "").trim();
    // A thought streams as it is written and cannot be sent back, so a sentence with a figure nobody gave is dropped.
    const t = this.ledger ? this.ledger.clean(said) : said;
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

  /** What one step costs. The engine's price depends only on the action and who does it, so it is exact ahead of time. */
  price(s: Step) {
    const w = this.req.snapshot;
    const by = s.action === "schedule_event" ? "candidate" : s.by;
    const action = s.action === "schedule_event" ? BOOKING[s.kind ?? "rally"].action : s.action;
    return resolve(w, by, action, { district: s.district, faction: s.faction }, { quality: 1, seed: 1, load: 1 }).cost;
  }

  /**
   * Make a drafted step concrete, so the price shown is for exactly what will happen: the person is someone on this
   * director's team with the skills (else the director), and a missing place or group becomes the weakest one.
   */
  private settle(d: Draft["steps"][number]): Step | null {
    const w = this.req.snapshot;
    const a = ACTIONS[d.action];
    if (!a) return null;
    const team = describeTeam(w, this.req.director);
    const can = (id: string) => a.skills.some((k) => profileOf(w, id).skills.includes(k));
    const mine = d.by && (d.by === this.req.director || team.some((t) => t.id === d.by)) ? d.by : undefined;
    const by = mine && (can(mine) || !team.some((t) => can(t.id))) ? mine : (team.find((t) => can(t.id))?.id ?? this.req.director);
    const known = (cd?: number) => (cd && PLACES.some((x) => x.cd === cd) ? cd : undefined);
    const district = known(d.district) ?? (a.needs.district ? [...PLACES].sort((x, y) => (w.sent[x.cd] ?? 0) - (w.sent[y.cd] ?? 0))[0].cd : undefined);
    const group = d.faction && w.factions.some((f) => f.id === d.faction) ? d.faction : undefined;
    const faction = group ?? (a.needs.faction ? ([...w.factions].filter((f) => f.size >= 20).sort((x, y) => x.feel - y.feel)[0] ?? w.factions[0]).id : undefined);
    return { by, action: d.action, district, faction, ...(d.action === "schedule_event" ? { on: d.on, kind: d.kind ?? "rally" } : {}) };
  }

  /** A step in a few words, for the card and the order. */
  describe(s: Step) {
    const w = this.req.snapshot;
    const what = s.action === "schedule_event" ? `Book the candidate for ${BOOKING[s.kind ?? "rally"].label}` : ACTIONS[s.action].label;
    const group = s.faction ? w.factions.find((f) => f.id === s.faction)?.name : undefined;
    return `${what}${s.district ? ` in ${shortPlace(s.district)}` : ""}${group ? `${s.district ? "," : ""} for ${group}` : ""}`;
  }

  /**
   * Answer a question with options instead of acting. It counts as the reply, so no report follows. Each option's
   * steps are made concrete and priced here, by the engine: the card shows what picking it will really cost.
   */
  propose(text: string, drafts: Draft[]) {
    if (this.reported) return;
    this.reported = true;
    const options: Proposal[] = [];
    for (const d of drafts) {
      const steps = (d.steps ?? []).slice(0, 3).map((x) => this.settle(x)).filter((x): x is Step => !!x);
      if (!d.title?.trim() || !steps.length) continue;
      options.push({ title: d.title.trim().slice(0, 60), why: (d.why ?? "").trim().slice(0, THOUGHT_MAX), steps, cost: steps.reduce((a, s) => a + this.price(s), 0), order: `${steps.map((s) => this.describe(s)).join("; ")}.` });
      if (options.length === 3) break;
    }
    this.emit({ t: "proposals", text: text.trim(), options });
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
