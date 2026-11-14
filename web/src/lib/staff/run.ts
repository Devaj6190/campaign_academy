"use client";

import { useGame } from "../store";
import { ACTIONS } from "./catalog";
import type { Effect } from "./engine";
import { runOffline } from "./offline";
import { RunCtx, type Line, type RunEvent, type RunRequest } from "./protocol";
import { profileFor, ROLE_SKILLS, type Candidate } from "./roster";
import { bumpMorale, nextId, pushChat, useStaff, type FeedItem } from "./store";
import { shortPlace, type Snapshot } from "./world";

// Drives one instruction from the browser: sends it, reads the event stream, and applies each event to the game.

export const BASE_BUDGET = 8000;

export function snapshot(): Snapshot {
  const g = useGame.getState();
  const s = useStaff.getState();
  return {
    day: g.day,
    min: g.min,
    cash: g.cash,
    poll: g.poll,
    sent: g.sent,
    factions: g.factions.map(({ id, name, feel, size, values, dislikes }) => ({ id, name, feel, size, values, dislikes })),
    staff: g.staff,
    manifesto: g.manifesto,
    hires: s.hires,
    morale: s.morale,
  };
}

const nameOf = (id: string) => useGame.getState().staff.find((p) => p.id === id)?.name ?? "Someone";
const first = (id: string) => nameOf(id).split(" ")[0];

export function feed(who: string, text: string, tone?: FeedItem["tone"]) {
  const { day, min } = useGame.getState();
  useStaff.setState((s) => ({ feed: [{ id: nextId(), day, min, who, text, tone }, ...s.feed].slice(0, 60) }));
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

const apply = (e: Effect) => useGame.getState().applyEffect(e, "staff");

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
      pushChat(director, { k: "them", text: e.text });
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
      feed(director, `${first(director)} → ${first(e.to)}: ${e.job}`);
      break;
    }
    case "action": {
      apply(e.effect);
      const where = e.effect.district ? ` in ${shortPlace(e.effect.district)}` : "";
      useStaff.setState((s) => ({ job: { ...s.job, [e.effect.by]: `${ACTIONS[e.effect.action].doing}${where}` } }));
      pushChat(director, { k: "receipt", effect: e.effect, by: e.effect.by });
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
      break;
    case "report":
      pushChat(director, { k: "report", text: e.text, ask: e.ask, state: e.ask ? "open" : "approved", spent: e.spent, raised: e.raised });
      if (current()?.follow) break; // an approved ask continues an order that was already graded
      pushChat(director, { k: "coach", clarity: e.clarity, fit: e.fit, missing: e.missing, text: e.coaching });
      // Clear orders to the right person lift morale; vague ones and misfits wear people down.
      bumpMorale(director, e.clarity >= 3 ? 3 : e.clarity <= 1 ? -3 : 0);
      if (e.fit < 1) for (const j of current()?.jobs ?? []) bumpMorale(j.to, -2);
      feed(director, `${first(director)} reported back${e.ask ? ` and wants $${e.ask.amount.toLocaleString("en-US")} more` : ""}.`, e.ask ? "warm" : undefined);
      break;
    case "error":
      pushChat(director, { k: "note", text: e.text });
      break;
    case "done":
      patchRun((r) => { r.status = "done"; r.items = r.items.map((i) => ({ ...i, status: "completed" })); });
      break;
  }
}

export async function instruct(id: string, text: string, extra = 0, followOf?: string) {
  const s = useStaff.getState();
  if (s.active[id]) {
    pushChat(id, { k: "note", text: `${first(id)} is still on the last job. Wait for the report.` });
    return;
  }
  const runId = Date.now() % 1e9;
  const history: Line[] = (s.chat[id] ?? []).flatMap((c) => (c.k === "me" || c.k === "them" ? [{ who: c.k, text: c.text }] : c.k === "report" ? [{ who: "them" as const, text: c.text }] : []));
  pushChat(id, { k: "me", text });
  useStaff.setState((st) => ({ active: { ...st.active, [id]: runId }, runs: { ...st.runs, [id]: [{ id: runId, text, origin: followOf ?? text, follow: !!followOf, items: [], jobs: [], status: "running" as const }, ...(st.runs[id] ?? [])].slice(0, 6) } }));
  setBusy(id, "down");
  feed("you", `You → ${first(id)}: ${text}`);

  const req: RunRequest = { director: id, text, snapshot: snapshot(), history, budget: followOf ? extra : BASE_BUDGET, runId, followOf };
  const on = (e: RunEvent) => handle(id, runId, e);
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
    // Whatever happened, nobody on this run stays stuck looking busy.
    for (const j of useStaff.getState().runs[id]?.find((r) => r.id === runId)?.jobs ?? []) {
      if (!j.done) {
        setBusy(j.to);
        useStaff.setState((s) => ({ job: Object.fromEntries(Object.entries(s.job).filter(([k]) => k !== j.to)) }));
      }
    }
    useStaff.setState((s) => ({ runs: { ...s.runs, [id]: (s.runs[id] ?? []).map((r) => (r.id === runId ? { ...r, status: "done" as const, jobs: r.jobs.map((j) => ({ ...j, done: true })) } : r)) } }));
    setBusy(id);
    useStaff.setState((st) => { const active = { ...st.active }; delete active[id]; return { active }; });
  }
}

