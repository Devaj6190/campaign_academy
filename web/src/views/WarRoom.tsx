"use client";

import { ArrowUp, FlaskConical, MessageSquare, Plus, Shuffle, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Fit } from "@/components/Fit";
import { Avatar, Button, Dock, DockButton, Label, Section, ViewHeader } from "@/components/ui";
import type { Staff } from "@/lib/data";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";

// Fixed logical canvas: you on top, direct reports below, their people below them.
const W = 900, H = 520;
const YOU = { x: 450, y: 58, r: 30 };

function layout(staff: Staff[]) {
  const pos: Record<string, { x: number; y: number; r: number }> = { you: YOU };
  const dirs = staff.filter((p) => !p.boss);
  dirs.forEach((p, i) => (pos[p.id] = { x: 75 + (i * 750) / (dirs.length - 1), y: 226, r: 26 }));
  const subs = dirs.flatMap((d) => staff.filter((p) => p.boss === d.id));
  subs.forEach((p, i) => (pos[p.id] = { x: 50 + (i * 800) / (subs.length - 1), y: 408, r: 21 }));
  return pos;
}

export function WarRoom() {
  const staff = useGame((s) => s.staff);
  const person = useGame((s) => s.person);
  const busy = useGame((s) => s.busy);
  const unread = useGame((s) => s.unread);
  const open = useGame((s) => s.open);
  const pos = layout(staff);
  const sel = staff.find((p) => p.id === person);
  const pick = (id: string | null) => useGame.setState((s) => ({ person: id, unread: id ? { ...s.unread, [id]: false } : s.unread }));
  const vacancies = staff.filter((p) => !p.name);

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader title="War room" sub="You direct. Your reports plan the work and hand it to their people." />
        <div className="relative min-h-0 flex-1 px-6 pb-24" onClick={() => pick(null)}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
          <Fit w={W} h={H}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 overflow-visible" aria-hidden>
              {staff.map((p) => {
                const a = pos[p.boss ?? "you"], b = pos[p.id];
                const y1 = a.y + a.r + (p.boss ? 52 : 46), y2 = b.y - b.r - 10, ym = (y1 + y2) / 2;
                const state = busy[p.id];
                return (
                  <path
                    key={p.id}
                    d={`M${a.x} ${y1}C${a.x} ${ym},${b.x} ${ym},${b.x} ${y2}`}
                    fill="none"
                    strokeWidth={state ? 1.4 : 1}
                    stroke={state ? "var(--color-warm)" : "rgb(255 255 255 / 0.1)"}
                    strokeOpacity={state === "work" ? 0.45 : 1}
                    className={cn(state === "down" && "edge-flow", state === "up" && "edge-flow up")}
                  />
                );
              })}
            </svg>
            <Node at={YOU} name="You" role="The campaigner" you />
            {staff.map((p) => (
              <Node key={p.id} at={pos[p.id]} name={p.name} role={p.role} selected={p.id === person} busy={!!busy[p.id]} unread={unread[p.id]} onClick={() => pick(p.id)} />
            ))}
          </Fit>
        </div>
        <Dock label={sel ? (sel.name ?? `${sel.role} · vacant`) : "Nobody selected"}>
          {sel?.name && <DockButton primary icon={<MessageSquare />} label="Instruct" onClick={() => document.getElementById("instruct")?.focus()} />}
          {sel?.name && <DockButton icon={<Shuffle />} label="Reassign" disabled title="Not built yet" />}
          {sel?.name && <DockButton icon={<UserMinus />} label="Let go" disabled title="Not built yet" />}
          <DockButton icon={<UserPlus />} label="Hire" sub={`${vacancies.length} open`} onClick={() => vacancies[0] && pick(vacancies[0].id)} />
          <DockButton icon={<FlaskConical />} label="Tactics" onClick={() => open("tactic")} />
        </Dock>
      </section>
      <aside className="flex w-[300px] shrink-0 flex-col border-l border-line bg-surface xl:w-[340px]">{sel ? sel.name ? <Person p={sel} /> : <Vacancy p={sel} /> : <Overview pick={pick} />}</aside>
    </div>
  );
}

function Node({ at, name, role, you, selected, busy, unread, onClick }: { at: { x: number; y: number; r: number }; name?: string; role: string; you?: boolean; selected?: boolean; busy?: boolean; unread?: boolean; onClick?: () => void }) {
  const size = at.r * 2;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      disabled={you}
      className="group absolute flex -translate-x-1/2 flex-col items-center text-center"
      style={{ left: at.x, top: at.y - at.r - 4, width: at.r < 24 ? 94 : 124 }}
    >
      <span className={cn("relative rounded-full p-1 transition-shadow duration-300", selected && "shadow-[0_0_0_1.5px_#fff,0_0_36px_rgba(255,255,255,0.28)]", busy && !selected && "shadow-[0_0_0_1.5px_var(--color-warm),0_0_28px_rgba(240,162,59,0.35)]")}>
        {name ? (
          <Avatar name={you ? undefined : name} size={size} className={cn("transition-colors group-hover:border-white/30", you && "border-white/40 from-white to-[#c9c9cf]")} />
        ) : (
          <span className="grid rounded-full border border-dashed border-line-strong text-faint transition-colors group-hover:border-muted group-hover:text-fg" style={{ width: size, height: size }}>
            <Plus className="m-auto size-4" />
          </span>
        )}
        {unread && <i className="absolute top-0.5 right-0.5 size-2.5 rounded-full border-2 border-bg bg-warm" />}
      </span>
      <span className={cn("mt-1.5 text-[12.5px] leading-tight font-medium", !name && "text-faint")}>{name ?? "Vacant"}</span>
      <span className="text-[10.5px] leading-tight text-muted">{role}</span>
    </button>
  );
}

