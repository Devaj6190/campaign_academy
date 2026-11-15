"use client";

import { ArrowDownRight, ArrowUp, Brain, Check, ChevronDown, CircleDollarSign, Loader2, MapPin, MessageSquare, Plus, Shuffle, Sparkles, UserMinus, UserPlus, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Fit } from "@/components/Fit";
import { TypeOut } from "@/components/TypeOut";
import { Avatar, Button, Dock, DockButton, Label, Meter, Section, ViewHeader } from "@/components/ui";
import { AgentPlan, type PlanTask } from "@/components/ui21/agent-plan";
import { ShaderBackground } from "@/components/ui21/dithering";
import type { Staff } from "@/lib/data";
import { ACTIONS, BOOKING } from "@/lib/engine/catalog";
import type { Effect } from "@/lib/engine/resolve";
import { profileFor } from "@/lib/staff/roster";
import { answerAsk, hire, letGo, loadCandidates, pick, reassign } from "@/lib/staff/run";
import { useStaff, type ChatItem, type Run } from "@/lib/staff/store";
import { FACTIONS_2013 } from "@/lib/cases/mayor2013-factions";
import { currentCase, shortDate, shortMoney, staffMoney, useCase } from "@/lib/cases/store";
import { short, shortPlace } from "@/lib/staff/world";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { Cite } from "./CaseView";

// Fixed logical canvas: you on top, direct reports below, their people below them.
const W = 900, H = 520;
const YOU = { x: 450, y: 58, r: 30 };
type Pt = { x: number; y: number; r: number };

function layout(staff: Staff[]) {
  const pos: Record<string, Pt> = { you: YOU };
  const dirs = staff.filter((p) => !p.boss);
  dirs.forEach((p, i) => (pos[p.id] = { x: 75 + (i * 750) / (dirs.length - 1), y: 226, r: 26 }));
  const subs = dirs.flatMap((d) => staff.filter((p) => p.boss === d.id));
  subs.forEach((p, i) => (pos[p.id] = { x: 50 + (i * 800) / Math.max(1, subs.length - 1), y: 408, r: 21 }));
  return pos;
}

// Bezier from a boss's label to a report's avatar. Reversed for reports travelling back up.
function edge(a: Pt, b: Pt, sub: boolean, up = false) {
  const y1 = a.y + a.r + (sub ? 52 : 46), y2 = b.y - b.r - 10, ym = (y1 + y2) / 2;
  return up ? `M${b.x} ${y2}C${b.x} ${ym},${a.x} ${ym},${a.x} ${y1}` : `M${a.x} ${y1}C${a.x} ${ym},${b.x} ${ym},${b.x} ${y2}`;
}

// Things a student might plausibly say to each post, to get them started. Places and voter groups are the case's own.
const IDEAS: Record<string, string[]> = {
  cm: ["Sit down with union leaders this week and tell me where we stand", "Put a week of events for Black voters in Brooklyn on the calendar"],
  fd: ["Canvass Latino voters in Jackson Heights this week", "Train volunteers in the Bronx this weekend"],
  fin: ["Raise money this week with call time and a donor dinner", "Send a small-dollar email to liberal supporters tonight"],
  com: ["Pitch reporters a story for women voters today", "Run digital ads for voters under 45 this week"],
  pol: ["Write a brief on the tax plan for union households this week", "Draft a brief that answers moderates' doubts before Friday"],
  dat: ["Build target lists for the Bronx districts this week", "Find where older voters are winnable in southeast Queens"],
};
const ideasFor = (p: Staff) => IDEAS[p.id] ?? [`${p.role.split(",")[0]}: what should we do this week?`, "Pick the district where you can do the most good tomorrow"];

