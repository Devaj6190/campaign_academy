"use client";

import { FACTIONS_2013, factionNow } from "../cases/mayor2013-factions";
import { platformAt } from "../cases/platform";
import { factionWork, popShare, supportIn, useCase, worldNow } from "../cases/store";
import { useGame } from "../store";
import { ACTIONS, BOOKING, type ActionId } from "../engine/catalog";
import { resolve, type Effect } from "../engine/resolve";
import { runOffline } from "./offline";
import { budgetIn, RunCtx, type Line, type RunEvent, type RunRequest, type Step } from "./protocol";
import { profileFor, ROLE_SKILLS, type Candidate } from "./roster";
import { memoriesFor, remember } from "./memory";
import { bumpMorale, nextId, pushChat, useStaff, type ChatItem, type FeedItem, type FollowUp } from "./store";
import { PLACES, short, shortPlace, type Snapshot } from "./world";

// Drives one instruction from the browser: sends it, reads the event stream, and applies each event to the campaign.
// The staff read the live case (the student's world on today's date) and their results land on the case's work layer.

// What one unit of the action catalog is worth in the case. Simulated, and the one place to tune it.
// Money is 1:10. A point of district sentiment is half a point of support there; a point of group feeling is 0.15
// points of support in that group. All staff work fades as its citywide total nears STAFF_CAP points, so the
// student's decisions stay the main lever on the race.
export const SCALE = { money: 10, local: 0.5, group: 0.15 };
export const STAFF_CAP = 5;
export const BASE_BUDGET = 8000 * SCALE.money;

// ponytail: the poll's voter groups are read from the one case that has them (mayor2013-factions); make them a field
// on the case when a second case needs staff.
export function snapshot(): Snapshot {
  const g = useGame.getState();
  const s = useStaff.getState();
  const k = useCase.getState();
  const { c, w } = worldNow();
  const mine = w.poll[c.follow] ?? 0;
  const boost = factionWork();
  // Only the campaign's own work counts toward its cap, not what rivals took away.
  const gained = k.work.reduce((a, x) => a + (c.candidates.some((r) => r.id === x.by) ? 0 : (x.poll[c.follow] ?? 0)), 0);
  const room = Math.max(0, 1 - gained / STAFF_CAP);
  const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
  return {
    race: c.title[0].toLowerCase() + c.title.slice(1),
    candidate: c.candidates.find((x) => x.id === c.follow)?.name ?? c.follow,
    me: c.follow,
    date: k.date,
    daysLeft: Math.max(0, days(k.date, c.electionDate)),
    day: days(c.briefingDate, k.date) + 1,
    min: 0,
    cash: w.budget,
    poll: w.poll,
    names: Object.fromEntries(c.candidates.map((x) => [x.id, x.name])),
    sent: Object.fromEntries(PLACES.map((p) => [p.cd, supportIn(p.cd) ?? mine])),
    factions: FACTIONS_2013.map((f) => ({ id: f.id, name: f.name, feel: factionNow(f, w.groups, mine, c.start.poll[c.follow] ?? 0, boost), size: f.share, values: [], dislikes: [] })),
    staff: g.staff,
    booked: k.bookings.filter((b) => !b.done).map((b) => ({ date: b.date, label: `${BOOKING[b.kind].label} in ${shortPlace(b.cd)}` })),
    daily: DAILY,
    // The platform on record so far, then the planks the student has added.
    manifesto: [...platformAt(c, k.at, k.picks).map((p) => p.text), ...k.work.filter((x) => x.by === "platform").map((x) => x.note ?? x.label)],
    hires: s.hires,
    morale: s.morale,
    scale: { money: SCALE.money, local: SCALE.local * room, group: SCALE.group * room },
  };
}

const person = (id: string) => useGame.getState().staff.find((p) => p.id === id);
const first = (id: string) => { const p = person(id); return p ? short(p) : "someone"; };
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);

export function feed(who: string, text: string, tone?: FeedItem["tone"]) {
  const { date } = useCase.getState();
  useStaff.setState((s) => ({ feed: [{ id: nextId(), date, who, text, tone }, ...s.feed].slice(0, 60) }));
}

function setBusy(id: string, v?: "down" | "up" | "work") {
  useGame.setState((s) => {
    const busy = { ...s.busy };
    if (v) busy[id] = v;
    else delete busy[id];
    return { busy };
  });
}