function Overview({ pick }: { pick: (id: string) => void }) {
  const staff = useGame((s) => s.staff);
  const busy = useGame((s) => s.busy);
  const filled = staff.filter((p) => p.name).length;
  return (
    <div className="overflow-y-auto">
      <Section title="Your campaign">
        <div className="grid grid-cols-2 gap-2">
          {[["Staff", filled], ["Vacancies", staff.length - filled]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-raised px-3 py-2.5">
              <div className="tnum font-mono text-[20px] font-medium">{v}</div>
              <div className="text-[11.5px] text-muted">{k}</div>
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
                <span className="block truncate text-[11.5px] text-muted">{p.role}</span>
              </span>
              {p.name && <Status on={!!busy[p.id]} />}
            </button>
          ))}
        </div>
      </Section>
      <Section title="How it works">
        <p className="text-[12.5px] leading-relaxed text-muted">Select someone and tell them what you want in plain language. Direct reports break it into jobs and pass them down. You can watch the work travel, and the result changes your money, your map and tomorrow&apos;s paper.</p>
      </Section>
    </div>
  );
}

const Status = ({ on }: { on: boolean }) => (
  <span className={cn("flex items-center gap-1.5 text-[11px]", on ? "text-warm" : "text-faint")}>
    <i className={cn("size-1.5 rounded-full", on ? "breathe bg-warm" : "bg-faint")} />
    {on ? "Working" : "Idle"}
  </span>
);

function Person({ p }: { p: Staff }) {
  const log = useGame((s) => s.logs[p.id]);
  const busy = useGame((s) => !!s.busy[p.id]);
  const boss = useGame((s) => s.staff.find((x) => x.id === p.boss));
  const instruct = useGame((s) => s.instruct);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const first = p.name!.split(" ")[0];
  // Braces matter: scrollIntoView returns a Promise in current Chromium, and an effect must not return one.
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [log?.length]);
  const send = () => { if (text.trim()) { instruct(p.id, text.trim()); setText(""); } };

  return (
    <>
      <div className="flex items-center gap-3.5 border-b border-line px-5 py-5">
        <Avatar name={p.name} size={46} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium tracking-tight">{p.name}</div>
          <div className="truncate text-[12px] text-muted">{p.role}{boss ? ` · reports to ${boss.name?.split(" ")[0]}` : " · direct report"}</div>
        </div>
        <Status on={busy} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Profile">
          <dl className="space-y-2 text-[13px]">
            {[["Good at", p.good], ["Weak at", p.weak], ["Working on", p.doing]].map(([k, v]) => (
              <div key={k} className="flex gap-3"><dt className="w-[76px] shrink-0 text-muted">{k}</dt><dd className="text-soft">{v}</dd></div>
            ))}
          </dl>
        </Section>
        <Section title="Conversation">
          {!log?.length && <p className="text-[12.5px] text-faint">Nothing yet. Tell {first} what you need.</p>}
          <div className="space-y-2">
            {log?.map((l, i) =>
              l.who === "note" ? (
                <p key={i} className="py-1 text-center text-[11px] text-faint">{l.text}</p>
              ) : (
                <div key={i} className={cn("flex", l.who === "me" && "justify-end")}>
                  <div className={cn("max-w-[86%] rounded-xl px-3 py-2 text-[13px] leading-snug", l.who === "me" ? "bg-fg text-bg" : "border border-line bg-raised text-soft")}>{l.text}</div>
                </div>
              ),
            )}
          </div>
          <div ref={end} />
        </Section>
      </div>
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-raised p-2 transition-colors focus-within:border-white/30">
          <textarea
            id="instruct"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Tell ${first} what you need…`}
            className="flex-1 resize-none bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-faint"
          />
          <button onClick={send} disabled={!text.trim()} aria-label="Send" className="grid size-7 shrink-0 place-items-center rounded-lg bg-fg text-bg transition-opacity disabled:opacity-25">
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function Vacancy({ p }: { p: Staff }) {
  const hire = useGame((s) => s.hire);
  const options = [
    { name: "Helen Voss", line: "Careful and experienced. Has run two citywide races.", cost: "$900/day" },
    { name: "Kai Lindqvist", line: "Brilliant and abrasive. First senior role.", cost: "$600/day" },
  ];
  return (
    <div className="overflow-y-auto">
      <div className="border-b border-line px-5 py-5">
        <Label>Vacant post</Label>
        <div className="mt-1 text-[15px] font-medium tracking-tight">{p.role}</div>
      </div>
      <Section title="Candidates">
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.name} className="rounded-lg border border-line bg-raised p-3">
              <div className="flex items-center gap-3">
                <Avatar name={o.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{o.name}</div>
                  <div className="tnum font-mono text-[11px] text-muted">{o.cost}</div>
                </div>
                <Button size="sm" onClick={() => hire(p.id, i)}>Hire</Button>
              </div>
              <p className="mt-2.5 text-[12.5px] text-soft">{o.line}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
