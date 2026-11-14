"use client";

import { BookOpen, CalendarDays, Check, Map, Network, Newspaper, Plus, ScrollText, UserRound, Users, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { View } from "@/lib/data";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";

// The sections of the tool, in the order a student meets them: the case first, then the material behind it.
const VIEWS: [View, string, LucideIcon][] = [["case", "Case", BookOpen], ["profile", "Profile", UserRound], ["war", "War room", Network], ["map", "Map", Map], ["factions", "Factions", Users]];

/** The navigation rail: where you are, what is left to do today, and the desk. On narrow windows the same content opens from the top bar's menu. */
export function Sidebar() {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-surface min-[1200px]:flex">
      <SidebarBody />
    </aside>
  );
}

export function SidebarBody() {
  const view = useGame((s) => s.view);
  const go = useGame((s) => s.go);
  const tasks = useGame((s) => s.tasks);
  const toggle = useGame((s) => s.toggleTask);
  const addTask = useGame((s) => s.addTask);
  const open = useGame((s) => s.open);
  const planks = useGame((s) => s.manifesto.length);
  const [text, setText] = useState("");
  const left = tasks.filter((t) => !t.done).length;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <nav aria-label="Sections" className="space-y-0.5">
          {VIEWS.map(([k, name, Icon]) => (
            <button
              key={k}
              onClick={() => go(k)}
              aria-current={view === k ? "page" : undefined}
              className={cn("flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors", view === k ? "bg-hover font-medium text-fg" : "text-muted hover:bg-white/[0.04] hover:text-fg")}
            >
              <Icon className={cn("size-4", view === k ? "text-gold" : "text-faint")} />
              {name}
            </button>
          ))}
        </nav>

        <Group title="Today" right={`${left} left`}>
          <ul>
            {tasks.map((t) => (
              <li key={t.id}>
                <button onClick={() => toggle(t.id)} className="group flex w-full items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.04]">
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors", t.done ? "border-gold bg-gold text-[#1a1408]" : "border-line-strong group-hover:border-muted")}>
                    {t.done && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className={cn("text-[13px] leading-snug", t.done ? "text-faint line-through" : "text-soft")}>{t.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <form
            className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-faint focus-within:text-fg"
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) { addTask(text.trim()); setText(""); } }}
          >
            <Plus className="size-4 shrink-0" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task" aria-label="Add a task" className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-faint" />
          </form>
        </Group>

        <Group title="Desk">
          <Row icon={<Newspaper />} onClick={() => open("paper")}>Morning paper</Row>
          <Row icon={<ScrollText />} onClick={() => open("manifesto")} badge={String(planks)}>Manifesto</Row>
          <Row icon={<CalendarDays />} onClick={() => open("calendar")}>Calendar</Row>
        </Group>
      </div>
      <Preview />
    </>
  );
}

const Group = ({ title, right, children }: { title: string; right?: string; children: ReactNode }) => (
  <section className="mt-6">
    <div className="mb-1 flex items-baseline justify-between px-2.5">
      <h2 className="text-[12px] font-medium text-muted">{title}</h2>
      {right && <span className="tnum text-[12px] text-faint">{right}</span>}
    </div>
    {children}
  </section>
);

const Row = ({ icon, children, onClick, badge }: { icon: ReactNode; children: ReactNode; onClick: () => void; badge?: string }) => (
  <button onClick={onClick} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-soft transition-colors hover:bg-white/[0.04] hover:text-fg [&_svg]:size-4 [&_svg]:text-faint">
    {icon}
    <span className="flex-1 text-left">{children}</span>
    {badge && <span className="tnum text-[12px] text-muted">{badge}</span>}
  </button>
);

// Shortcuts for demoing states that normally take time to reach. Not part of the game.
function Preview() {
  const jump = useGame((s) => s.jumpToEvening);
  const speak = useGame((s) => s.speak);
  const open = useGame((s) => s.open);
  const items: [string, () => void][] = [["Evening", jump], ["Staff message", speak], ["Tactic", () => open("tactic")], ["Election", () => open("election")]];
  return (
    <div className="border-t border-line p-3">
      <div className="px-2.5 text-[12px] text-faint">Preview shortcuts</div>
      <div className="mt-1.5 flex flex-wrap gap-1 px-1.5">
        {items.map(([n, fn]) => (
          <button key={n} onClick={fn} className="h-6 rounded border border-line px-2 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-fg">{n}</button>
        ))}
      </div>
    </div>
  );
}
