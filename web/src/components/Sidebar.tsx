"use client";

import { CalendarDays, Check, Newspaper, Plus, ScrollText } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { Label } from "./ui";

/** Full-height sidebar on wide windows. On narrower ones the same content lives in the top bar's "Today" menu. */
export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface min-[1200px]:flex">
      <SidebarBody />
    </aside>
  );
}

export function SidebarBody() {
  const tasks = useGame((s) => s.tasks);
  const toggle = useGame((s) => s.toggleTask);
  const addTask = useGame((s) => s.addTask);
  const open = useGame((s) => s.open);
  const planks = useGame((s) => s.manifesto.length);
  const electionDone = useGame((s) => !!s.election?.done);
  const unread = useGame((s) => s.editions.length > 0 && !s.editions[s.editions.length - 1].read);
  const [text, setText] = useState("");
  const left = tasks.filter((t) => !t.done).length;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <Label>Today</Label>
          <span className="tnum font-mono text-[11px] text-faint">{left} left</span>
        </div>
        <ul>
          {tasks.map((t) => (
            <li key={t.id}>
              <button onClick={() => toggle(t.id)} className="group flex w-full items-start gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-hover">
                <span className={cn("mt-px grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors", t.done ? "border-fg bg-fg text-bg" : "border-line-strong group-hover:border-muted")}>
                  {t.done && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className={cn("text-[13px] leading-snug transition-colors", t.done ? "text-faint line-through" : "text-soft")}>{t.text}</span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-1 flex items-center gap-2.5 rounded-md px-1 py-1.5 text-faint focus-within:text-fg"
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) { addTask(text.trim()); setText(""); } }}
        >
          <Plus className="size-4 shrink-0" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task" className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-faint" />
        </form>

        <div className="mt-6 mb-2 px-1"><Label>Desk</Label></div>
        <Row icon={<Newspaper />} onClick={() => { useGame.setState({ paperIndex: null }); open("paper"); }} dot={unread}>Morning paper</Row>
        <Row icon={<ScrollText />} onClick={() => open("manifesto")} badge={String(planks)}>Manifesto</Row>
        <Row icon={<CalendarDays />} onClick={() => open("calendar")}>Calendar</Row>
        {electionDone && <Row icon={<ScrollText />} onClick={() => useGame.setState({ overlay: "debrief" })}>How it really went</Row>}
      </div>
      <Preview />
    </>
  );
}

const Row = ({ icon, children, onClick, badge, dot }: { icon: ReactNode; children: ReactNode; onClick: () => void; badge?: string; dot?: boolean }) => (
  <button onClick={onClick} className="flex h-8 w-full items-center gap-2.5 rounded-md px-1.5 text-[13px] text-soft transition-colors hover:bg-hover hover:text-fg [&_svg]:size-4 [&_svg]:text-muted">
    {icon}
    <span className="flex-1 text-left">{children}</span>
    {dot && <span className="size-1.5 rounded-full bg-warm" aria-label="Unread" />}
    {badge && <span className="tnum rounded bg-white/[0.07] px-1.5 font-mono text-[10.5px] text-muted">{badge}</span>}
  </button>
);

// Shortcuts for demoing states that normally take time to reach. Not part of the game.
function Preview() {
  const jump = useGame((s) => s.jumpToEvening);
  const speak = useGame((s) => s.speak);
  const open = useGame((s) => s.open);
  const items: [string, () => void][] = [["Evening", jump], ["Staff message", speak], ["Tactic", () => open("tactic")], ["Election", () => open("election")]];
  return (
    <div className="border-t border-line p-4">
      <Label>Preview shortcuts</Label>
      <div className="mt-2 flex flex-wrap gap-1">
        {items.map(([n, fn]) => (
          <button key={n} onClick={fn} className="h-6 rounded border border-line px-2 text-[11px] text-faint transition-colors hover:border-line-strong hover:text-fg">{n}</button>
        ))}
      </div>
    </div>
  );
}
