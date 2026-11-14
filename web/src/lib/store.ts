import { create } from "zustand";
import { FACTIONS, GAINS, LOSSES, QUIPS, STAFF, STRONG, WEAK, type Faction, type Flow, type Staff, type View } from "./data";
import type { PlanStatus, PlanTask } from "@/components/ui21/agent-plan";
import { DISTRICTS } from "./geo";
import { hash } from "./util";

// One shared world state. Every screen is a view of this, so an action on one shows up on the others.
// Behaviour is canned for now: the places marked "agent" and "model" are where real calls go.

export const DAY_START = 360; // 06:00
export const DAY_END = 1320; // 22:00
export const SPEEDS = [0.5, 1, 2, 4];

type Line = { who: "me" | "them" | "note"; text: string };
type Overlay = "paper" | "manifesto" | "calendar" | "tactic" | "election" | null;
export type Toast = { id: number; staff: string; text: string };
export type Draft = { text: string; up: string[]; down: string[] };

type State = {
  view: View;
  day: number;
  min: number;
  speed: number;
  cash: number;
  poll: { cole: number; hale: number; brandt: number };
  losses: Flow[];
  gains: Flow[];
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

  go: (v: View) => void;
  tick: () => void;
  setSpeed: (s: number) => void;
  allocate: (kind: "losses" | "gains", i: number, delta: number) => void;
  toggleTask: (id: number) => void;
  addTask: (text: string) => void;
  select: (p: Partial<Pick<State, "district" | "faction" | "person" | "filter">>) => void;
  open: (o: Overlay) => void;
  instruct: (id: string, text: string) => void;
  hire: (id: string, pick: number) => void;
  act: (kind: string, cost: number, bump: number, raise?: number) => void;
  commitPlank: (d: Draft) => void;
  runTactic: () => void;
  speak: () => void;
  dismiss: (id: number) => void;
  jumpToEvening: () => void;
};

let uid = 10;
const net = (s: Pick<State, "gains" | "losses">) => s.gains.reduce((a, c) => a + c.v, 0) - s.losses.reduce((a, c) => a + c.v, 0);
export const netPerDay = net;

const sent: Record<number, number> = {};
for (const d of DISTRICTS) sent[d.cd] = STRONG.includes(d.cd) ? 62 + hash(d.cd) * 12 : WEAK.includes(d.cd) ? 22 + hash(d.cd) * 12 : 38 + hash(d.cd) * 18;

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
export const sentimentOf = (s: Pick<State, "sent" | "filter" | "factions">, cd: number) => {
  if (s.filter === "all") return s.sent[cd];
  const f = s.factions.find((x) => x.id === s.filter)!;
  return Math.max(5, Math.min(95, s.sent[cd] + (hash(cd, f.size) - 0.5) * 44 + (f.feel - 50) * 0.5));
};

// Dev handle for driving the UI from the console: window.game.setState({ view: "map" })
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") queueMicrotask(() => ((window as unknown as { game: unknown }).game = useGame));

