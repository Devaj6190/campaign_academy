import { create } from "zustand";
import { FACTIONS, LOSSES, STAFF, STRONG, WEAK, type Faction, type Flow, type Staff, type View } from "./data";
import type { PlanStatus, PlanTask } from "@/components/ui21/agent-plan";
import { DISTRICTS } from "./geo";
import { shares } from "./demographics";
import { hash } from "./util";
import { effectOf, type Effect } from "./engine/resolve";
import { knockOns } from "./relations";
import { calibrate, pollOf, type Rival } from "./engine/poll";
import { publish, type PollRecord } from "./engine/polls";
import { RIVAL_LIST } from "./scenario";
import { tacticOutcome, type Deliverer } from "./engine/tactic";
import { electionResult, type ElectionResult } from "./engine/election";
import type { Edition } from "./paper/edition";
import { addGifts } from "./money/donors";
import { avgIncome, burn, settle } from "./money/finance";
import { ASKS, ENVELOPE_OF, START_MONEY, type Envelope, type Money } from "./money/rules";

// One shared world state. Every screen is a view of this, so an action on one shows up on the others.
// Behaviour is canned for now: the places marked "agent" and "model" are where real calls go.

export const DAY_START = 360; // 06:00
export const DAY_END = 1320; // 22:00
export const SPEEDS = [0.5, 1, 2, 4];

type Line = { who: "me" | "them" | "note"; text: string };
type Overlay = "paper" | "manifesto" | "calendar" | "tactic" | "election" | null;
export type Toast = { id: number; staff: string; text: string };
export type Draft = { text: string; up: string[]; down: string[] };

/** One change to the world, stamped with when it happened. Every view that explains "why" reads this. */
/** knock: how other groups moved because of this one (relations.ts), credited to the group that caused it. */
export type LedgerEntry = { id: number; day: number; min: number; source: "staff" | "candidate" | "manifesto" | "tactic" | "rival" | "debate"; effect: Effect; knock: Record<string, { delta: number; from: string }> };

export type RivalState = { cash: number; raised: number; spent: number; matchable: number; matchPaid: number; strength: Record<number, number>; memory: string[]; plan: { day: number; status: "idle" | "planning" | "ready" | "landed"; moves: Effect[]; memo?: string; mode?: "live" | "rules" } };

type State = {
  view: View;
  day: number;
  min: number;
  speed: number;
  cash: number;
  /** The latest PUBLISHED poll: all anyone (player, staff, rivals) ever sees of public opinion. */
  poll: Record<string, number>;
  /** The true opinion, moved by every Effect. Internal: only the engine and election night read it. */
  truth: Record<string, number>;
  /** Every poll published so far (engine/polls.ts). */
  polls: PollRecord[];
  /** The campaign's own read of each district: updated where Cole or his staff worked, and citywide on poll days. */
  fieldRead: Record<number, number>;
  /** Payroll (losses[0]); the daily budgets and income are in money. */
  losses: Flow[];
  /** The campaign's books: daily budgets, income, donors, public financing (lib/money). */
  money: Money;
  tasks: { id: number; text: string; done: boolean }[];
  calendar: Record<number, string[]>;
  manifesto: string[];
  factions: Faction[];
  staff: Staff[];
  sent: Record<number, number>;
  filter: string; // "all" or a faction id
  district: number | null;
  faction: string | null;
  person: string | null;
  logs: Record<string, Line[]>;
  plans: Record<string, PlanTask[]>; // per direct report: tasks split into jobs for their people
  busy: Record<string, "down" | "up" | "work">;
  unread: Record<string, boolean>;
  overlay: Overlay;
  toasts: Toast[];
  tacticResult: "backfired" | "worked" | null;
  ledger: LedgerEntry[];
  /** Hale and Brandt: money, how strong they are in each district (feeds the poll), memory, tonight's plan. */
  rivals: Record<Rival, RivalState>;
  /** What the morning paper reports about the night before. */
  news: { day: number; opposition: string[]; debate?: string };
  /** Cole's poll at the end of each day, for trends and debates. */
  /** Election night: the result and how many districts have reported so far. */
  election: { result: ElectionResult; shown: number; done?: boolean } | null;
  /** Every edition of The Five Borough Ledger so far, oldest first (lib/paper). */
  editions: Edition[];
  /** Which edition the paper shows: an index into editions, or null for the latest. */
  paperIndex: number | null;
  /** The one write path for cash, district support, faction feeling and the poll (contract on #1). */
  applyEffect: (e: Effect, source: LedgerEntry["source"]) => void;

  go: (v: View) => void;
  tick: () => void;
  setSpeed: (s: number) => void;
  /** Change tomorrow's budget for ads, field or events. */
  budget: (env: Envelope, delta: number) => void;
  /** Day-1 choice: join public financing (matching funds and a spending limit) or not. */
  joinPublicFinancing: (yes: boolean) => void;
  toggleTask: (id: number) => void;
  addTask: (text: string) => void;
  select: (p: Partial<Pick<State, "district" | "faction" | "person" | "filter">>) => void;
  open: (o: Overlay) => void;
  instruct: (id: string, text: string) => void;
  hire: (id: string, pick: number) => void;
  commitPlank: (d: Draft) => void;
  runTactic: (by?: Deliverer) => void;
  speak: () => void;
  dismiss: (id: number) => void;
  jumpToEvening: () => void;
};