export function answerAsk(id: string, index: number, yes: boolean) {
  const item = useStaff.getState().chat[id]?.[index];
  if (item?.k !== "report" || !item.ask || item.state !== "open") return;
  const ask = item.ask;
  useStaff.setState((s) => ({ chat: { ...s.chat, [id]: s.chat[id].map((c, i) => (i === index && c.k === "report" ? { ...c, state: yes ? "approved" : "declined" } : c)) } }));
  const origin = useStaff.getState().runs[id]?.find((r) => r.status === "done")?.origin;
  if (yes) instruct(id, `Approved: another $${ask.amount.toLocaleString("en-US")} ${ask.reason}. Go ahead.`, ask.amount, origin);
  else {
    pushChat(id, { k: "them", text: "Understood. We'll make do." });
    bumpMorale(id, -2);
  }
}

// --- The team: hiring, letting go, reassigning ---

const payroll = (delta: number) =>
  useGame.setState((g) => ({ losses: g.losses.map((c, i) => (i === 0 ? { ...c, v: Math.max(0, c.v + delta), items: c.items.map(([n, v], x) => [n, x === 0 ? Math.max(0, v + delta) : v] as [string, number]) } : c)) }));

export async function loadCandidates(post: string) {
  const role = useGame.getState().staff.find((p) => p.id === post)?.role;
  if (!role || useStaff.getState().candidates[post]) return;
  useStaff.setState((s) => ({ candidates: { ...s.candidates, [post]: { status: "loading", list: [] } } }));
  const g = useGame.getState();
  const context = `Day ${g.day} of 30, $${g.cash.toLocaleString("en-US")} in the bank, candidate Adrian Cole stands for more housing near transit, better buses, level police funding and help for small business, and is polling ${g.poll.cole}% to Hale's ${g.poll.hale}%.`;
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
  useGame.setState((g) => ({ staff: g.staff.map((x) => (x.id === post ? { ...x, name: c.name, good: c.good, weak: c.weak, doing: "Settling in" } : x)) }));
  useStaff.setState((s) => {
    const candidates = { ...s.candidates };
    delete candidates[post];
    return { hires: { ...s.hires, [post]: { skills: ROLE_SKILLS[p.role] ?? base.skills, cost: c.cost, effect: c.effect, turf: base.turf, voice: c.voice, salary: c.salary } }, morale: { ...s.morale, [post]: 80 }, candidates };
  });
  payroll(c.salary);
  pushChat(post, { k: "them", text: `Glad to be here. Tell me where you want me first.` });
  feed(post, `You hired ${c.name} as ${p.role} ($${c.salary.toLocaleString("en-US")}/day).`, "pos");
  useGame.setState((g) => ({ tasks: g.tasks.map((t) => (t.text.toLowerCase().includes(p.role.toLowerCase().split(",")[0].toLowerCase()) ? { ...t, done: true } : t)) }));
}

export function letGo(id: string) {
  const g = useGame.getState();
  const p = g.staff.find((x) => x.id === id);
  if (!p?.name || useStaff.getState().active[id]) return;
  const salary = useStaff.getState().hires[id]?.salary ?? profileFor(id, p.role).salary;
  useGame.setState((s) => ({ staff: s.staff.map((x) => (x.id === id ? { id: x.id, boss: x.boss, role: x.role } : x)), person: id }));
  useStaff.setState((s) => { const hires = { ...s.hires }; delete hires[id]; const chat = { ...s.chat }; delete chat[id]; return { hires, chat }; });
  payroll(-salary);
  // Colleagues notice.
  for (const x of g.staff) if (x.name && x.id !== id && (x.boss === p.boss || x.boss === id || x.id === p.boss)) bumpMorale(x.id, -5);
  feed(id, `You let ${p.name} go. Payroll −$${salary.toLocaleString("en-US")}/day; the team is rattled.`, "neg");
}

export function reassign(id: string, boss: string) {
  const g = useGame.getState();
  const p = g.staff.find((x) => x.id === id);
  if (!p?.name || !p.boss || p.boss === boss || useStaff.getState().active[id]) return;
  useGame.setState((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, boss } : x)) }));
  bumpMorale(id, -2);
  feed(id, `${p.name.split(" ")[0]} now reports to ${first(boss)}.`);
}
