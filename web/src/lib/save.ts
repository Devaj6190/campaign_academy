import type { StoreApi } from "zustand";
import { useNight } from "./cases/night";
import { useRivals } from "./cases/rivals";
import { DEFAULT_ALLOCATION } from "./cases/allocation";
import { CASES } from "./cases/index";
import { useCase } from "./cases/store";
import { usePlanks } from "./manifesto/run";
import { bumpUid as bumpEditions, usePaper } from "./paper/run";
import { useMemos } from "./staff/memos";
import { resetSeen } from "./staff/speak";
import { bumpUid as bumpFeed, useStaff, type ChatItem } from "./staff/store";
import { useGame } from "./store";
import { useTasks } from "./tasks";

// The campaign, saved in the browser as it changes, so a reload or a crash resumes where it was (with the clock
// paused). Also the demo start point (a save made by scripts/demo-start.ts) and the full reset.
//
// What is saved is the campaign, not the screen: the view, the selection, toasts and the animations of the moment are
// not. Bump SAVE_VERSION whenever a saved field changes shape: an older save is then discarded, never loaded broken.

export const SAVE_VERSION = 1;
export const SAVE_KEY = "campaign-academy:save";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Store = StoreApi<any>;
/** A store and the fields of it that make up the campaign. The case store comes first: see restore(). */
const SLOTS: { name: string; store: Store; keys: string[] }[] = [
  { name: "case", store: useCase, keys: ["caseId", "step", "at", "date", "speed", "card", "picks", "work", "bookings", "allocation"] },
  { name: "staff", store: useStaff, keys: ["chat", "runs", "job", "feed", "morale", "hires", "spoken", "followups", "memory", "draft"] },
  { name: "game", store: useGame, keys: ["staff", "unread"] },
  { name: "paper", store: usePaper, keys: ["editions", "unread"] },
  { name: "rivals", store: useRivals, keys: ["planned", "memory", "mode"] },
  { name: "planks", store: usePlanks, keys: ["planks"] },
  { name: "memos", store: useMemos, keys: ["byDecision"] },
  { name: "night", store: useNight, keys: ["shown"] },
  { name: "tasks", store: useTasks, keys: ["tasks"] },
];

/** Tells the screens the campaign was just replaced, not changed: the top bar does not flash the jump (components/Changed). */
const loaded = () => globalThis.dispatchEvent?.(new Event("campaign:loaded"));

export type Save = { v: number; caseId: string; savedAt: string; stores: Record<string, Record<string, unknown>> };

const pick = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o[k]]));
/** A store's state as it was created, without its functions: what a reset goes back to. */
const initial = (s: Store) => Object.fromEntries(Object.entries(s.getInitialState() as Record<string, unknown>).filter(([, v]) => typeof v !== "function"));
const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** The campaign as it stands, ready to save. A deep copy: later changes to the stores do not reach it. */
export function snapshot(): Save {
  const stores = Object.fromEntries(SLOTS.map((x) => [x.name, pick(x.store.getState(), x.keys)]));
  return JSON.parse(JSON.stringify({ v: SAVE_VERSION, caseId: useCase.getState().caseId, savedAt: new Date().toISOString(), stores }));
}

/** Fields added after saves were first written: an older save without them still loads (restore fills them in). */
const LATER = new Set(["allocation"]);

/** Whether a save can be loaded: this version, a case that exists, and every field the shape the game expects. */
export function valid(x: unknown): x is Save {
  const s = x as Save;
  if (!s || typeof s !== "object" || s.v !== SAVE_VERSION || !CASES.some((c) => c.id === s.caseId) || !s.stores) return false;
  return SLOTS.every(({ name, store, keys }) => {
    const got = s.stores[name], init = initial(store);
    return !!got && typeof got === "object" && keys.every((k) => (k in got ? init[k] === null || got[k] === null || kind(got[k]) === kind(init[k]) : LATER.has(k)));
  });
}

/**
 * Load a save. Returns false, changing nothing, when it is not valid. The case store goes first: moving it fires the
 * restart hooks of the paper, rivals, memos and the rest, which empty their stores when the date goes back; the
 * other stores are filled after, so nothing just loaded is wiped. Repairs on the way in:
 * - the clock is paused;
 * - an order that was running when the page went away is closed with a note. Effects land as each job reports, so
 *   whatever it reported stands, and nothing else of it happened;
 * - memos still being written are dropped, so they are written again;
 * - new ids start past the loaded ones.
 */