let uid = 10;
/** Money in minus money out per day: last week's average income against payroll and tomorrow's budgets. */
export const netPerDay = (s: Pick<State, "losses" | "money" | "day">) => avgIncome(s.money, s.day) - burn(s.losses[0]?.v ?? 0, s.money);

const sent: Record<number, number> = {};
for (const d of DISTRICTS) sent[d.cd] = STRONG.includes(d.cd) ? 62 + hash(d.cd) * 12 : WEAK.includes(d.cd) ? 22 + hash(d.cd) * 12 : 38 + hash(d.cd) * 18;
// Day 1 is half the README's story (above) and half real data: how each district's mix of voter groups
// (census shares) feels about Cole. Both halves are spread over the same range so neither drowns the other.
{
  const lean: Record<number, number> = {};
  for (const d of DISTRICTS) {
    const s = shares(d.cd);
    if (!s) continue;
    let w = 0, v = 0;
    for (const f of FACTIONS) { w += s[f.id] ?? 0; v += (s[f.id] ?? 0) * f.feel; }
    lean[d.cd] = v / w;
  }
  const vals = Object.values(lean);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
  for (const [cd, v] of Object.entries(lean)) sent[+cd] = 0.5 * sent[+cd] + 0.5 * Math.max(15, Math.min(85, 48 + ((v - mean) / sd) * 13));
}

// What each person does when their boss hands them a piece of work. Placeholder until the agents write their own plans.
const JOBS: Record<string, [string, string]> = {
  sch: ["Clear the calendar and book it", "Moves existing holds and confirms the slot with everyone involved."],
  oq: ["Run canvass shifts in Queens", "Three shifts through the tenant networks, starting with the strongest blocks."],
  ob: ["Recruit block captains in Brooklyn", "One captain per building before the weekend."],
  vc: ["Staff the volunteer shifts", "Fills sign-ups and runs the door-knocking training."],
  ct: ["Build the donor call sheet", "Top fifty names, ordered by how recently they gave."],
  ev: ["Book the venue", "Finds a room that fills and keeps staging costs down."],
  pr: ["Brief reporters", "Pitches the story to the three desks most likely to run it."],
  dg: ["Send the email and social push", "Drafts, tests two subject lines and sends tonight."],
};

function planFor(staff: Staff[], id: string, title: string, statuses: PlanStatus[]): PlanTask {
  const me = staff.find((p) => p.id === id)!;
  const subs = staff.filter((p) => p.boss === id && p.name);
  const jobs = subs.length
    ? subs.map((p) => ({ id: p.id, title: JOBS[p.id]?.[0] ?? "Carry out their part", description: JOBS[p.id]?.[1] ?? "", assigned: [p.name!] }))
    : [
        { id: "a", title: "Draft the plan", description: "No staff under this post yet, so the director does it personally.", assigned: [me.name!] },
        { id: "b", title: "Carry it out", description: "", assigned: [me.name!] },
      ];
  const subtasks = jobs.map((j, i) => ({ ...j, status: statuses[i % statuses.length] }));
  return { id: `${id}-${uid++}`, title, status: subtasks.every((x) => x.status === "completed") ? "completed" : "in-progress", subtasks };
}

