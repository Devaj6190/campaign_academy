"use client";

import { ArrowDownRight, ArrowUp, Check, CircleDollarSign, FlaskConical, Loader2, MapPin, MessageSquare, Plus, Shuffle, Sparkles, UserMinus, UserPlus, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Fit } from "@/components/Fit";
import { Avatar, Button, Dock, DockButton, Label, Meter, Section, ViewHeader } from "@/components/ui";
import { AgentPlan, type PlanTask } from "@/components/ui21/agent-plan";
import { ShaderBackground } from "@/components/ui21/dithering";
import type { Staff } from "@/lib/data";
import { ACTIONS } from "@/lib/staff/catalog";
import type { Effect } from "@/lib/staff/engine";
import { profileFor } from "@/lib/staff/roster";
import { answerAsk, hire, letGo, loadCandidates, reassign } from "@/lib/staff/run";
import { useStaff, type ChatItem, type Run } from "@/lib/staff/store";
import { shortPlace } from "@/lib/staff/world";
import { useGame } from "@/lib/store";
import { clock, cn } from "@/lib/util";

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

// Things a player might plausibly say to each person, to get them started.
const IDEAS: Record<string, string[]> = {
  cm: ["Get us in the room with the union locals before day 3", "Plan this week around the debate on day 7"],
  fd: ["Win back Jackson Heights before Friday: canvass renters", "Recruit and train volunteers in the Bronx this weekend"],
  fin: ["Raise $40k this week with call time and a donor dinner", "Send a small-dollar email to transit riders tonight"],
  com: ["Hit back on Hale's crime ad with seniors today", "Pitch the housing story to reporters for renters"],
  pol: ["Draft a transit plan that bus riders will love", "Write a brief that answers homeowners' worries about density"],
  dat: ["Build target lists for the open Bronx districts", "Find where seniors are winnable in southeast Queens"],
};
const ideasFor = (p: Staff) => IDEAS[p.id] ?? [`${p.role.split(",")[0]}: what should we do this week?`, "Pick the district where you can do the most good tomorrow"];