export function restore(save: unknown): boolean {
  if (!valid(save)) return false;
  const st = JSON.parse(JSON.stringify(save.stores)) as Save["stores"];
  // A save from before the weekly plan existed starts on the default plan, not on whatever was set before loading.
  useCase.setState({ allocation: structuredClone(DEFAULT_ALLOCATION), ...st.case, running: false });

  const staff = st.staff as { chat: Record<string, ChatItem[]>; runs: Record<string, { id: number; status: string }[]>; job: Record<string, string>; feed: { id: number }[] };
  for (const [who, runs] of Object.entries(staff.runs)) {
    for (const r of runs) {
      if (r.status !== "running") continue;
      r.status = "done";
      delete staff.job[who];
      const chat = (staff.chat[who] ??= []);
      for (const c of chat) if (c.k === "thoughts" && c.run === r.id) c.live = false;
      chat.push({ k: "note", text: "This order was cut off when the page reloaded. Anything reported above was done; nothing else was.", run: r.id });
    }
  }
  // Whether the agents are live belongs to this server, not to the save (a demo built with no key said "no API key"
  // on a live server). Older saves carry it; it is dropped, and the app asks the server (lib/save startSaving).
  delete (st.staff as { mode?: unknown }).mode;
  const memos = st.memos as { byDecision: Record<string, { status: string }> };
  memos.byDecision = Object.fromEntries(Object.entries(memos.byDecision).filter(([, e]) => e.status === "ready"));

  for (const { name, store } of SLOTS.slice(1)) store.setState(st[name]);
  useStaff.setState({ active: {}, misfit: {}, packets: [], candidates: {} });
  useGame.setState({ busy: {}, toasts: [] });
  bumpFeed(Math.max(0, ...staff.feed.map((f) => f.id)));
  bumpEditions(Math.max(0, ...(st.paper.editions as { id: number }[]).map((e) => e.id)));
  resetSeen();
  loaded();
  // Memos the save had not finished are written again: a new picks object wakes the memo watcher (watchMemos), which
  // ran when the case store moved, before the save's memos were in.
  useCase.setState((s) => ({ picks: { ...s.picks } }));
  return true;
}

/** Every store back to how a new visitor finds it, and the save cleared. */
export function resetAll() {
  const mode = useStaff.getState().mode; // the server's, not the campaign's: it survives a reset
  for (const { store } of SLOTS) store.setState(initial(store));
  useStaff.setState({ mode });
  useGame.setState({ ...initial(useGame), view: "case" });
  bumpFeed(0);
  bumpEditions(0);
  resetSeen();
  clearSave();
  loaded();
}

export function readSave(): unknown {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(s: Save = snapshot()) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // No storage (a private window, a full disk): the game goes on without saving.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Save whenever the campaign changes, at most every half second, and at once when the page goes away. */
export function watchSave() {
  let t: ReturnType<typeof setTimeout> | null = null;
  const later = () => { if (!t) t = setTimeout(() => { t = null; writeSave(); }, 500); };
  const now = () => { if (t) clearTimeout(t); t = null; writeSave(); };
  const offs = SLOTS.map(({ store }) => store.subscribe(later));
  globalThis.addEventListener?.("pagehide", now);
  return () => { offs.forEach((off) => off()); globalThis.removeEventListener?.("pagehide", now); if (t) clearTimeout(t); };
}

let started = false;
/**
 * At app start: load the saved campaign if there is a valid one (an invalid one is cleared), then keep saving.
 * Once per page, though React mounts twice in development.
 */
export function startSaving() {
  if (!started) {
    started = true;
    const s = readSave();
    if (s && !restore(s)) clearSave();
    // Live agents or the rules: the War room's label is right from the start, not only after the first order.
    void fetch("/api/status").then((r) => r.json()).then((x: { live: boolean }) => useStaff.setState({ mode: x.live ? "live" : "offline" })).catch(() => {});
  }
  return watchSave();
}

/** The prepared demo moment (scripts/demo-start.ts): loaded like any save, then saved as this campaign. */
export async function loadDemo() {
  const demo = (await import("./demo/weiner.json")).default as unknown;
  if (!restore(demo)) return false;
  useGame.setState({ view: "case" });
  writeSave();
  return true;
}