function packet(from: string, to: string) {
  const id = nextId();
  useStaff.setState((s) => ({ packets: [...s.packets, { id, from, to }] }));
  setTimeout(() => useStaff.setState((s) => ({ packets: s.packets.filter((p) => p.id !== id) })), 1300);
}

/**
 * One finished job lands on the case. District points stay in that district; group points go to the case's own voter
 * group where it simulates one, otherwise to the poll group. Both also move the citywide figure by the share of
 * the city they reach.
 */
/** `cap`: the most this one effect may move the citywide figure either way (used for platform planks). */
export function apply(e: Effect, cap = Infinity) {
  const { c } = worldNow();
  const groups: Record<string, number> = {}, factions: Record<string, number> = {};
  let citywide = 0;
  for (const [cd, d] of Object.entries(e.sent)) citywide += d * popShare(+cd);
  for (const [id, d] of Object.entries(e.factions)) {
    const f = FACTIONS_2013.find((x) => x.id === id);
    if (!f) continue;
    if (f.tracks) groups[f.tracks] = (groups[f.tracks] ?? 0) + d;
    else factions[id] = (factions[id] ?? 0) + d;
    citywide += (d * f.share) / 100;
  }
  useCase.getState().addWork({ by: e.by, label: e.label, note: e.summary.replace(/ \(Not their strength.*$/, ""), cost: e.cost, raised: e.raised, poll: { [c.follow]: Math.max(-cap, Math.min(cap, citywide)) }, groups, factions, districts: e.sent });
}

// --- The candidate in person, from the map ---

/** What the candidate can do in a district himself. He has a few appearances a day; staff can do more. */
export const APPEARANCES: { id: ActionId; label: string; note: string }[] = [
  { id: "canvass", label: "Knock doors", note: "moves this district" },
  { id: "rally", label: "Hold a rally", note: "moves this district more" },
  { id: "house_party", label: "House party", note: "raises money" },
];
export const DAILY = 2;

export const appearancesToday = () => { const { work, date } = useCase.getState(); return work.filter((x) => x.by === "candidate" && x.date === date).length; };

/** What an appearance would cost and do, without doing it. */
export const preview = (cd: number, id: ActionId, faction?: string) => resolve(snapshot(), "candidate", id, { district: cd, faction }, { quality: 1, seed: cd * 7 + appearancesToday(), load: 1 });

/** The candidate does it. Refused when he is out of appearances for the day or the money is not there. */
export function appear(cd: number, id: ActionId, faction?: string): { ok: boolean; text: string } {
  if (appearancesToday() >= DAILY) return { ok: false, text: "No appearances left today. Send staff, or let the clock run to tomorrow." };
  const e = preview(cd, id, faction);
  if (e.cost > worldNow().w.budget) return { ok: false, text: "The campaign does not have the money for that." };
  apply(e);
  feed("candidate", `The candidate: ${e.summary}`, e.raised > e.cost ? "pos" : undefined);
  return { ok: true, text: e.summary };
}

/**
 * The day's booked appearances happen: the candidate does each in person, inside his daily limit. One that does not
 * fit today moves to tomorrow; one the campaign cannot pay for is cancelled. The clock calls this as each day starts.
 */
export function runBookings() {
  const s = useCase.getState(), c = worldNow().c;
  const set = (id: number, patch: Partial<{ date: string; done: string }>) => useCase.setState((k) => ({ bookings: k.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  for (const b of s.bookings.filter((x) => !x.done && x.date <= s.date)) {
    const what = `${BOOKING[b.kind].label} in ${shortPlace(b.cd)}`;
    // Nothing the campaign booked happens on election day or after it.
    if (s.date >= c.electionDate) { set(b.id, { done: "Dropped: the election came first." }); continue; }
    if (appearancesToday() >= DAILY) {
      const next = new Date(Date.parse(s.date) + 86_400_000).toISOString().slice(0, 10);
      if (next >= c.electionDate) set(b.id, { done: "Dropped: no day left before the election." });
      else { set(b.id, { date: next }); feed("candidate", `The candidate's day is full, so ${what} moves to tomorrow.`); }
      continue;
    }
    const r = appear(b.cd, BOOKING[b.kind].action, b.faction);
    set(b.id, { done: r.ok ? r.text : `Cancelled: ${r.text}` });
    if (!r.ok) feed("candidate", `Cancelled, ${what}: ${r.text}`, "neg");
  }
}

/** Hand a district to the Field Director: a draft order waits in their box in the War room. */
export function sendStaff(cd: number) {
  useStaff.setState((s) => ({ draft: { ...s.draft, fd: `Canvass ${shortPlace(cd)} this week and tell me what you find` } }));
  useGame.setState({ view: "war", person: "fd" });
}

type Thoughts = Extract<ChatItem, { k: "thoughts" }>;
function patchThoughts(director: string, runId: number, fn: (t: Thoughts) => Thoughts) {
  useStaff.setState((s) => ({ chat: { ...s.chat, [director]: (s.chat[director] ?? []).map((c) => (c.k === "thoughts" && c.run === runId ? fn(c) : c)) } }));
}

/** How many campaign days after a report the director comes back about it. */
export const FOLLOW_UP_DAYS = 3;
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/** Where a district or voter group stands now, for the follow-up's before and after. */
function standing(): { place: (cd: number) => number | null; group: (id: string) => number | null } {
  const { c, w } = worldNow();
  const mine = w.poll[c.follow] ?? 0, boost = factionWork();
  return {
    place: (cd) => supportIn(cd),
    group: (id) => { const f = FACTIONS_2013.find((x) => x.id === id); return f ? factionNow(f, w.groups, mine, c.start.poll[c.follow] ?? 0, boost) : null; },
  };
}

function planFollowUp(director: string, run: number, order: string, results: string[], where: { places: Set<number>; groups: Set<string> }) {
  const now = standing();
  const places = Object.fromEntries([...where.places].flatMap((cd) => { const v = now.place(cd); return v === null ? [] : [[cd, v]]; }));
  const groups = Object.fromEntries([...where.groups].flatMap((g) => { const v = now.group(g); return v === null ? [] : [[g, v]]; }));
  const due = new Date(Date.parse(useCase.getState().date) + FOLLOW_UP_DAYS * 86_400_000).toISOString().slice(0, 10);
  useStaff.setState((s) => ({ followups: [...s.followups.filter((f) => f.run !== run), { run, director, order, due, results, places, groups }] }));
}

/** The follow-ups whose day has come and whose director is free, oldest first. */
export const dueFollowUps = () => {
  const { date } = useCase.getState(), s = useStaff.getState();
  return s.followups.filter((f) => !f.done && f.due <= date && !s.active[f.director] && useGame.getState().staff.some((p) => p.id === f.director && p.name));
};

/** The director comes back about its own earlier work: what it did, how things stand now, and next steps. */
export function comeBack(f: FollowUp) {
  useStaff.setState((s) => ({ followups: s.followups.map((x) => (x.run === f.run ? { ...x, done: true } : x)) }));
  const now = standing();
  const name = (g: string) => FACTIONS_2013.find((x) => x.id === g)?.name ?? g;
  const moved = [
    ...Object.entries(f.places).map(([cd, then]) => { const v = now.place(+cd); return v === null ? "" : `${shortPlace(+cd)} ${pct(then)} then, ${pct(v)} now`; }),
    ...Object.entries(f.groups).map(([g, then]) => { const v = now.group(g); return v === null ? "" : `${name(g)} ${pct(then)} then, ${pct(v)} now`; }),
  ].filter(Boolean);
  const days = Math.round((Date.parse(useCase.getState().date) - Date.parse(f.due)) / 86_400_000) + FOLLOW_UP_DAYS;
  // What the rival campaigns did in the same places and groups since then: often the reason a gain did not hold.
  const { c } = worldNow();
  const since = new Date(Date.parse(f.due) - FOLLOW_UP_DAYS * 86_400_000).toISOString().slice(0, 10);
  const rivals = useCase.getState().work.filter((x) => x.date >= since && x.by !== c.follow && c.candidates.some((r) => r.id === x.by) && (Object.keys(x.districts).some((cd) => +cd in f.places) || Object.keys({ ...x.groups, ...x.factions }).some((g) => g in f.groups))).map((x) => x.note ?? x.label);
  const text = `(Not from the campaigner.) ${days} days ago your team finished ${f.order}.\nWhat it did: ${f.results.join(" ")}\nWhere things stand now: ${moved.join("; ") || "no change to report"}.\nWhat the rival campaigns did there since: ${rivals.length ? rivals.join(" ") : "nothing"}.\nCome back to the campaigner about it, unprompted, with what you would do next.`;
  void instruct(f.director, text, 0, undefined, undefined, undefined, f.order);
}

/** What each run got done, for the memory line written when it reports, and where it worked, for the follow-up. */
const did = new Map<number, string[]>();
const touched = new Map<number, { places: Set<number>; groups: Set<string> }>();
const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

function handle(director: string, runId: number, e: RunEvent) {
  const patchRun = (fn: (r: NonNullable<ReturnType<typeof current>>) => void) =>
    useStaff.setState((s) => ({ runs: { ...s.runs, [director]: (s.runs[director] ?? []).map((r) => (r.id === runId ? (fn(r), { ...r }) : r)) } }));
  const current = () => useStaff.getState().runs[director]?.find((r) => r.id === runId);

  switch (e.t) {
    case "start":
      useStaff.setState({ mode: e.mode });
      setBusy(director, "work");
      break;
    case "say":
      pushChat(director, { k: "them", text: e.text, run: runId });
      break;
    case "thought":
      patchThoughts(director, runId, (t) => ({ ...t, items: [...t.items, { who: e.who, text: e.text }] }));
      break;
    case "plan":
      patchRun((r) => { r.items = e.items; });
      break;
    case "delegate": {
      if (!useGame.getState().staff.some((p) => p.id === e.to && p.name)) break; // left mid-run
      packet(director, e.to);
      setBusy(e.to, "down");
      setTimeout(() => setBusy(e.to, "work"), 900);
      useStaff.setState((s) => ({ job: { ...s.job, [e.to]: e.job } }));
      patchRun((r) => { r.jobs = [...r.jobs, { to: e.to, job: e.job, done: false }]; });
      pushChat(e.to, { k: "me", text: `From ${first(director)}: ${e.job}` });
      feed(director, `${cap(first(director))} → ${first(e.to)}: ${e.job}`);
      break;
    }
    case "action": {
      did.set(runId, [...(did.get(runId) ?? []), e.effect.summary.replace(/ \(Not their strength.*$/, "")]);
      {
        const t = touched.get(runId) ?? { places: new Set<number>(), groups: new Set<string>() };
        // A booked appearance has not happened yet: it is the calendar's, not this follow-up's.
        if (!e.effect.booking) {
          for (const cd of Object.keys(e.effect.sent)) t.places.add(+cd);
          for (const f of Object.keys(e.effect.factions)) t.groups.add(f);
        }
        touched.set(runId, t);
      }
      apply(e.effect);
      if (e.effect.booking && e.effect.district) useCase.getState().book({ date: e.effect.booking.date, kind: e.effect.booking.kind, cd: e.effect.district, faction: e.effect.faction, by: e.effect.by });
      if (!e.effect.fit) {
        const by = e.effect.by;
        useStaff.setState((s) => ({ misfit: { ...s.misfit, [by]: true } }));
        setTimeout(() => useStaff.setState((s) => ({ misfit: { ...s.misfit, [by]: false } })), 8000);
      }
      const where = e.effect.district ? ` in ${shortPlace(e.effect.district)}` : "";
      useStaff.setState((s) => ({ job: { ...s.job, [e.effect.by]: `${e.effect.action in ACTIONS ? ACTIONS[e.effect.action as keyof typeof ACTIONS].doing : e.effect.label}${where}` } }));
      pushChat(director, { k: "receipt", effect: e.effect, by: e.effect.by, run: runId });
      if (e.effect.by !== director) pushChat(e.effect.by, { k: "receipt", effect: e.effect, by: e.effect.by });
      feed(e.effect.by, e.effect.summary, e.effect.raised > e.effect.cost ? "pos" : undefined);
      break;
    }
    case "job-done":
      packet(e.to, director);
      setBusy(e.to, "up");
      setTimeout(() => setBusy(e.to), 1000);
      useStaff.setState((s) => { const job = { ...s.job }; delete job[e.to]; return { job }; });
      patchRun((r) => { r.jobs = r.jobs.map((j) => (j.to === e.to && !j.done ? { ...j, done: true, summary: e.summary } : j)); });
      if (e.summary) pushChat(e.to, { k: "them", text: e.summary });
      { const job = current()?.jobs.find((j) => j.to === e.to); if (job) remember(e.to, `${cap(first(director))} gave me "${job.job}". ${e.summary}`); }
      break;
    case "proposals":
      pushChat(director, { k: "proposals", text: e.text, options: e.options, run: runId });
      if (current()?.followUp) {
        remember(director, `I came back to the boss about ${current()?.origin} and offered: ${e.options.map((o) => o.title).join("; ")}.`);
        useGame.setState((g) => ({ toasts: [...g.toasts.slice(-2), { id: Date.now(), staff: director, text: e.text }], unread: { ...g.unread, [director]: true } }));
      } else remember(director, `The boss asked "${clip(current()?.text ?? "", 90)}". I offered: ${e.options.map((o) => o.title).join("; ")}.`);
      feed(director, `${cap(first(director))} answered with ${e.options.length} options.`);
      break;
    case "report":
      pushChat(director, { k: "report", text: e.text, ask: e.ask, state: e.ask ? "open" : "approved", spent: e.spent, raised: e.raised, run: runId });
      {
        // The plain record of the order, then the one thing the director chose to keep.
        const run = current(), done = did.get(runId) ?? [], where = touched.get(runId);
        did.delete(runId);
        touched.delete(runId);
        // Real work gets one follow-up a few days on; a follow-up does not get one of its own.
        if (done.length && where && (where.places.size || where.groups.size) && !run?.followUp) planFollowUp(director, runId, run?.picked ? `the option you picked ("${clip(run.text, 80)}")` : `"${clip(run?.text ?? "", 90)}"`, done, where);
        remember(director, `${run?.picked ? "Carried out the option the boss picked" : run?.follow ? "With the extra money approved" : `Order: "${clip(run?.text ?? "", 90)}"`}. ${done.length ? clip(done.join(" "), 150) : "Nothing was done."}${e.ask ? ` I asked for $${e.ask.amount.toLocaleString("en-US")} more ${e.ask.reason}.` : ""}`);
        if (e.note) remember(director, `Note to self: ${e.note}`);
      }
      if (current()?.follow || current()?.picked) break; // an approved ask or a picked option is not a new instruction to grade
      pushChat(director, { k: "coach", clarity: e.clarity, fit: e.fit, missing: e.missing, text: e.coaching, run: runId });
      // Clear orders to the right person lift morale; vague ones and misfits wear people down.
      bumpMorale(director, e.clarity >= 3 ? 3 : e.clarity <= 1 ? -3 : 0);
      if (e.fit < 1) for (const j of current()?.jobs ?? []) bumpMorale(j.to, -2);
      feed(director, `${cap(first(director))} reported back${e.ask ? ` and wants $${e.ask.amount.toLocaleString("en-US")} more` : ""}.`, e.ask ? "warm" : undefined);
      break;
    case "error":
      pushChat(director, { k: "note", text: e.text, run: runId });
      break;
    case "done":
      patchRun((r) => { r.status = "done"; r.items = r.items.map((i) => ({ ...i, status: "completed" })); });
      break;
  }
}

/**
 * `extra` is the approved amount when this continues an earlier order (`followOf`). `own` is a budget that comes with
 * the order from elsewhere (a picked option's price). Otherwise the order's own words set it, or the default does.
 */
/**
 * `extra` is the approved amount when this continues an earlier order (`followOf`); `own` a budget that comes with the
 * order (a picked option's price); `steps` a picked option's exact actions. `about` makes this the director coming
 * back about its own earlier work: `text` is then what it is told, not something the campaigner said.
 */
export async function instruct(id: string, text: string, extra = 0, followOf?: string, own?: number, steps?: Step[], about?: string) {
  const s = useStaff.getState();
  if (s.active[id]) {
    pushChat(id, { k: "note", text: `${cap(first(id))} is still on the last job. Wait for the report.` });
    return;
  }
  const runId = Date.now() % 1e9;
  const history: Line[] = (s.chat[id] ?? []).flatMap((c) =>
    c.k === "me" || c.k === "them" ? [{ who: c.k, text: c.text }]
    : c.k === "report" ? [{ who: "them" as const, text: c.text }]
    : c.k === "proposals" ? [{ who: "them" as const, text: `${c.text} Options: ${c.options.map((o, i) => `${i + 1}) ${o.title}`).join("; ")}.` }]
    : []);
  // The budget is what the order says, never more than the campaign has. An order that names no limit gets the default.
  const stated = followOf ? null : (own ?? budgetIn(text));
  const budget = Math.max(0, Math.min(followOf ? extra : (stated ?? BASE_BUDGET), worldNow().w.budget));
  if (about) pushChat(id, { k: "note", text: `${cap(first(id))} is coming back about ${about}.`, run: runId });
  else pushChat(id, { k: "me", text, run: runId, budget: stated === null ? undefined : budget });
  pushChat(id, { k: "thoughts", run: runId, items: [], live: true });
  useStaff.setState((st) => ({ active: { ...st.active, [id]: runId }, runs: { ...st.runs, [id]: [{ id: runId, text, origin: about ?? followOf ?? text, follow: !!followOf, picked: !!steps?.length, followUp: !!about, items: [], jobs: [], status: "running" as const }, ...(st.runs[id] ?? [])].slice(0, 6) } }));
  setBusy(id, "down");
  if (!about) feed("you", `You → ${first(id)}: ${text}`);

  const req: RunRequest = { director: id, text, snapshot: snapshot(), history, budget, runId, followOf, steps, followUp: !!about || undefined, memory: memoriesFor([id, ...useGame.getState().staff.filter((p) => p.boss === id).map((p) => p.id)]) };
  // A reset or a loaded campaign while this runs: the run belongs to a campaign that is gone, and nothing of it lands.
  const on = (e: RunEvent) => { if (useStaff.getState().runs[id]?.some((r) => r.id === runId)) handle(id, runId, e); };
  try {
    const res = await fetch("/api/staff/instruct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    // A refused order (vacant post, empty text) is not a network failure: say so instead of simulating.
    if (res.status >= 400 && res.status < 500) {
      pushChat(id, { k: "note", text: "That order couldn't be given." });
      return;
    }
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) on(JSON.parse(line) as RunEvent);
      }
    }
  } catch (err) {
    // Server unreachable: run the simulation right here so the war room still works.
    console.warn("[staff] falling back to local simulation:", err);
    if (!useStaff.getState().runs[id]?.find((r) => r.id === runId)?.jobs.length) await runOffline(new RunCtx(req, on));
  } finally {
    // Whatever happened, nobody on this run stays stuck looking busy. A run reset away has nothing left to tidy, and
    // must not touch the new campaign (its director may already be on a new job).
    if (useStaff.getState().runs[id]?.some((r) => r.id === runId)) {
      for (const j of useStaff.getState().runs[id]?.find((r) => r.id === runId)?.jobs ?? []) {
        if (!j.done) {
          setBusy(j.to);
          useStaff.setState((s) => ({ job: Object.fromEntries(Object.entries(s.job).filter(([k]) => k !== j.to)) }));
        }
      }
      useStaff.setState((s) => ({ runs: { ...s.runs, [id]: (s.runs[id] ?? []).map((r) => (r.id === runId ? { ...r, status: "done" as const, jobs: r.jobs.map((j) => ({ ...j, done: true })) } : r)) } }));
      patchThoughts(id, runId, (t) => ({ ...t, live: false }));
      setBusy(id);
      useStaff.setState((st) => { const active = { ...st.active }; delete active[id]; return { active }; });
    }
  }
}

/** Turn one of a director's options into the order, as if the campaigner had typed it. */
export function pick(id: string, index: number, option: number) {
  const item = useStaff.getState().chat[id]?.[index];
  if (item?.k !== "proposals" || item.picked !== undefined || !item.options[option]) return;
  // A director still on another job cannot start this one: the card stays open to pick when they report.
  if (useStaff.getState().active[id]) {
    pushChat(id, { k: "note", text: `${cap(first(id))} is still on the last job. Pick this option again when they report.` });
    return;
  }
  useStaff.setState((s) => ({ chat: { ...s.chat, [id]: s.chat[id].map((c, i) => (i === index && c.k === "proposals" ? { ...c, picked: option } : c)) } }));
  const o = item.options[option];
  remember(id, `The boss picked my option "${o.title}".`);
  void instruct(id, o.order, 0, undefined, o.cost, o.steps);
}

export function answerAsk(id: string, index: number, yes: boolean) {
  const item = useStaff.getState().chat[id]?.[index];
  if (item?.k !== "report" || !item.ask || item.state !== "open") return;
  const ask = item.ask;
  useStaff.setState((s) => ({ chat: { ...s.chat, [id]: s.chat[id].map((c, i) => (i === index && c.k === "report" ? { ...c, state: yes ? "approved" : "declined" } : c)) } }));
  const origin = useStaff.getState().runs[id]?.find((r) => r.status === "done")?.origin;
  remember(id, `The boss ${yes ? "approved" : "turned down"} the $${ask.amount.toLocaleString("en-US")} more I asked for ${ask.reason}.`);
  if (yes) instruct(id, `Approved: another $${ask.amount.toLocaleString("en-US")} ${ask.reason}. Go ahead.`, ask.amount, origin);
  else {
    pushChat(id, { k: "them", text: "Understood. We'll make do." });
    bumpMorale(id, -2);
  }
}

// --- The team: hiring, letting go, reassigning ---

export async function loadCandidates(post: string) {
  const role = useGame.getState().staff.find((p) => p.id === post)?.role;
  if (!role || useStaff.getState().candidates[post]) return;
  useStaff.setState((s) => ({ candidates: { ...s.candidates, [post]: { status: "loading", list: [] } } }));
  const w = snapshot();
  const context = `${w.candidate}'s campaign in ${w.race}. Today is ${w.date}, ${w.daysLeft} days to the primary, with $${Math.round(w.cash).toLocaleString("en-US")} left to spend under the cap. Poll: ${Object.entries(w.poll).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([id, v]) => `${w.names[id]} ${Math.round(v)}`).join(", ")}.`;
  try {
    const res = await fetch("/api/staff/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, context }) });
    const data = (await res.json()) as { list: Candidate[]; mode: "live" | "offline" };
    useStaff.setState((s) => ({ candidates: { ...s.candidates, [post]: { status: "ready", list: data.list, mode: data.mode } } }));
  } catch {
    const { POOL, genericPool } = await import("./roster");
    useStaff.setState((s) => ({ candidates: { ...s.candidates, [post]: { status: "ready", list: POOL[role] ?? genericPool(role), mode: "offline" } } }));
  }
}

export function hire(post: string, c: Candidate) {
  const p = useGame.getState().staff.find((x) => x.id === post);
  if (!p || p.name) return;
  const base = profileFor(post, p.role);
  useGame.setState((g) => ({ staff: g.staff.map((x) => (x.id === post ? { ...x, name: c.name, good: c.good, weak: c.weak } : x)) }));
  useStaff.setState((s) => {
    const candidates = { ...s.candidates };
    delete candidates[post];
    return { hires: { ...s.hires, [post]: { skills: ROLE_SKILLS[p.role] ?? base.skills, cost: c.cost, effect: c.effect, turf: base.turf, voice: c.voice, salary: c.salary } }, morale: { ...s.morale, [post]: 80 }, candidates };
  });
  pushChat(post, { k: "them", text: `Glad to be here. Tell me where you want me first.` });
  feed(post, `You filled the ${p.role} post.`, "pos");
}

export function letGo(id: string) {
  const g = useGame.getState();
  const p = g.staff.find((x) => x.id === id);
  if (!p?.name || useStaff.getState().active[id]) return;
  useGame.setState((s) => ({ staff: s.staff.map((x) => (x.id === id ? { id: x.id, boss: x.boss, role: x.role } : x)), person: id }));
  useStaff.setState((s) => { const hires = { ...s.hires }; delete hires[id]; const chat = { ...s.chat }; delete chat[id]; return { hires, chat }; });
  // Colleagues notice.
  for (const x of g.staff) if (x.name && x.id !== id && (x.boss === p.boss || x.boss === id || x.id === p.boss)) bumpMorale(x.id, -5);
  feed(id, `You let ${short(p)} go. The team is rattled.`, "neg");
}

export function reassign(id: string, boss: string) {
  const g = useGame.getState();
  const p = g.staff.find((x) => x.id === id);
  if (!p?.name || !p.boss || p.boss === boss || useStaff.getState().active[id]) return;
  useGame.setState((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, boss } : x)) }));
  bumpMorale(id, -2);
  feed(id, `${cap(short(p))} now reports to ${first(boss)}.`);
}