export const useGame = create<State>((set, get) => ({
  view: "profile",
  day: 1,
  min: DAY_START,
  speed: 1,
  cash: 412000,
  poll: { cole: 31, hale: 38, brandt: 14 },
  losses: LOSSES,
  gains: GAINS,
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
  overlay: "paper",
  toasts: [],
  tacticResult: null,

  go: (view) => set({ view }),
  setSpeed: (speed) => set({ speed }),
  open: (overlay) => set({ overlay, tacticResult: null }),
  select: (p) => set(p),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  jumpToEvening: () => set({ min: DAY_END - 100 }),

  tick: () => {
    const s = get();
    const min = s.min + 2 * s.speed;
    if (min < DAY_END) return set({ min });
    // Day rolls over: money settles, the poll drifts, and the morning paper arrives. The clock never stops.
    if (s.day >= 30) return set({ min: DAY_END, overlay: "election" });
    set({
      day: s.day + 1,
      min: DAY_START,
      cash: s.cash + net(s),
      poll: { ...s.poll, cole: s.poll.cole + Math.round(hash(s.day, 3) * 3 - 1) },
      tasks: s.tasks.filter((t) => !t.done),
      overlay: "paper",
    });
  },

  allocate: (kind, i, delta) =>
    set((s) => ({ [kind]: s[kind].map((c, j) => (j === i ? { ...c, v: Math.max(0, c.v + delta), items: c.items.map(([n, v], x) => [n, x === 0 ? Math.max(0, v + delta) : v] as [string, number]) } : c)) }) as Partial<State>),

  toggleTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
  addTask: (text) => set((s) => ({ tasks: [...s.tasks, { id: uid++, text, done: false }], calendar: { ...s.calendar, [s.day]: [...(s.calendar[s.day] ?? []), text] } })),

  // agent: stand-in for a real deep agent. The instruction travels down, work happens, a report comes back, state changes.
  instruct: (id, text) => {
    const say = (line: Line) => set((s) => ({ logs: { ...s.logs, [id]: [...(s.logs[id] ?? []), line] } }));
    const mark = (ids: string[], v?: "down" | "up" | "work") =>
      set((s) => {
        const busy = { ...s.busy };
        for (const x of ids) {
          if (v) busy[x] = v;
          else delete busy[x];
        }
        return { busy };
      });
    const me = get().staff.find((x) => x.id === id)!;
    const subs = get().staff.filter((x) => x.boss === id && x.name).map((x) => x.id);
    const first = (x: string) => get().staff.find((p) => p.id === x)!.name!.split(" ")[0];

    // The director writes a plan, hands each job to one of their people, and the plan updates as they work.
    const plan = planFor(get().staff, id, text, ["pending"]);
    const step = (status: PlanStatus, done = false) =>
      set((s) => ({
        plans: { ...s.plans, [id]: (s.plans[id] ?? []).map((t) => (t.id === plan.id ? { ...t, status: done ? "completed" : t.status, subtasks: t.subtasks.map((x) => ({ ...x, status })) } : t)) },
      }));

    say({ who: "me", text });
    mark([id], "down");
    setTimeout(() => {
      say({ who: "them", text: subs.length ? `On it. Splitting this across ${subs.map(first).join(", ")}.` : "On it." });
      set((s) => ({ plans: { ...s.plans, [id]: [plan, ...(s.plans[id] ?? [])] } }));
      mark([id], "work");
      mark(subs, "down");
    }, 1200);
    setTimeout(() => {
      mark(subs, "work");
      step("in-progress");
    }, 2400);
    setTimeout(() => mark(subs, "up"), 4200);
    setTimeout(() => {
      mark(subs);
      mark([id], "up");
      step("completed");
    }, 5400);
    setTimeout(() => {
      const cd = STRONG[Math.floor(Math.random() * STRONG.length)];
      const where = DISTRICTS.find((d) => d.cd === cd)!.name;
      set((s) => ({ cash: s.cash - 2400, sent: { ...s.sent, [cd]: Math.min(95, s.sent[cd] + 4) } }));
      step("completed", true);
      say({ who: "them", text: `Done. Spent $2,400. Support is up in ${where}. I could do more with another $3k.` });
      say({ who: "note", text: `Placeholder reply. ${me.name!.split(" ")[0]} becomes a real agent here.` });
      mark([id]);
    }, 6400);
  },

  hire: (id, pick) =>
    set((s) => ({
      staff: s.staff.map((p) => (p.id === id ? { ...p, name: pick === 0 ? "Helen Voss" : "Kai Lindqvist", good: pick === 0 ? "Careful, experienced" : "Brilliant", weak: pick === 0 ? "Expensive" : "Abrasive", doing: "Settling in" } : p)),
      losses: s.losses.map((c, i) => (i === 0 ? { ...c, v: c.v + (pick === 0 ? 900 : 600) } : c)),
    })),

  act: (kind, cost, bump, raise = 0) => {
    const s = get();
    const d = DISTRICTS.find((x) => x.cd === s.district);
    if (!d) return;
    set({ cash: s.cash - cost + raise, sent: { ...s.sent, [d.cd]: Math.min(95, s.sent[d.cd] + bump) } });
    s.addTask(`${kind} · ${d.name}`);
  },

  commitPlank: (d) =>
    set((s) => ({
      manifesto: [...s.manifesto, d.text],
      factions: s.factions.map((f) => (d.up.includes(f.id) ? { ...f, feel: Math.min(95, f.feel + 6) } : d.down.includes(f.id) ? { ...f, feel: Math.max(5, f.feel - 8) } : f)),
    })),

  runTactic: () => {
    const back = Math.random() < 0.78;
    set((s) => ({
      cash: s.cash - 8000,
      tacticResult: back ? "backfired" : "worked",
      factions: s.factions.map((f) => (f.id === "seniors" ? { ...f, feel: f.feel + (back ? -6 : 3) } : f)),
      staff: back ? s.staff.map((p) => (p.id === "pr" ? { id: p.id, boss: p.boss, role: p.role } : p)) : s.staff,
    }));
  },

  speak: () => {
    const [staff, text] = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    set((s) => ({
      toasts: [...s.toasts.slice(-2), { id: uid++, staff, text }],
      unread: { ...s.unread, [staff]: true },
      logs: { ...s.logs, [staff]: [...(s.logs[staff] ?? []), { who: "them", text }] },
    }));
  },
}));
