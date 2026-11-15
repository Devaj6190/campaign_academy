"use client";

import { ArrowDownRight, ArrowUp, Brain, Check, ChevronDown, CircleDollarSign, Loader2, MapPin, MessageSquare, Plus, Shuffle, Sparkles, UserMinus, UserPlus, Users, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Fit } from "@/components/Fit";
import { Avatar, Button, Dock, DockButton, Label, Meter, Section, ViewHeader } from "@/components/ui";
import { AgentPlan, type PlanTask } from "@/components/ui21/agent-plan";
import { ShaderBackground } from "@/components/ui21/dithering";
import type { Staff } from "@/lib/data";
import type { Effect } from "@/lib/engine/resolve";
import { profileFor } from "@/lib/staff/roster";
import { answerAsk, hire, letGo, loadCandidates, reassign } from "@/lib/staff/run";
import { useStaff, type ChatItem, type Run } from "@/lib/staff/store";
import { FACTIONS_2013 } from "@/lib/cases/mayor2013-factions";
import { currentCase, shortDate, shortMoney, staffMoney, useCase } from "@/lib/cases/store";
import { short, shortPlace } from "@/lib/staff/world";
import { useGame } from "@/lib/store";
import { cn, initials } from "@/lib/util";
import { Cite } from "./CaseView";

// Fixed logical canvas, seen from one camera: three terraces rising to the back.
// You stand on the top one, direct reports on the middle one, their people on the floor in front.
const W = 900, H = 690;
/** A figure at scale 1, feet at the bottom centre. */
const FIG = { w: 64, h: 124 };
/**
 * One terrace: where feet stand, how big the camera sees people there, and its shape.
 * `back` to `edge` is the top face, `edge` to `base` the riser that carries the names. `inset` narrows the back edge.
 * Names are 16px on this canvas because it is scaled down to fit: at a 1440×900 window that renders at about 13px.
 */
const TIERS = [
  { feet: 115, s: 0.8, back: 90, edge: 122, base: 168, x0: 350, x1: 550, inset: 15, label: 150 },
  { feet: 326, s: 0.92, back: 168, edge: 336, base: 402, x0: 60, x1: 840, inset: 50, label: 126 },
  { feet: 570, s: 1, back: 402, edge: 580, base: H + 400, x0: -600, x1: 1500, inset: 60, label: 98 },
];
type Pt = { x: number; t: number };
const YOU: Pt = { x: 450, t: 0 };

function layout(staff: Staff[]) {
  const pos: Record<string, Pt> = { you: YOU };
  const dirs = staff.filter((p) => !p.boss);
  dirs.forEach((p, i) => (pos[p.id] = { x: 125 + (i * 650) / (dirs.length - 1), t: 1 }));
  const subs = dirs.flatMap((d) => staff.filter((p) => p.boss === d.id));
  subs.forEach((p, i) => (pos[p.id] = { x: 50 + (i * 800) / Math.max(1, subs.length - 1), t: 2 }));
  return pos;
}

// Bezier from the foot of a boss's terrace to the top of a report's head. Reversed for reports travelling back up.
function edge(a: Pt, b: Pt, up = false) {
  const y1 = TIERS[a.t].base + 2, y2 = TIERS[b.t].feet - FIG.h * TIERS[b.t].s - 8, ym = (y1 + y2) / 2;
  return up ? `M${b.x} ${y2}C${b.x} ${ym},${a.x} ${ym},${a.x} ${y1}` : `M${a.x} ${y1}C${a.x} ${ym},${b.x} ${ym},${b.x} ${y2}`;
}

// Head photos, one file per post in /art/staff. Real photos for the posts the record names, generated ones for invented staff.
// ponytail: no photo of Bill Hyers was found, so `cm` falls back to a drawn head. Add "cm" here when cm.jpg exists.
const FACES = new Set(["fd", "fin", "com", "sch", "oq", "ob", "vc", "ct", "ev", "pr", "dg"]);
const SPARES = 4;
/** Whoever holds the post: its own photo for the first holder, one from the bench for someone hired later. */
const faceFor = (p: Staff, hired: boolean) =>
  !p.name ? undefined : hired ? `/art/staff/spare${1 + ([...p.name].reduce((a, c) => a + c.charCodeAt(0), 0) % SPARES)}.jpg` : FACES.has(p.id) ? `/art/staff/${p.id}.jpg` : undefined;