/** Sentiment for one district under the current filter. Simulated. */
/** What the map shows: the campaign's own field read, never the true opinion (engine/polls.ts). */
export const sentimentOf = (s: Pick<State, "fieldRead" | "filter" | "polls">, cd: number) => {
  const read = s.fieldRead[cd] ?? 50;
  if (s.filter === "all") return read;
  // Support among one group here = how the latest poll says that group feels, shifted by this district's lean.
  const g = s.polls[s.polls.length - 1]?.groups[s.filter];
  return Math.max(5, Math.min(95, (g?.feel ?? 50) + (read - 50) * 0.6));
};

/** Each group's feeling as the latest poll measured it (what every screen shows). */
export const polledFactions = (s: Pick<State, "factions" | "polls">) => {
  const g = s.polls[s.polls.length - 1]?.groups ?? {};
  return s.factions.map((f) => ({ ...f, feel: g[f.id]?.feel ?? f.feel }));
};

// Dev handle for driving the UI from the console: window.game.setState({ view: "map" })
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") queueMicrotask(() => ((window as unknown as { game: unknown }).game = useGame));

// A game day is one real minute at 1x: 06:00 to 22:00 in 240 ticks of 250 ms.
const MIN_PER_TICK = 4;
const NOON = 720;
// Tune the poll so day 1 reads as the README describes (Hale 38, Cole 31, Brandt 14, undecided 17).
calibrate(sent);

const START_RIVALS: Record<Rival, RivalState> = Object.fromEntries(
  RIVAL_LIST.map((r) => [r.id, { cash: r.cash, raised: 0, spent: 0, matchable: 0, matchPaid: 0, strength: {}, memory: [], plan: { day: 0, status: "idle", moves: [] } } satisfies RivalState]),
);
const DAY1_TRUTH = pollOf({ sent, day: 1, rivals: START_RIVALS });
const DAY1_POLL = publish({ truth: DAY1_TRUTH, factions: FACTIONS, ledger: [] }, 1);