export function WarRoom() {
  const staff = useGame((s) => s.staff);
  const person = useGame((s) => s.person);
  const busy = useGame((s) => s.busy);
  const unread = useGame((s) => s.unread);
  const packets = useStaff((s) => s.packets);
  const job = useStaff((s) => s.job);
  const misfit = useStaff((s) => s.misfit);
  const morale = useStaff((s) => s.morale);
  const active = useStaff((s) => s.active);
  const pos = layout(staff);
  const sel = staff.find((p) => p.id === person);
  const pick = (id: string | null) => useGame.setState((s) => ({ person: id, unread: id ? { ...s.unread, [id]: false } : s.unread }));
  const vacancies = staff.filter((p) => !p.name);
  const directors = staff.filter((p) => !p.boss && p.name);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const confirm = !!person && confirmFor === person;
  // Reassigning opens a chooser in the side panel (a menu inside the dock would be clipped by its scroll area).
  const [moving, setMoving] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader title="War room" sub="You direct. Your reports plan the work and hand it to their people." right={<ModeBadge />} />
        <div className="relative min-h-0 flex-1 px-6 pb-24" onClick={() => pick(null)}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-screen [mask-image:radial-gradient(ellipse_65%_60%_at_50%_0%,black,transparent)]">
            <ShaderBackground />
          </div>
          <Fit w={W} h={H}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 overflow-visible" aria-hidden>
              <defs>
                <filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3" /></filter>
              </defs>
              {staff.map((p) => {
                const state = busy[p.id];
                return (
                  <path
                    key={p.id}
                    d={edge(pos[p.boss ?? "you"], pos[p.id], !!p.boss)}
                    fill="none"
                    strokeWidth={state || misfit[p.id] ? 1.4 : 1}
                    stroke={misfit[p.id] ? "var(--color-neg)" : state ? "var(--color-warm)" : "rgb(255 255 255 / 0.1)"}
                    strokeOpacity={state === "work" ? 0.45 : 1}
                    className={cn(state === "down" && "edge-flow", state === "up" && "edge-flow up")}
                  />
                );
              })}
              {/* Work in transit: a spark runs down when a job is handed over, and back up with the report. */}
              {packets.map((k) => {
                const child = staff.find((p) => p.id === k.to && p.boss === k.from) ?? staff.find((p) => p.id === k.from && p.boss === k.to);
                if (!child || !pos[child.id]) return null;
                const up = child.id === k.from;
                const d = edge(pos[child.boss ?? "you"], pos[child.id], !!child.boss, up);
                return <Spark key={k.id} d={d} up={up} />;
              })}
            </svg>
            <Node at={YOU} name="You" role="The campaigner" you />
            {staff.map((p) => (
              <Node key={p.id} id={p.id} at={pos[p.id]} name={p.name} role={p.role} job={job[p.id]} misfit={misfit[p.id]} morale={p.name ? morale[p.id] : undefined} thinking={!!active[p.id]} selected={p.id === person} busy={!!busy[p.id]} unread={unread[p.id]} onClick={() => pick(p.id)} />
            ))}
          </Fit>
        </div>
        <Dock label={sel ? (sel.name ?? `${sel.role} · vacant`) : "Nobody selected"}>
          {sel?.name && <DockButton primary icon={<MessageSquare />} label="Instruct" onClick={() => document.getElementById("instruct")?.focus()} />}
          {sel?.name && sel.boss && (
            <DockButton icon={<Shuffle />} label="Reassign" sub={`to ${directors.filter((d) => d.id !== sel.boss).length} others`} onClick={() => setMoving(moving === sel.id ? null : sel.id)} />
          )}
          {sel?.name && (
            <DockButton
              icon={<UserMinus />}
              label={confirm ? "Confirm: let go" : "Let go"}
              sub={confirm ? "Click again" : undefined}
              disabled={!!active[sel.id]}
              onClick={() => (confirm ? (letGo(sel.id), setConfirmFor(null)) : setConfirmFor(sel.id))}
            />
          )}
          <DockButton icon={<UserPlus />} label="Hire" sub={`${vacancies.length} open`} onClick={() => vacancies[0] && pick(vacancies[0].id)} />
        </Dock>
      </section>
      <aside className="flex w-[320px] shrink-0 flex-col border-l border-line bg-surface xl:w-[380px]">
        {sel ? sel.name ? <Person key={sel.id} p={sel} moving={moving === sel.id} done={() => setMoving(null)} /> : <Vacancy key={sel.id} p={sel} /> : <Overview pick={pick} />}
      </aside>
    </div>
  );
}

// A spark running along an edge. SMIL animations added after load start at once only when begun explicitly.
function Spark({ d, up }: { d: string; up: boolean }) {
  const a = useRef<SVGAnimateMotionElement>(null);
  const b = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => { a.current?.beginElement(); b.current?.beginElement(); }, []);
  return (
    <g>
      <circle r="7" fill="var(--color-warm)" opacity="0.5" filter="url(#glow)"><animateMotion ref={a} begin="indefinite" dur="1.1s" path={d} fill="freeze" /></circle>
      <circle r="3" fill={up ? "var(--color-pos)" : "#fff"}><animateMotion ref={b} begin="indefinite" dur="1.1s" path={d} fill="freeze" /></circle>
    </g>
  );
}

function ModeBadge() {
  const mode = useStaff((s) => s.mode);
  if (!mode) return <span className="text-[11.5px] text-faint">Staff are agents. Give an order to start.</span>;
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", mode === "live" ? "border-pos/25 text-pos" : "border-warm/25 text-warm")}>
      <i className={cn("size-1.5 rounded-full", mode === "live" ? "bg-pos" : "bg-warm")} />
      {mode === "live" ? "Live agents" : "Simulated staff · no API key"}
    </span>
  );
}

/** The money a person's latest piece of work cost or raised, popping above their node for a moment as it lands. */
function Landed({ id }: { id: string }) {
  const latest = useCase((s) => { for (let i = s.work.length - 1; i >= 0; i--) if (s.work[i].by === id) return s.work[i]; return undefined; });
  // Work already there when the War room opens is old news; only what lands while it is open pops.
  const [opened] = useState(() => latest?.id ?? 0);
  if (!latest || latest.id <= opened) return null;
  const net = latest.raised - latest.cost;
  const text = latest.raised ? `+$${Math.round(latest.raised / 1000)}k raised` : latest.cost ? `−$${latest.cost.toLocaleString("en-US")}` : null;
  if (!text) return null;
  return (
    <motion.span
      key={latest.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: [0, 1, 1, 0], y: [4, -6, -6, -10] }}
      transition={{ duration: 2.8, times: [0, 0.12, 0.8, 1], ease: "easeOut" }}
      className={cn("tnum pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 rounded px-1.5 font-mono text-[10.5px] leading-[16px] whitespace-nowrap shadow-[0_6px_18px_-6px_rgba(0,0,0,0.9)]", net >= 0 ? "bg-pos/15 text-pos" : "bg-neg/15 text-neg")}
    >
      {text}
    </motion.span>
  );
}

