import { create } from "zustand";
import type { Effect } from "../engine/resolve";
import type { Ask, PlanItem, Proposal } from "./protocol";
import type { Candidate, Profile } from "./roster";

// Staff-only state. The shared world (cash, sentiment, the roster itself) stays in the main game store;
// this holds what only the war room needs: conversations, live runs, morale and the people you hired.

/** `run`: the instruction an item belongs to, in the instructed person's own chat. The war room groups by it. */
export type ChatItem = (
  | { k: "me"; text: string }
  | { k: "them"; text: string; suggest?: string }
  | { k: "receipt"; effect: Effect; by: string }
  | { k: "report"; text: string; ask: Ask | null; state: "open" | "approved" | "declined"; spent: number; raised: number }
  | { k: "coach"; clarity: number; fit: number; missing: string[]; text: string }
  /** An answer to a question, with options. `picked` is the option the campaigner turned into an order. */
  | { k: "proposals"; text: string; options: Proposal[]; picked?: number }
  | { k: "note"; text: string }
  // One instruction's thinking, director and staff in order. Kept in the chat so it is never dropped, and never
  // sent back to the agents as history. `live` until the run ends.
  | { k: "thoughts"; run: number; items: Thought[]; live: boolean }
) & { run?: number };

export type Thought = { who: string; text: string };

export type Job = { to: string; job: string; done: boolean; summary?: string };
/** origin: the order this run carries out (its own text, or the order an approved ask continues). */
export type Run = { id: number; text: string; origin: string; follow: boolean; items: PlanItem[]; jobs: Job[]; status: "running" | "done" };
export type FeedItem = { id: number; date: string; who: string; text: string; tone?: "pos" | "neg" | "warm" };
export type Packet = { id: number; from: string; to: string };

type StaffState = {
  chat: Record<string, ChatItem[]>;
  runs: Record<string, Run[]>; // newest first, per person who was instructed
  active: Record<string, number>; // run id in flight, per person
  job: Record<string, string>; // what each person is doing right now
  misfit: Record<string, boolean>; // just did a job outside their skills; flashes on the chart
  packets: Packet[];
  feed: FeedItem[];
  morale: Record<string, number>;
  hires: Record<string, Profile>;
  candidates: Record<string, { status: "loading" | "ready"; list: Candidate[]; mode?: "live" | "offline" }>;
  mode: "live" | "offline" | null;
  spoken: Record<string, number>; // trigger → day it last fired
  /** A ready-made order waiting in someone's input box (e.g. "Send staff" from the map). */
  draft: Record<string, string>;
};

export const useStaff = create<StaffState>(() => ({
  chat: {},
  runs: {},
  active: {},
  job: {},
  misfit: {},
  packets: [],
  feed: [],
  morale: { cm: 72, fd: 78, fin: 66, com: 70, sch: 64, oq: 58, ob: 74, vc: 70, ct: 62, ev: 68, pr: 71, dg: 69 },
  hires: {},
  candidates: {},
  mode: null,
  spoken: {},
  draft: {},
}));

let uid = 1;
export const nextId = () => uid++;

export const pushChat = (id: string, item: ChatItem) => useStaff.setState((s) => ({ chat: { ...s.chat, [id]: [...(s.chat[id] ?? []), item] } }));

export const bumpMorale = (id: string, d: number) => useStaff.setState((s) => ({ morale: { ...s.morale, [id]: Math.max(5, Math.min(100, (s.morale[id] ?? 70) + d)) } }));