const CREDIT: Record<string, string> = {
  com: "Photo: courtesy of the Mayor's Office, via amNY",
  dg: "Photo: Personal Democracy Forum",
};
const SKIRT = new Set(["fin", "vc", "pr"]);

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
  const hires = useStaff((s) => s.hires);
  // The pointer moves the camera a little: the room tilts and slides as one piece, so the lines stay attached.
  const still = useReducedMotion();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 }), sy = useSpring(my, { stiffness: 90, damping: 18 });
  const rotateY = useTransform(sx, [-1, 1], [-4, 4]), rotateX = useTransform(sy, [-1, 1], [3, -3]);
  const x = useTransform(sx, [-1, 1], [10, -10]), y = useTransform(sy, [-1, 1], [6, -6]);
  const backX = useTransform(sx, [-1, 1], [-16, 16]);
  const look = (e: React.MouseEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader title="War room" sub="You direct. Your reports plan the work and hand it to their people." right={<ModeBadge />} />
        <div className="relative min-h-0 flex-1 px-6 pb-24" onClick={() => pick(null)} onMouseMove={look} onMouseLeave={() => { mx.set(0); my.set(0); }}>
          <motion.div style={{ x: backX }} className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-screen [mask-image:radial-gradient(ellipse_65%_60%_at_50%_0%,black,transparent)]">
            <ShaderBackground />
          </motion.div>
          <Fit w={W} h={H}>
           <motion.div className="absolute inset-0" style={{ rotateX, rotateY, x, y, transformPerspective: 1400 }}>
            {/* The light over your place at the top. */}
            <div className="pointer-events-none absolute" style={{ left: YOU.x - 230, top: -56, width: 460, height: 240, background: "radial-gradient(closest-side, rgb(214 178 110 / 0.26), transparent)" }} />
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 overflow-visible" aria-hidden>
              <defs>
                <filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3" /></filter>
                <linearGradient id="tier-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a0806" /><stop offset="1" stopColor="#1e1911" /></linearGradient>
                <linearGradient id="tier-riser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#15110b" /><stop offset="1" stopColor="#070605" /></linearGradient>
                {/* Shared by every figure: the body's shading, its rim light, and the oval a head photo is cut to. */}
                <linearGradient id="fig-body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a301d" /><stop offset="0.45" stopColor="#1a160e" /><stop offset="1" stopColor="#0c0a07" /></linearGradient>
                <linearGradient id="fig-you" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--color-gold-bright)" /><stop offset="1" stopColor="var(--color-gold-deep)" /></linearGradient>
                <linearGradient id="fig-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--color-gold-bright)" stopOpacity="0.9" /><stop offset="0.6" stopColor="var(--color-gold)" stopOpacity="0.15" /></linearGradient>
                <clipPath id="fig-head"><ellipse cx="32" cy="21" rx="16" ry="20" /></clipPath>
              </defs>
              {TIERS.map((t, i) => (
                <g key={i}>
                  <polygon points={`${t.x0 + t.inset},${t.back} ${t.x1 - t.inset},${t.back} ${t.x1},${t.edge} ${t.x0},${t.edge}`} fill="url(#tier-top)" />
                  <rect x={t.x0} y={t.edge} width={t.x1 - t.x0} height={Math.min(t.base - t.edge, 70)} fill="url(#tier-riser)" />
                  <line x1={t.x0 + t.inset} x2={t.x1 - t.inset} y1={t.back} y2={t.back} stroke="var(--color-line)" />
                  <line x1={t.x0} x2={t.x1} y1={t.edge} y2={t.edge} stroke="var(--color-gold)" strokeOpacity={0.55} />
                </g>
              ))}
              {staff.map((p) => {
                const state = busy[p.id];
                return (
                  <path
                    key={p.id}
                    d={edge(pos[p.boss ?? "you"], pos[p.id])}
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
                const d = edge(pos[child.boss ?? "you"], pos[child.id], up);
                return <Spark key={k.id} d={d} up={up} />;
              })}
            </svg>
            <Node at={YOU} name="You" role="The campaigner" you />
            {staff.map((p) => (
              <Node key={p.id} at={pos[p.id]} name={p.name} role={p.role} face={faceFor(p, !!hires[p.id])} skirt={SKIRT.has(p.id) && !hires[p.id]} job={job[p.id]} misfit={misfit[p.id]} morale={p.name ? morale[p.id] : undefined} thinking={!!active[p.id]} selected={p.id === person} busy={!!busy[p.id]} unread={unread[p.id]} onClick={() => pick(p.id)} />
            ))}
           </motion.div>
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

/**
 * A standing person, drawn once and shared: the head is a photo when there is one, initials when there is not.
 * Every photo gets the same warm grade, so a news photo and a generated one sit together.
 */
function Figure({ name, face, you, skirt }: { name?: string; face?: string; you?: boolean; skirt?: boolean }) {
  const ghost = !name;
  const body = ghost ? { fill: "none", stroke: "var(--color-faint)", strokeDasharray: "3 3" } : { fill: you ? "url(#fig-you)" : "url(#fig-body)", stroke: "url(#fig-rim)", strokeWidth: 0.8 };
  return (
    <svg viewBox={`0 0 ${FIG.w} ${FIG.h}`} className="absolute inset-0 size-full overflow-visible transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden>
      {skirt ? (
        <>
          <path d="M25 102L26 120H31V102ZM33 102V120H38L39 102Z" {...body} />
          <path d="M19 84L16 104H48L45 84Z" {...body} />
        </>
      ) : (
        <path d="M19 86L20 120H30L32 94L34 120H44L45 86Z" {...body} />
      )}
      <path d="M18 120H31V124H18ZM33 120H46V124H33Z" {...body} />
      {/* Arms, then the jacket over them. */}
      <path d="M14 54Q8 56 8 63L7 90Q7 95 11 95Q15 95 15 90L18 62ZM50 54Q56 56 56 63L57 90Q57 95 53 95Q49 95 49 90L46 62Z" {...body} />
      <path d="M14 57Q14 47 25 46H39Q50 47 50 57L46 90H18Z" {...body} />
      {!ghost && (
        <>
          <path d="M27 46L32 62L37 46Z" fill={you ? "#fff" : "var(--color-soft)"} opacity={you ? 0.9 : 0.75} />
          <path d="M31 49H33L34.5 59L32 62L29.5 59Z" fill="var(--color-gold-deep)" />
          <path d="M27 46L32 62L37 46" fill="none" stroke="var(--color-gold)" strokeOpacity={0.5} strokeWidth={0.8} />
        </>
      )}
      <rect x="28" y="37" width="8" height="10" {...body} strokeWidth={0} fill={ghost ? "none" : you ? "var(--color-gold)" : "#2a2317"} />
      <ellipse cx="32" cy="21" rx="16" ry="20" {...body} />
      {face && <image href={face} x="16" y="1" width="32" height="40" preserveAspectRatio="xMidYMid slice" clipPath="url(#fig-head)" style={{ filter: "grayscale(0.85) sepia(0.5) contrast(1.05) brightness(0.92)" }} />}
      {face && <ellipse cx="32" cy="21" rx="16" ry="20" fill="none" stroke="var(--color-gold)" strokeOpacity={0.7} strokeWidth={0.8} />}
      {!face && !ghost && !you && <text x="32" y="26" textAnchor="middle" className="fill-gold-bright font-display font-semibold" fontSize="13">{initials(name)}</text>}
      {ghost && <path d="M32 15V27M26 21H38" stroke="var(--color-faint)" strokeWidth={1.2} />}
    </svg>
  );
}

function Node({ at, name, role, face, skirt, job, misfit, morale, thinking, you, selected, busy, unread, onClick }: { at: Pt; name?: string; role: string; face?: string; skirt?: boolean; job?: string; misfit?: boolean; morale?: number; thinking?: boolean; you?: boolean; selected?: boolean; busy?: boolean; unread?: boolean; onClick?: () => void }) {
  const t = TIERS[at.t];
  const w = FIG.w * t.s, h = FIG.h * t.s;
  // The ring on the floor carries the state, as the old halo round the badge did.
  const ring = selected ? "#fff" : misfit ? "var(--color-neg)" : busy || thinking ? "var(--color-warm)" : "var(--color-gold)";
  const lit = selected || misfit || busy || thinking;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      disabled={you}
      className="group absolute flex -translate-x-1/2 flex-col items-center text-center"
      style={{ left: at.x, top: t.feet - h, width: t.label }}
    >
      <span className={cn("relative block transition-[filter] duration-300", selected && "brightness-125")} style={{ width: w, height: h }}>
        <svg viewBox="-46 -13 92 26" className="absolute left-1/2 -translate-x-1/2 overflow-visible" style={{ width: 92 * t.s, height: 26 * t.s, bottom: -13 * t.s }} aria-hidden>
          <ellipse rx="30" ry="8" fill="#000" opacity="0.55" />
          <ellipse rx="42" ry="11" fill="none" stroke={ring} strokeWidth={selected ? 2.4 : lit ? 1.6 : 1} strokeOpacity={lit ? 1 : 0.3} className={cn("transition-[stroke] duration-300", thinking && "edge-flow")} style={lit ? { filter: `drop-shadow(0 0 5px ${ring})` } : undefined} />
        </svg>
        <Figure name={name} face={face} you={you} skirt={skirt} />
        {unread && <i className="absolute top-0 size-2.5 rounded-full border-2 border-bg bg-warm" style={{ right: w * 0.2 }} />}
        {morale !== undefined && morale < 40 && <i title="Low morale" className="absolute size-2.5 rounded-full border-2 border-bg bg-neg" style={{ left: w * 0.2, top: h * 0.26 }} />}
      </span>
      {/* The name sits on the riser under the feet. */}
      <span className={cn("text-[16px] leading-tight font-medium", !name && "text-faint")} style={{ marginTop: t.edge - t.feet + 5 }}>{name ?? "Vacant"}</span>
      {/* A post shown by its title has no separate name to print. */}
      {role !== name && <span className="text-[16px] leading-tight text-muted">{role}</span>}
      <AnimatePresence>
        {misfit && (
          <motion.span key="misfit" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-0.5 rounded bg-neg/15 px-1.5 text-[15px] leading-[20px] whitespace-nowrap text-neg">
            Wrong person
          </motion.span>
        )}
        {job && (
          <motion.span key="job" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-0.5 max-w-full truncate rounded bg-warm/10 px-1.5 text-[15px] leading-[20px] text-warm">
            {job}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
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
  const ideas = [...(lastSuggest ? [lastSuggest] : []), ...ideasFor(p)].slice(0, 3);
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
          {(hired || FACES.has(p.id)) && <p className="mb-2 text-[12px] text-faint">{(!hired && CREDIT[p.id]) || "Portrait: AI-generated. This person is invented."}</p>}
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
  const closing = rows.filter((r) => r.c.k === "report" || r.c.k === "coach");
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
      {thoughts && <Thoughts c={thoughts} latest={latest} />}
      {said.map((r) => <ChatRow key={r.i} c={r.c} index={r.i} id={id} latest={false} onSuggest={onSuggest} />)}
      {/* Until the report is in, each action shows as it lands; after, they fold into the report's totals line. */}
      {!reported && !!effects.length && <div className="space-y-px border-l border-line pl-1.5">{effects.map((e, i) => <ReceiptLine key={i} e={e} />)}</div>}
      {closing.map((r) =>
        r.c.k === "coach" ? <CoachLine key={r.i} c={r.c} misfits={misfits} /> : r.c.k === "report" ? <Reply key={r.i} c={r.c} index={r.i} id={id} effects={effects} /> : null,
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
      <div className="max-w-[88%] rounded-xl border border-line bg-raised px-3 py-2 text-[13px] leading-snug text-soft">{c.text}</div>
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
                <Avatar name={`Applicant ${i + 1}`} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">Applicant {i + 1}</div>
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