function Node({ id, at, name, role, job, misfit, morale, thinking, you, selected, busy, unread, onClick }: { id?: string; at: Pt; name?: string; role: string; job?: string; misfit?: boolean; morale?: number; thinking?: boolean; you?: boolean; selected?: boolean; busy?: boolean; unread?: boolean; onClick?: () => void }) {
  const size = at.r * 2;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      disabled={you}
      className="group absolute flex -translate-x-1/2 flex-col items-center text-center"
      style={{ left: at.x, top: at.y - at.r - 4, width: at.r < 24 ? 94 : 124 }}
    >
      <span className={cn("relative rounded-full p-1 transition-shadow duration-300", selected && "shadow-[0_0_0_1.5px_#fff,0_0_36px_rgba(255,255,255,0.28)]", busy && !selected && !misfit && "shadow-[0_0_0_1.5px_var(--color-warm),0_0_28px_rgba(240,162,59,0.35)]", misfit && "shadow-[0_0_0_1.5px_var(--color-neg),0_0_28px_rgba(240,112,95,0.4)]")}>
        {name ? (
          <Avatar name={you ? undefined : name} size={size} className={cn("transition-colors group-hover:border-white/30", you && "border-white/40 from-white to-[#c9c9cf]")} />
        ) : (
          <span className="grid rounded-full border border-dashed border-line-strong text-faint transition-colors group-hover:border-muted group-hover:text-fg" style={{ width: size, height: size }}>
            <Plus className="m-auto size-4" />
          </span>
        )}
        {(thinking || busy) && <span className="absolute -inset-0.5 animate-spin rounded-full border border-transparent border-t-warm [animation-duration:1.4s]" />}
        {id && <Landed id={id} />}
        {unread && <i className="absolute top-0.5 right-0.5 size-2.5 rounded-full border-2 border-bg bg-warm" />}
        {morale !== undefined && morale < 40 && <i title="Low morale" className="absolute bottom-0.5 left-0.5 size-2.5 rounded-full border-2 border-bg bg-neg" />}
      </span>
      <span className={cn("mt-1.5 text-[12.5px] leading-tight font-medium", !name && "text-faint")}>{name ?? "Vacant"}</span>
      {/* A post shown by its title has no separate name to print. */}
      {role !== name && <span className="text-[10.5px] leading-tight text-muted">{role}</span>}
      <AnimatePresence>
        {misfit && (
          <motion.span key="misfit" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-0.5 rounded bg-neg/15 px-1.5 text-[10px] leading-[16px] text-neg">
            Wrong person
          </motion.span>
        )}
        {job && (
          <motion.span key="job" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-0.5 max-w-full truncate rounded bg-warm/10 px-1.5 text-[10px] leading-[16px] text-warm">
            {job}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** The candidate's calendar: what staff have booked him for, and what came of each once its day has passed. */
function Calendar() {
  const bookings = useCase((s) => s.bookings);
  if (!bookings.length) return null;
  const ahead = bookings.filter((b) => !b.done).sort((a, b) => a.date.localeCompare(b.date));
  const past = bookings.filter((b) => b.done).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const row = (b: (typeof bookings)[number]) => (
    <li key={b.id} className="flex gap-2.5 text-[12px] leading-snug">
      <span className="tnum w-[44px] shrink-0 pt-px font-mono text-[10.5px] text-faint">{shortDate(b.date)}</span>
      <span className="min-w-0 flex-1">
        <span className={b.done ? "text-muted" : "text-soft"}>{BOOKING[b.kind].label[0].toUpperCase()}{BOOKING[b.kind].label.slice(1)} in {shortPlace(b.cd)}</span>
        {b.done && <span className={cn("block text-[11.5px]", /^(Cancelled|Dropped)/.test(b.done) ? "text-neg" : "text-muted")}>{b.done}</span>}
      </span>
    </li>
  );
  return (
    <Section title="Candidate's calendar" right={<span className="text-[10.5px] text-faint">{ahead.length ? `${ahead.length} booked` : "Nothing ahead"}</span>}>
      <ol className="space-y-2">{ahead.map(row)}{past.map(row)}</ol>
    </Section>
  );
}

function Overview({ pick }: { pick: (id: string) => void }) {
  const staff = useGame((s) => s.staff);
  const spent = staffMoney(useCase((s) => s.work)).spent;
  const busy = useGame((s) => s.busy);
  const feedItems = useStaff((s) => s.feed);
  const job = useStaff((s) => s.job);
  const filled = staff.filter((p) => p.name).length;
  return (
    <div className="overflow-y-auto">
      <Section title="Your campaign">
        <div className="grid grid-cols-3 gap-2">
          {([["Staff", String(filled)], ["Vacancies", String(staff.length - filled)], ["Spent on jobs", shortMoney(spent)]] as const).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-raised px-3 py-2.5">
              <div className="tnum font-mono text-[18px] font-medium">{v}</div>
              <div className="text-[11px] text-muted">{k}</div>
            </div>
          ))}
        </div>
      </Section>
      <Calendar />
      <Section title="Direct reports">
        <div className="-mx-2">
          {staff.filter((p) => !p.boss).map((p) => (
            <button key={p.id} onClick={() => pick(p.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-hover">
              {p.name ? <Avatar name={p.name} size={30} /> : <span className="grid size-[30px] place-items-center rounded-full border border-dashed border-line-strong text-faint"><Plus className="size-3.5" /></span>}
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[13px]", !p.name && "text-faint")}>{p.name ?? "Vacant"}</span>
                <span className="block truncate text-[11.5px] text-muted">{job[p.id] ?? p.role}</span>
              </span>
              {p.name && <Status on={!!busy[p.id]} />}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Activity" right={<span className="text-[10.5px] text-faint">{feedItems.length ? "Newest first" : ""}</span>}>
        {!feedItems.length && <p className="text-[12.5px] leading-relaxed text-muted">Select someone and tell them what you want in plain language. Directors plan, hand jobs to their people, and report back. Every result moves your money, your map and your standing with the voter groups.</p>}
        <ol className="space-y-2">
          <AnimatePresence initial={false}>
            {feedItems.slice(0, 24).map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 text-[12px] leading-snug">
                <span className="tnum w-[44px] shrink-0 pt-px font-mono text-[10.5px] text-faint">{shortDate(f.date)}</span>
                <span className={cn("min-w-0", f.tone === "pos" ? "text-pos" : f.tone === "neg" ? "text-neg" : f.tone === "warm" ? "text-warm" : "text-soft")}>{f.text}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </Section>
    </div>
  );
}

const Status = ({ on, label }: { on: boolean; label?: string }) => (
  <span className={cn("flex items-center gap-1.5 text-[11px]", on ? "text-warm" : "text-faint")}>
    <i className={cn("size-1.5 rounded-full", on ? "breathe bg-warm" : "bg-faint")} />
    {label ?? (on ? "Working" : "Idle")}
  </span>
);

function toPlan(runs: Run[] | undefined, staff: Staff[]): PlanTask[] {
  const name = (id: string) => staff.find((p) => p.id === id)?.name ?? "—";
  return (runs ?? []).map((r) => {
    const subtasks = r.jobs.length
      ? r.jobs.map((j, i) => ({ id: `${j.to}-${i}`, title: j.job, description: j.summary ?? "Working on it…", status: j.done ? ("completed" as const) : ("in-progress" as const), assigned: [name(j.to)] }))
      : r.items.map((it, i) => ({ id: String(i), title: it.title, description: "", status: it.status }));
    return { id: String(r.id), title: r.text, status: r.status === "done" ? "completed" : "in-progress", subtasks };
  });
}

function Person({ p, moving, done }: { p: Staff; moving: boolean; done: () => void }) {
  const chat = useStaff((s) => s.chat[p.id]);
  const runs = useStaff((s) => s.runs[p.id]);
  const thinking = useStaff((s) => !!s.active[p.id]);
  const morale = useStaff((s) => s.morale[p.id] ?? 70);
  const hired = useStaff((s) => s.hires[p.id]);
  const job = useStaff((s) => s.job[p.id]);
  const staff = useGame((s) => s.staff);
  const busy = useGame((s) => !!s.busy[p.id]);
  const boss = staff.find((x) => x.id === p.boss);
  const team = staff.filter((x) => x.boss === p.id);
  const c = currentCase(useCase((s) => s.caseId));
  const instruct = useGame((s) => s.instruct);
  // A draft handed over from elsewhere (the map's "Send staff") starts in the box, ready to edit and send.
  const [text, setText] = useState(() => useStaff.getState().draft[p.id] ?? "");
  useEffect(() => { useStaff.setState((s) => ({ draft: Object.fromEntries(Object.entries(s.draft).filter(([k]) => k !== p.id)) })); }, [p.id]);
  const end = useRef<HTMLDivElement>(null);
  const first = short(p), First = first[0].toUpperCase() + first.slice(1);
  const prof = hired ?? profileFor(p.id, p.role);
  // The plan is a live checklist: shown while an order runs. Once the report is in, the order card says it all.
  const plan = useMemo(() => (thinking ? toPlan(runs?.slice(0, 1), staff) : []), [thinking, runs, staff]);
  const lastSuggest = [...(chat ?? [])].reverse().find((c): c is Extract<ChatItem, { k: "them" }> => c.k === "them" && !!c.suggest)?.suggest;
  // The post's last suggestion can be one of the stock ideas; each idea is offered once.
  const ideas = [...new Set([...(lastSuggest ? [lastSuggest] : []), ...ideasFor(p)])].slice(0, 3);
  const rows = useMemo(() => group(chat ?? []), [chat]);
  const lastOrder = rows.findLast((r) => r.order)?.order;
  // Ideas help at the start, and right after a report when the student is deciding what next.
  const last = chat?.at(-1);
  const showIdeas = !thinking && (!last || last.k === "report" || last.k === "coach" || (last.k === "them" && !!last.suggest));
  // Braces matter: scrollIntoView returns a Promise in current Chromium, and an effect must not return one.
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [chat?.length, thinking]);
  const send = (t = text) => { if (t.trim() && !thinking) { instruct(p.id, t.trim()); setText(""); } };

  return (
    <>
      <div className="flex items-center gap-3.5 border-b border-line px-5 py-5">
        <Avatar name={p.name} size={46} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium tracking-tight">{p.name}</div>
          <div className="truncate text-[12px] text-muted">{p.role}{boss ? ` · reports to ${boss.name ? short(boss) : "a vacant post"}` : " · direct report"}</div>
        </div>
        <Status on={busy || thinking} label={thinking ? "On it" : undefined} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Profile">
          {p.onRecord && <p className="mb-2 text-[12px] leading-relaxed text-muted">The record names {p.name} in this post.<Cite c={c} id={p.onRecord} /> What this post says and does here is simulated{p.good || p.weak ? ", and so are its strengths and weaknesses below: they describe the post in this exercise, not the person" : ""}.</p>}
          <dl className="space-y-2 text-[13px]">
            {[["Good at", p.good], ["Weak at", p.weak], ["Working on", job ?? p.doing ?? "Nothing yet"]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-3"><dt className="w-[76px] shrink-0 text-muted">{k}</dt><dd className="text-soft">{v}</dd></div>
            ))}
            <div className="flex items-center gap-3">
              <dt className="w-[76px] shrink-0 text-muted">Morale</dt>
              <dd className="flex flex-1 items-center gap-2"><Meter value={morale} color={morale < 40 ? "var(--color-neg)" : morale > 70 ? "var(--color-pos)" : "var(--color-soft)"} className="flex-1" /><span className="tnum w-6 text-right font-mono text-[11px] text-muted">{Math.round(morale)}</span></dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {prof.skills.map((s) => <span key={s} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] text-soft capitalize">{s}</span>)}
            {!!team.length && <span className="flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] text-muted"><Users className="size-3" />{team.filter((t) => t.name).length} on team</span>}
          </div>
        </Section>
        {moving && (
          <Section title={`Move ${first} to`} right={<button onClick={done} className="text-[11px] text-faint hover:text-fg">Cancel</button>}>
            <div className="-mx-2">
              {staff.filter((d) => !d.boss && d.name && d.id !== p.boss).map((d) => (
                <button key={d.id} onClick={() => { reassign(p.id, d.id); done(); }} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-hover">
                  <Avatar name={d.name} size={24} />
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <span className="truncate text-[11px] text-faint">{d.role}</span>
                </button>
              ))}
            </div>
          </Section>
        )}
        {!!plan.length && (
          <Section title="Plan" right={<span className="text-[10.5px] text-faint">Click a job for detail</span>}>
            <AgentPlan tasks={plan} />
          </Section>
        )}
        <Section title="Conversation">
          {!chat?.length && <p className="text-[12.5px] text-faint">Nothing yet. Tell {first} what you need. Be specific: what, where, for whom, by when.</p>}
          <div className="space-y-2">
            {rows.map((r) =>
              r.order ? (
                <OrderCard key={`o${r.order}`} rows={r.items} id={p.id} latest={r.order === lastOrder} onSuggest={(s) => setText(s)} />
              ) : (
                <ChatRow key={r.items[0].i} c={r.items[0].c} index={r.items[0].i} id={p.id} latest={false} onSuggest={(s) => setText(s)} />
              ),
            )}
            {thinking && (
              <div className="flex items-center gap-2 py-1 text-[12px] text-muted">
                <Loader2 className="size-3.5 animate-spin text-warm" />
                {First} is {runs?.[0]?.jobs.length ? "waiting on the team" : runs?.[0]?.items.length ? "working the plan" : "thinking it through"}…
              </div>
            )}
          </div>
          <div ref={end} />
        </Section>
      </div>
      <div className="border-t border-line p-3">
        {showIdeas && (
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
            {ideas.map((s) => (
              <button key={s} onClick={() => setText(s)} className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-[11.5px] text-soft transition-colors hover:border-white/30 hover:text-fg">
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-raised p-2 transition-colors focus-within:border-white/30">
          <textarea
            id="instruct"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={thinking ? `${First} is on it…` : `Tell ${first} what you need…`}
            className="flex-1 resize-none bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-faint"
          />
          <button onClick={() => send()} disabled={!text.trim() || thinking} aria-label="Send" className="grid size-7 shrink-0 place-items-center rounded-lg bg-gold text-bg transition-opacity disabled:opacity-25">
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}

type Row = { c: ChatItem; i: number };

/** The chat as rows: each instruction's items gathered into one group where it starts, everything else on its own. */
function group(chat: ChatItem[]) {
  const out: { order?: number; items: Row[] }[] = [];
  const at = new Map<number, Row[]>();
  chat.forEach((c, i) => {
    if (c.run == null) return void out.push({ items: [{ c, i }] });
    const items = at.get(c.run);
    if (items) return void items.push({ c, i });
    at.set(c.run, [{ c, i }]);
    out.push({ order: c.run, items: at.get(c.run)! });
  });
  return out;
}

/** The biggest moves an order made, summed across its receipts. */
function moves(effects: Effect[], n = 2) {
  const sum = new Map<string, number>();
  for (const e of effects) {
    for (const [cd, d] of Object.entries(e.sent)) sum.set(shortPlace(+cd), (sum.get(shortPlace(+cd)) ?? 0) + d);
    for (const [f, d] of Object.entries(e.factions)) { const k = FACTIONS_2013.find((x) => x.id === f)?.name ?? f; sum.set(k, (sum.get(k) ?? 0) + d); }
  }
  return [...sum].filter(([, d]) => Math.abs(d) >= 0.05).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n);
}
const signed = (d: number) => `${d >= 0 ? "+" : ""}${Math.round(d * 10) / 10}`;

/**
 * One instruction, start to finish: the order, the thinking, what got done, the report and the coaching.
 * Open while it is the newest; older ones fold to a single line with what they cost and moved.
 */
function OrderCard({ rows, id, latest, onSuggest }: { rows: Row[]; id: string; latest: boolean; onSuggest: (s: string) => void }) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const thoughts = rows.find((r) => r.c.k === "thoughts")?.c as Extract<ChatItem, { k: "thoughts" }> | undefined;
  const live = !!thoughts?.live;
  const open = live || (toggled ?? latest);
  const order = rows.find((r) => r.c.k === "me")?.c as Extract<ChatItem, { k: "me" }> | undefined;
  const effects = rows.flatMap((r) => (r.c.k === "receipt" ? [r.c.effect] : []));
  // What the director says while working comes before the receipts; the report and coaching close the card.
  const said = rows.filter((r) => r.c.k === "them" || r.c.k === "note");
  const closing = rows.filter((r) => r.c.k === "report" || r.c.k === "coach" || r.c.k === "proposals");
  const reported = closing.some((r) => r.c.k === "report");
  const staff = useGame((s) => s.staff);
  const misfits = effects.filter((e) => !e.fit).map((e) => { const p = staff.find((x) => x.id === e.by); return `${e.label} went to ${p ? short(p) : "someone"}`; });
  const spent = effects.reduce((a, e) => a + e.cost, 0);
  const moved = moves(effects);

  if (!open)
    return (
      <button onClick={() => setToggled(true)} className="flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-[12px] transition-colors hover:bg-hover">
        <ChevronDown className="size-3 shrink-0 -rotate-90 text-faint" />
        <span className="min-w-0 flex-1 truncate text-soft">{order?.text ?? "Order"}</span>
        {!!spent && <span className="tnum shrink-0 font-mono text-[10.5px] text-neg">−${spent.toLocaleString("en-US")}</span>}
        {moved.slice(0, 1).map(([k, d]) => <span key={k} className={cn("tnum max-w-[110px] shrink-0 truncate font-mono text-[10.5px]", d >= 0 ? "text-pos" : "text-neg")}>{k} {signed(d)}</span>)}
      </button>
    );

  return (
    <div className="space-y-2">
      {order && (
        <div className="flex items-start justify-end gap-1.5">
          {!live && !latest && (
            <button onClick={() => setToggled(false)} aria-label="Fold this order" className="mt-2 text-faint hover:text-fg"><ChevronDown className="size-3" /></button>
          )}
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="max-w-[88%] rounded-xl bg-gold px-3 py-2 text-[13px] leading-snug text-bg">{order.text}</motion.div>
        </div>
      )}
      {order?.budget !== undefined && <p className="tnum -mt-1 text-right font-mono text-[10.5px] text-muted">Budget for this order: ${order.budget.toLocaleString("en-US")}</p>}
      {thoughts && <Thoughts c={thoughts} latest={latest} />}
      {said.map((r) => <ChatRow key={r.i} c={r.c} index={r.i} id={id} latest={false} onSuggest={onSuggest} />)}
      {/* Until the report is in, each action shows as it lands; after, they fold into the report's totals line. */}
      {!reported && !!effects.length && <div className="space-y-px border-l border-line pl-1.5">{effects.map((e, i) => <ReceiptLine key={i} e={e} />)}</div>}
      {closing.map((r) =>
        r.c.k === "coach" ? <CoachLine key={r.i} c={r.c} misfits={misfits} /> : r.c.k === "report" ? <Reply key={r.i} c={r.c} index={r.i} id={id} effects={effects} /> : r.c.k === "proposals" ? <Proposals key={r.i} c={r.c} index={r.i} id={id} /> : null,
      )}
    </div>
  );
}

/** One action on one line: what, who, and what it cost and moved. The full sentence is on hover. */
function ReceiptLine({ e }: { e: Effect }) {
  const staff = useGame((s) => s.staff);
  const by = staff.find((p) => p.id === e.by);
  const who = by ? short(by).replace(/^the /, "") : "Staff";
  const chips: [string, "pos" | "neg"][] = [];
  if (e.cost) chips.push([`−$${e.cost.toLocaleString("en-US")}`, "neg"]);
  if (e.raised) chips.push([`+$${e.raised.toLocaleString("en-US")}`, "pos"]);
  for (const [k, d] of moves([e], 3)) chips.push([`${k} ${signed(d)}`, d >= 0 ? "pos" : "neg"]);
  return (
    <div title={e.summary} className="px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-[11.5px]">
        {e.district ? <MapPin className="size-3 shrink-0 text-muted" /> : <CircleDollarSign className="size-3 shrink-0 text-muted" />}
        <span className="truncate font-medium text-soft">{e.label}</span>
        <span className="truncate text-muted capitalize">· {who}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1 pl-[18px]">
        {chips.map(([t, tone]) => (
          <span key={t} className={cn("tnum rounded px-1.5 py-px font-mono text-[10.5px]", tone === "pos" ? "bg-pos/12 text-pos" : "bg-neg/12 text-neg")}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * The director's report as an ordinary reply. Under it, one line of totals; the actions behind it open on click.
 * An ask sits on its own row below, answered in place.
 */
function Reply({ c, index, id, effects }: { c: Extract<ChatItem, { k: "report" }>; index: number; id: string; effects: Effect[] }) {
  const [open, setOpen] = useState(false);
  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start">
      <div className="max-w-[88%] rounded-xl border border-line bg-raised px-3 py-2 text-[13px] leading-snug text-soft"><TypeOut id={`report-${id}-${c.run ?? index}`} text={c.text} /></div>
      <div className="tnum mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1 font-mono text-[10.5px] text-muted">
        <span>Spent <span className="text-neg">{usd(c.spent)}</span></span>
        {!!c.raised && <span>Raised <span className="text-pos">{usd(c.raised)}</span></span>}
        {moves(effects).map(([k, d]) => <span key={k} className={d >= 0 ? "text-pos" : "text-neg"}>{k} {signed(d)}</span>)}
        {!!effects.length && (
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-0.5 font-sans text-[11px] text-faint transition-colors hover:text-fg">
            {effects.length} {effects.length === 1 ? "action" : "actions"}
            <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
          </button>
        )}
      </div>
      {open && <div className="mt-1 w-full space-y-px border-l border-line pl-1.5">{effects.map((e, i) => <ReceiptLine key={i} e={e} />)}</div>}
      {c.ask &&
        (c.state === "open" ? (
          <div className="mt-2 flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 pl-1">
            <span className="text-[12px] text-soft">Wants <span className="tnum font-mono text-warm">{usd(c.ask.amount)}</span> more {c.ask.reason}</span>
            <span className="flex gap-1.5">
              <Button size="sm" variant="primary" onClick={() => answerAsk(id, index, true)}><Check className="size-3.5" />Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => answerAsk(id, index, false)}><X className="size-3.5" />Not now</Button>
            </span>
          </div>
        ) : (
          <span className={cn("mt-1 pl-1 text-[11px]", c.state === "approved" ? "text-pos" : "text-muted")}>{c.state === "approved" ? "Approved" : "Declined"}: {usd(c.ask.amount)} more {c.ask.reason}</span>
        ))}
    </motion.div>
  );
}

/** The director's answer to a question, and its options as cards. Picking one sends its order; nothing is spent before. */
function Proposals({ c, index, id }: { c: Extract<ChatItem, { k: "proposals" }>; index: number; id: string }) {
  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
  const staff = useGame((s) => s.staff);
  const done = c.picked !== undefined;
  // While the director is on another job, an option cannot start: the buttons wait.
  const busy = useStaff((s) => !!s.active[id]);
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start">
      <div className="max-w-[88%] rounded-xl border border-line bg-raised px-3 py-2 text-[13px] leading-snug text-soft">{c.text}</div>
      <div className="mt-2 w-full space-y-1.5">
        {c.options.map((o, i) => {
          const chosen = c.picked === i;
          return (
            <div key={i} className={cn("rounded-lg border p-2.5 transition-colors", chosen ? "border-gold bg-hover" : "border-line bg-raised", done && !chosen && "opacity-45")}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium">{chosen && <Check className="size-3.5 shrink-0 text-gold-bright" />}{o.title}</div>
                  {o.why && <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{o.why}</p>}
                  <ul className="mt-1.5 space-y-0.5">
                    {o.steps.map((st, k) => {
                      const who = staff.find((x) => x.id === st.by);
                      const group = st.faction ? FACTIONS_2013.find((f) => f.id === st.faction)?.name : undefined;
                      const what = st.action === "schedule_event" ? `Book the candidate: ${BOOKING[st.kind ?? "rally"].label}` : ACTIONS[st.action].label;
                      return <li key={k} className="text-[11px] leading-snug text-faint">{what}{st.district ? ` · ${shortPlace(st.district)}` : ""}{group ? ` · ${group}` : ""}{who ? ` · ${short(who)}` : ""}</li>;
                    })}
                  </ul>
                </div>
                <span className="tnum shrink-0 font-mono text-[11px] text-warm" title="The engine's price for exactly these steps">{usd(o.cost)}</span>
              </div>
              {!done && (
                <Button size="sm" variant="primary" className="mt-2" disabled={busy} title={busy ? "Still on the last job" : undefined} onClick={() => pick(id, index, i)}>
                  <Check className="size-3.5" />Do this
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {!done && <span className="mt-1 pl-1 text-[11px] text-faint">{busy ? "Still on the last job: pick one when the report is in." : "Each price is exact for the steps listed. Nothing is spent until you pick one, or give your own order."}</span>}
    </motion.div>
  );
}

const gradeOf =(c: { clarity: number; fit: number }) => (c.clarity >= 3 && c.fit === 1 ? "Strong delegation" : c.clarity >= 2 && c.fit >= 0.5 ? "Workable delegation" : "Weak delegation");

/** Coaching in one line; the meters and the advice open on click, and on their own when the delegation was weak. */
function CoachLine({ c, misfits = [] }: { c: Extract<ChatItem, { k: "coach" }>; misfits?: string[] }) {
  const grade = gradeOf(c);
  const [open, setOpen] = useState(grade.startsWith("Weak"));
  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-1.5 text-left text-[11.5px] text-muted transition-colors hover:text-fg">
        <span className={cn("shrink-0 font-medium whitespace-nowrap", grade.startsWith("Strong") ? "text-pos" : grade.startsWith("Work") ? "text-warm" : "text-neg")}>{grade}</span>
        <span className="tnum min-w-0 truncate font-mono text-[10.5px]">· Clarity {c.clarity.toFixed(1)}/4 · Right people {Math.round(c.fit * 100)}%</span>
        <ChevronDown className={cn("ml-auto size-3 shrink-0 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <div className="mt-1.5">
          <Coach c={c} bare />
          {!!misfits.length && <p className="mt-1.5 text-[11.5px] leading-snug text-neg">Wrong person: {misfits.join("; ")}.</p>}
        </div>
      )}
    </div>
  );
}

function ChatRow({ c, index, id, latest, onSuggest }: { c: ChatItem; index: number; id: string; latest: boolean; onSuggest: (s: string) => void }) {
  if (c.k === "note") return <p className="py-1 text-center text-[11px] text-faint">{c.text}</p>;
  if (c.k === "thoughts") return <Thoughts c={c} latest={latest} />;
  if (c.k === "me" || c.k === "them")
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", c.k === "me" ? "items-end" : "items-start")}>
        <div className={cn("max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-snug", c.k === "me" ? "bg-gold text-bg" : "border border-line bg-raised text-soft")}>{c.text}</div>
        {c.k === "them" && c.suggest && (
          <button onClick={() => onSuggest(c.suggest!)} className="mt-1 flex items-center gap-1 text-[11px] text-warm hover:underline">
            <Sparkles className="size-3" /> {c.suggest}
          </button>
        )}
      </motion.div>
    );
  if (c.k === "receipt") return <Receipt e={c.effect} />;
  if (c.k === "report") return <Report c={c} index={index} id={id} />;
  if (c.k === "proposals") return <Proposals c={c} index={index} id={id} />;
  return <Coach c={c} />;
}

/**
 * One instruction's thinking as a timeline: the director's reasons, then each staffer's as they take their job.
 * Open while the newest; collapsed to a link once a newer instruction is given. Either can be toggled by hand.
 */
function Thoughts({ c, latest }: { c: Extract<ChatItem, { k: "thoughts" }>; latest: boolean }) {
  const staff = useGame((s) => s.staff);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? latest;
  if (!c.live && !c.items.length) return null;
  const name = (who: string) => { const p = staff.find((x) => x.id === who); return p ? short(p).replace(/^the /, "") : "Staff"; };
  const steps = `${c.items.length} ${c.items.length === 1 ? "step" : "steps"}`;
  return (
    <div className="py-0.5">
      <button onClick={() => setToggled(!open)} aria-expanded={open} className="flex items-center gap-1.5 text-[11.5px] text-muted transition-colors hover:text-fg">
        {c.live ? <Loader2 className="size-3 animate-spin text-warm" /> : <Brain className="size-3" />}
        <span>{c.live ? "Thinking" : open ? "Reasoning" : "Show reasoning"}</span>
        {!!c.items.length && <span className="text-faint">· {steps}</span>}
        <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && !!c.items.length && (
          <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-1.5 ml-[5px] space-y-1.5 overflow-hidden border-l border-line-strong pl-3">
            {c.items.map((t, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-[12px] leading-snug">
                <span className="font-medium text-soft capitalize">{name(t.who)}</span>
                <span className="text-muted"> · {t.text}</span>
              </motion.li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}

function Receipt({ e }: { e: Effect }) {
  const staff = useGame((s) => s.staff);
  const by = staff.find((p) => p.id === e.by);
  const who = by ? short(by).replace(/^the /, "") : "Staff";
  const chips: [string, "pos" | "neg" | "soft"][] = [];
  if (e.cost) chips.push([`−$${e.cost.toLocaleString("en-US")}`, "neg"]);
  if (e.raised) chips.push([`+$${e.raised.toLocaleString("en-US")}`, "pos"]);
  for (const [cd, d] of Object.entries(e.sent)) chips.push([`${shortPlace(+cd)} ${d >= 0 ? "+" : ""}${d}`, d >= 0 ? "pos" : "neg"]);
  for (const [f, d] of Object.entries(e.factions)) chips.push([`${FACTIONS_2013.find((x) => x.id === f)?.name ?? f} ${d >= 0 ? "+" : ""}${d}`, d >= 0 ? "pos" : "neg"]);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-dashed border-line-strong bg-white/[0.015] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        {e.district ? <MapPin className="size-3" /> : <CircleDollarSign className="size-3" />}
        <span className="font-medium text-soft">{e.label}</span>
        <span>· {who}</span>
        {!e.fit && <span className="ml-auto rounded bg-neg/15 px-1 text-[10px] text-neg">Wrong person</span>}
      </div>
      <p className="mt-1 text-[12px] leading-snug text-soft">{e.summary}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {chips.map(([t, tone]) => (
          <span key={t} className={cn("tnum rounded px-1.5 py-px font-mono text-[10.5px]", tone === "pos" ? "bg-pos/12 text-pos" : tone === "neg" ? "bg-neg/12 text-neg" : "bg-white/[0.06] text-soft")}>{t}</span>
        ))}
      </div>
    </motion.div>
  );
}

function Report({ c, index, id }: { c: Extract<ChatItem, { k: "report" }>; index: number; id: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-line-strong bg-raised p-3">
      <div className="mb-1.5 flex items-center gap-1.5"><Label>Report</Label><ArrowDownRight className="size-3 text-faint" /></div>
      <p className="text-[13px] leading-snug text-fg">{c.text}</p>
      <div className="tnum mt-2 flex gap-3 font-mono text-[11px] text-muted">
        <span>Spent <span className="text-neg">${c.spent.toLocaleString("en-US")}</span></span>
        {!!c.raised && <span>Raised <span className="text-pos">${c.raised.toLocaleString("en-US")}</span></span>}
      </div>
      {c.ask && (
        <div className="mt-3 rounded-lg border border-warm/25 bg-warm/[0.06] p-2.5">
          <div className="text-[12px] text-soft">Wants <span className="tnum font-mono text-warm">${c.ask.amount.toLocaleString("en-US")}</span> more {c.ask.reason}</div>
          {c.state === "open" ? (
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" variant="primary" onClick={() => answerAsk(id, index, true)}><Check className="size-3.5" />Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => answerAsk(id, index, false)}><X className="size-3.5" />Not now</Button>
            </div>
          ) : (
            <div className={cn("mt-1.5 text-[11.5px]", c.state === "approved" ? "text-pos" : "text-muted")}>{c.state === "approved" ? "Approved" : "Declined"}</div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** `bare`: without the heading, when the one-line summary above already says the grade. */
function Coach({ c, bare }: { c: Extract<ChatItem, { k: "coach" }>; bare?: boolean }) {
  const grade = gradeOf(c);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-line bg-white/[0.02] p-3">
      {!bare && (
        <div className="mb-2 flex items-center justify-between">
          <Label>How you delegated</Label>
          <span className={cn("text-[11px] font-medium", grade.startsWith("Strong") ? "text-pos" : grade.startsWith("Work") ? "text-warm" : "text-neg")}>{grade}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-[11.5px]">
        <div>
          <div className="mb-1 flex justify-between text-muted"><span>Clarity</span><span className="tnum font-mono">{c.clarity.toFixed(1)}/4</span></div>
          <Meter value={(c.clarity / 4) * 100} color={c.clarity >= 3 ? "var(--color-pos)" : c.clarity >= 2 ? "var(--color-warm)" : "var(--color-neg)"} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-muted"><span>Right people</span><span className="tnum font-mono">{Math.round(c.fit * 100)}%</span></div>
          <Meter value={c.fit * 100} color={c.fit === 1 ? "var(--color-pos)" : c.fit >= 0.5 ? "var(--color-warm)" : "var(--color-neg)"} />
        </div>
      </div>
      {!!c.missing.length && <p className="mt-2 text-[11.5px] text-muted">Missing: {c.missing.join(" · ")}</p>}
      {c.text && <p className="mt-1.5 text-[12px] leading-snug text-soft">{c.text}</p>}
    </motion.div>
  );
}

function Vacancy({ p }: { p: Staff }) {
  const box = useStaff((s) => s.candidates[p.id]);
  const boss = useGame((s) => s.staff.find((x) => x.id === p.boss));
  const prof = profileFor(p.id, p.role);
  useEffect(() => { void loadCandidates(p.id); }, [p.id]);
  return (
    <div className="overflow-y-auto">
      <div className="border-b border-line px-5 py-5">
        <Label>Vacant post</Label>
        <div className="mt-1 text-[15px] font-medium tracking-tight">{p.role}</div>
        <div className="mt-1 text-[12px] text-muted">{boss ? `Reports to ${boss.name ?? boss.role}` : "Reports to you"} · needs {prof.skills.join(", ")}</div>
      </div>
      <Section title="Candidates" right={box?.mode && <span className={cn("text-[10.5px]", box.mode === "live" ? "text-pos" : "text-faint")}>{box.mode === "live" ? "Sourced by your agents" : "From the bench"}</span>}>
        {(!box || box.status === "loading") && (
          <div className="flex items-center gap-2 py-6 text-[12.5px] text-muted"><Loader2 className="size-4 animate-spin text-warm" />Finding people…</div>
        )}
        <div className="space-y-2">
          {box?.list.map((o, i) => (
            <motion.div key={o.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }} className="rounded-lg border border-line bg-raised p-3">
              <div className="flex items-center gap-3">
                <Avatar name={o.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{o.name}</div>
                </div>
                <Button size="sm" onClick={() => hire(p.id, o)}>Hire</Button>
              </div>
              <p className="mt-2.5 text-[12.5px] text-soft">{o.pitch}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
                <span className="text-pos">+ {o.good}</span>
                <span className="text-neg">− {o.weak}</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-3 text-[10.5px] text-muted">
                <div><div className="mb-1">Impact</div><Meter value={((o.effect - 0.85) / 0.4) * 100} color="var(--color-pos)" /></div>
                <div><div className="mb-1">Spend discipline</div><Meter value={((1.3 - o.cost) / 0.45) * 100} color="var(--color-soft)" /></div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}