export function WarRoom() {
  const staff = useGame((s) => s.staff);
  const person = useGame((s) => s.person);
  const busy = useGame((s) => s.busy);
  const unread = useGame((s) => s.unread);
  const open = useGame((s) => s.open);
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
              <Node key={p.id} at={pos[p.id]} name={p.name} role={p.role} job={job[p.id]} misfit={misfit[p.id]} morale={p.name ? morale[p.id] : undefined} thinking={!!active[p.id]} selected={p.id === person} busy={!!busy[p.id]} unread={unread[p.id]} onClick={() => pick(p.id)} />
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
          <DockButton icon={<FlaskConical />} label="Tactics" onClick={() => open("tactic")} />
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

function Node({ at, name, role, job, misfit, morale, thinking, you, selected, busy, unread, onClick }: { at: Pt; name?: string; role: string; job?: string; misfit?: boolean; morale?: number; thinking?: boolean; you?: boolean; selected?: boolean; busy?: boolean; unread?: boolean; onClick?: () => void }) {
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
        {thinking && <span className="absolute -inset-0.5 animate-spin rounded-full border border-transparent border-t-warm [animation-duration:1.4s]" />}
        {unread && <i className="absolute top-0.5 right-0.5 size-2.5 rounded-full border-2 border-bg bg-warm" />}
        {morale !== undefined && morale < 40 && <i title="Low morale" className="absolute bottom-0.5 left-0.5 size-2.5 rounded-full border-2 border-bg bg-neg" />}
      </span>
      <span className={cn("mt-1.5 text-[12.5px] leading-tight font-medium", !name && "text-faint")}>{name ?? "Vacant"}</span>
      <span className="text-[10.5px] leading-tight text-muted">{role}</span>
      <AnimatePresence>
        {misfit && (
          <motion.span initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-0.5 rounded bg-neg/15 px-1.5 text-[10px] leading-[16px] text-neg">
            Wrong person
          </motion.span>
        )}
        {job && (
          <motion.span initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-0.5 max-w-full truncate rounded bg-warm/10 px-1.5 text-[10px] leading-[16px] text-warm">
            {job}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function Overview({ pick }: { pick: (id: string) => void }) {
  const staff = useGame((s) => s.staff);
  const losses = useGame((s) => s.losses);
  const busy = useGame((s) => s.busy);
  const feedItems = useStaff((s) => s.feed);
  const job = useStaff((s) => s.job);
  const filled = staff.filter((p) => p.name).length;
  const payroll = losses[0]?.v ?? 0;
  return (
    <div className="overflow-y-auto">
      <Section title="Your campaign">
        <div className="grid grid-cols-3 gap-2">
          {([["Staff", String(filled)], ["Vacancies", String(staff.length - filled)], ["Payroll/day", `$${(payroll / 1000).toFixed(1)}k`]] as const).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-raised px-3 py-2.5">
              <div className="tnum font-mono text-[18px] font-medium">{v}</div>
              <div className="text-[11px] text-muted">{k}</div>
            </div>
          ))}
        </div>
      </Section>
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
        {!feedItems.length && <p className="text-[12.5px] leading-relaxed text-muted">Select someone and tell them what you want in plain language. Directors plan, hand jobs to their people, and report back. Every result moves your money, your map and tomorrow&apos;s paper.</p>}
        <ol className="space-y-2">
          <AnimatePresence initial={false}>
            {feedItems.slice(0, 24).map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 text-[12px] leading-snug">
                <span className="tnum w-[52px] shrink-0 pt-px font-mono text-[10.5px] text-faint">D{f.day} {clock(f.min)}</span>
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
  const instruct = useGame((s) => s.instruct);
  // A draft handed over from elsewhere (the map's "Send staff") starts in the box, ready to edit and send.
  const [text, setText] = useState(() => useStaff.getState().draft[p.id] ?? "");
  useEffect(() => { useStaff.setState((s) => ({ draft: Object.fromEntries(Object.entries(s.draft).filter(([k]) => k !== p.id)) })); }, [p.id]);
  const end = useRef<HTMLDivElement>(null);
  const first = p.name!.split(" ")[0];
  const prof = hired ?? profileFor(p.id, p.role);
  const plan = useMemo(() => toPlan(runs, staff), [runs, staff]);
  const lastSuggest = [...(chat ?? [])].reverse().find((c): c is Extract<ChatItem, { k: "them" }> => c.k === "them" && !!c.suggest)?.suggest;
  const ideas = [...(lastSuggest ? [lastSuggest] : []), ...ideasFor(p)].slice(0, 3);
  // Braces matter: scrollIntoView returns a Promise in current Chromium, and an effect must not return one.
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [chat?.length, thinking]);
  const send = (t = text) => { if (t.trim() && !thinking) { instruct(p.id, t.trim()); setText(""); } };

  return (
    <>
      <div className="flex items-center gap-3.5 border-b border-line px-5 py-5">
        <Avatar name={p.name} size={46} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium tracking-tight">{p.name}</div>
          <div className="truncate text-[12px] text-muted">{p.role}{boss ? ` · reports to ${boss.name?.split(" ")[0] ?? "a vacant post"}` : " · direct report"}</div>
        </div>
        <Status on={busy || thinking} label={thinking ? "On it" : undefined} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Profile" right={<span className="tnum font-mono text-[11px] text-faint">${prof.salary.toLocaleString("en-US")}/day</span>}>
          <dl className="space-y-2 text-[13px]">
            {[["Good at", p.good], ["Weak at", p.weak], ["Working on", job ?? p.doing]].map(([k, v]) => (
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
            {chat?.map((c, i) => <ChatRow key={i} c={c} index={i} id={p.id} onSuggest={(s) => setText(s)} />)}
            {thinking && (
              <div className="flex items-center gap-2 py-1 text-[12px] text-muted">
                <Loader2 className="size-3.5 animate-spin text-warm" />
                {first} is {runs?.[0]?.jobs.length ? "waiting on the team" : runs?.[0]?.items.length ? "working the plan" : "thinking it through"}…
              </div>
            )}
          </div>
          <div ref={end} />
        </Section>
      </div>
      <div className="border-t border-line p-3">
        {!thinking && (
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
            placeholder={thinking ? `${first} is on it…` : `Tell ${first} what you need…`}
            className="flex-1 resize-none bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-faint"
          />
          <button onClick={() => send()} disabled={!text.trim() || thinking} aria-label="Send" className="grid size-7 shrink-0 place-items-center rounded-lg bg-fg text-bg transition-opacity disabled:opacity-25">
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function ChatRow({ c, index, id, onSuggest }: { c: ChatItem; index: number; id: string; onSuggest: (s: string) => void }) {
  if (c.k === "note") return <p className="py-1 text-center text-[11px] text-faint">{c.text}</p>;
  if (c.k === "me" || c.k === "them")
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", c.k === "me" ? "items-end" : "items-start")}>
        <div className={cn("max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-snug", c.k === "me" ? "bg-fg text-bg" : "border border-line bg-raised text-soft")}>{c.text}</div>
        {c.k === "them" && c.suggest && (
          <button onClick={() => onSuggest(c.suggest!)} className="mt-1 flex items-center gap-1 text-[11px] text-warm hover:underline">
            <Sparkles className="size-3" /> {c.suggest}
          </button>
        )}
      </motion.div>
    );
  if (c.k === "receipt") return <Receipt e={c.effect} />;
  if (c.k === "report") return <Report c={c} index={index} id={id} />;
  return <Coach c={c} />;
}

function Receipt({ e }: { e: Effect }) {
  const staff = useGame((s) => s.staff);
  const factions = useGame((s) => s.factions);
  const who = staff.find((p) => p.id === e.by)?.name?.split(" ")[0] ?? "Staff";
  const chips: [string, "pos" | "neg" | "soft"][] = [];
  if (e.cost) chips.push([`−$${e.cost.toLocaleString("en-US")}`, "neg"]);
  if (e.raised) chips.push([`+$${e.raised.toLocaleString("en-US")}`, "pos"]);
  for (const [cd, d] of Object.entries(e.sent)) chips.push([`${shortPlace(+cd)} ${d >= 0 ? "+" : ""}${d}`, d >= 0 ? "pos" : "neg"]);
  for (const [f, d] of Object.entries(e.factions)) chips.push([`${factions.find((x) => x.id === f)?.name ?? f} ${d >= 0 ? "+" : ""}${d}`, d >= 0 ? "pos" : "neg"]);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-dashed border-line-strong bg-white/[0.015] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        {e.district ? <MapPin className="size-3" /> : <CircleDollarSign className="size-3" />}
        <span className="font-medium text-soft">{ACTIONS[e.action].label}</span>
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

function Coach({ c }: { c: Extract<ChatItem, { k: "coach" }> }) {
  const grade = c.clarity >= 3 && c.fit === 1 ? "Strong delegation" : c.clarity >= 2 && c.fit >= 0.5 ? "Workable delegation" : "Weak delegation";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-line bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <Label>How you delegated</Label>
        <span className={cn("text-[11px] font-medium", grade.startsWith("Strong") ? "text-pos" : grade.startsWith("Work") ? "text-warm" : "text-neg")}>{grade}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-[11.5px]">
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
                  <div className="tnum font-mono text-[11px] text-muted">${o.salary.toLocaleString("en-US")}/day</div>
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