export const useGame = create<State>((set, get) => ({
  view: "profile",
  day: 1,
  min: DAY_START,
  speed: 1,
  cash: 412000,
  poll: DAY1_POLL.shares,
  truth: DAY1_TRUTH,
  polls: [DAY1_POLL],
  fieldRead: { ...sent },
  losses: LOSSES,
  money: START_MONEY,
  tasks: [
    { id: 1, text: "Take the manifesto to five planks", done: false },
    { id: 2, text: "Hire a Policy Director", done: false },
    { id: 3, text: "Rally in the Bronx", done: false },
    { id: 4, text: "Two hours of call time", done: false },
  ],
  calendar: { 1: ["Campaign handover"], 3: ["Union endorsement meeting"], 7: ["First debate"], 14: ["Fundraising deadline"], 21: ["Second debate"], 30: ["Election day"] },
  manifesto: ["Build housing near every subway station.", "Extend small-business rent relief citywide.", "Keep police headcount level; add mental-health response teams."],
  factions: FACTIONS,
  staff: STAFF,
  sent,
  filter: "all",
  district: null,
  faction: null,
  person: null,
  logs: {},
  // Everyone starts mid-task, so the war room has work in flight on day one.
  plans: Object.fromEntries(STAFF.filter((p) => !p.boss && p.name).map((p) => [p.id, [planFor(STAFF, p.id, p.doing!, ["completed", "in-progress", "pending"])]])),
  busy: {},
  unread: {},
  overlay: null,
  toasts: [],
  tacticResult: null,
  ledger: [],
  rivals: START_RIVALS,
  news: { day: 1, opposition: [] },
  election: null,
  editions: [],
  paperIndex: null,

  applyEffect: (e, source) =>
    set((g) => {
      const sent = { ...g.sent };
      for (const [cd, d] of Object.entries(e.sent)) sent[+cd] = Math.max(5, Math.min(95, (sent[+cd] ?? 50) + d));
      // Momentum is citywide buzz: it nudges every district a little (it can be negative after a rival's move).
      if (e.momentum) for (const cd of Object.keys(sent)) if (+cd % 100 <= 18) sent[+cd] = Math.max(5, Math.min(95, sent[+cd] + 0.8 * e.momentum));
      // Groups move together: winning one group warms its allies and cools its rivals (once, capped).
      const knock = knockOns(e.factions);
      const factions = g.factions.map((f) => {
        const d = (e.factions[f.id] ?? 0) + (knock[f.id]?.delta ?? 0);
        return d ? { ...f, feel: Math.max(5, Math.min(95, f.feel + d)) } : f;
      });
      const booked = Math.min(30, g.day + 1); // events go on tomorrow's calendar
      const calendar = e.calendar ? { ...g.calendar, [booked]: [...(g.calendar[booked] ?? []), e.calendar] } : g.calendar;
      // A rival's move is paid by the rival and makes them stronger where it landed.
      let rivals = g.rivals;
      let cash = g.cash;
      let money = g.money;
      if (e.rival) {
        const r = g.rivals[e.rival.who];
        const strength = { ...r.strength };
        for (const [cd, d] of Object.entries(e.rival.strength)) strength[+cd] = Math.min(150, (strength[+cd] ?? 0) + d);
        rivals = { ...g.rivals, [e.rival.who]: { ...r, cash: r.cash - e.cost + e.raised, raised: r.raised + e.raised, spent: r.spent + e.cost, strength } };
      } else {
        // Paid from today's budget for that kind of work when it has room; otherwise (or when approved
        // beyond the budget) straight from cash, which counts toward the spending limit at once.
        const env = e.paidFrom === "cash" ? undefined : (e.paidFrom ?? ENVELOPE_OF[e.action as keyof typeof ENVELOPE_OF]);
        if (env && e.cost && money.envelopes[env] - money.spent[env] >= e.cost) money = { ...money, spent: { ...money.spent, [env]: money.spent[env] + e.cost } };
        else if (e.cost) { cash -= e.cost; money = { ...money, spentTotal: money.spentTotal + e.cost }; }
        if (e.raised) {
          const source = ASKS[e.action as keyof typeof ASKS]?.source ?? "Small donors";
          money = { ...money, ...addGifts(money, e.gifts ?? [], e.asked ?? []), raisedTotal: money.raisedTotal + e.raised, income: [...money.income, { day: g.day, source, amount: e.raised }] };
          cash += e.raised;
        }
      }
      // The poll is not set by hand: it is what the districts now add up to.
      const truth = pollOf({ sent, day: g.day, rivals });
      // The campaign learns from its own field work at once; everywhere else waits for the next poll.
      const fieldRead = source === "staff" || source === "candidate" ? { ...g.fieldRead, ...Object.fromEntries(Object.keys(e.sent).map((cd) => [cd, sent[+cd]])) } : g.fieldRead;
      const entry: LedgerEntry = { id: uid++, day: g.day, min: g.min, source, effect: e, knock };
      return { cash, money, sent, factions, calendar, rivals, truth, fieldRead, ledger: [...g.ledger, entry].slice(-5000) };
    }),

  go: (view) => set({ view }),
  setSpeed: (speed) => set({ speed }),
  open: (overlay) => set({ overlay, tacticResult: null }),
  select: (p) => set(p),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  jumpToEvening: () => set({ min: DAY_END - 100 }),

  tick: () => {
    const s = get();
    // Election night: results come in a few districts at a time, then the result card.
    if (s.election) {
      if (s.election.shown >= s.election.result.order.length) return s.election.done ? undefined : set({ overlay: "election", election: { ...s.election, done: true } });
      return set({ election: { ...s.election, shown: s.election.shown + 2 } });
    }
    const min = s.min + MIN_PER_TICK * s.speed;
    // At noon the rivals start planning tonight's moves in the background.
    if (s.min < NOON && min >= NOON) void import("./engine/schedule").then((m) => m.planRivals());
    if (min < DAY_END) return set({ min });
    if (s.day >= 30) {
      if (s.min >= DAY_END) return;
      set({ min: DAY_END });
      set({ view: "map", district: null, overlay: null, election: { result: electionResult(get()), shown: 0 } });
      void import("./paper/run").then((m) => m.publishEdition("result"));
      return;
    }
    // Day rolls over: money settles, the rivals' overnight moves land, debates are judged, and the paper arrives.
    const books = settle({ day: s.day, cash: s.cash, payroll: s.losses[0]?.v ?? 0, money: s.money, polls: s.polls, ledger: s.ledger }, s.day);
    set({
      day: s.day + 1,
      min: DAY_START,
      cash: books.cash,
      money: books.money,
      tasks: s.tasks.filter((t) => !t.done),
      news: { day: s.day + 1, opposition: [] },
    });
    void import("./engine/schedule").then((m) => m.overnight(s.day));
    void import("./money/run").then((m) => m.morning(books.missedPayroll));
  },

  budget: (env, delta) => set((s) => ({ money: { ...s.money, next: { ...s.money.next, [env]: Math.max(0, Math.min(40000, s.money.next[env] + delta)) } } })),
  joinPublicFinancing: (yes) =>
    set((s) => {
      if (s.money.participant !== null || s.day > 1) return {};
      const text = yes ? "Cole joined the city's public financing program: matching funds, and a spending limit." : "Cole declined public financing: no matching funds, no spending limit, bigger checks allowed.";
      return { money: { ...s.money, participant: yes, events: [...s.money.events, { day: s.day, kind: yes ? "joined" : "declined", text }] } };
    }),

  toggleTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
  addTask: (text) => set((s) => ({ tasks: [...s.tasks, { id: uid++, text, done: false }], calendar: { ...s.calendar, [s.day]: [...(s.calendar[s.day] ?? []), text] } })),

  // Staff are real agents (src/lib/staff). Loaded on demand to keep this store free of agent code.
  instruct: (id, text) => void import("./staff/run").then((m) => m.instruct(id, text)),

  hire: (id, pick) =>
    set((s) => ({
      staff: s.staff.map((p) => (p.id === id ? { ...p, name: pick === 0 ? "Helen Voss" : "Kai Lindqvist", good: pick === 0 ? "Careful, experienced" : "Brilliant", weak: pick === 0 ? "Expensive" : "Abrasive", doing: "Settling in" } : p)),
      losses: s.losses.map((c, i) => (i === 0 ? { ...c, v: c.v + (pick === 0 ? 900 : 600) } : c)),
    })),

  // A plank is permanent and moves the groups it pleases and angers, through the ledger like everything else.
  commitPlank: (d) => {
    set((s) => ({ manifesto: [...s.manifesto, d.text] }));
    const factions = Object.fromEntries([...d.up.map((id) => [id, 6]), ...d.down.map((id) => [id, -8])]);
    get().applyEffect(effectOf({ by: "manifesto", action: "plank", label: "Manifesto plank", summary: d.text, factions }), "manifesto");
  },

  // The contrast ad: honest but risky. The risk is computed from the situation and shown first (engine/tactic.ts).
  runTactic: (by = "com") => {
    const { backfired, effect } = tacticOutcome(get(), by);
    set({ tacticResult: backfired ? "backfired" : "worked" });
    get().applyEffect(effect, "tactic");
  },

  // Staff speak up when something in the world deserves it (src/lib/staff/speak.ts).
  speak: () => void import("./staff/speak").then((m) => m.speakUp()),
}));

// The first morning's paper (later editions come from engine/schedule.ts overnight).
if (typeof window !== "undefined") queueMicrotask(() => {
  void import("./paper/run").then((m) => m.publishEdition());
  void import("./money/run").then((m) => m.morning(false));
});
