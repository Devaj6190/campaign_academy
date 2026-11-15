"use client";

import { Check, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { create } from "zustand";
import { currentCase, useCase } from "@/lib/cases/store";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";

// The student's own to-do list. It starts empty: the game store's tasks belong to the fictional race, which is no longer mounted.
// ponytail: kept in memory only, like the rest of the case state; persist it with the picks if they ever get saved.
type Task = { id: number; text: string; done: boolean };
const useTasks = create<{ tasks: Task[]; add: (text: string) => void; toggle: (id: number) => void }>((set) => ({
  tasks: [],
  add: (text) => set((s) => ({ tasks: [...s.tasks, { id: Date.now(), text, done: false }] })),
  toggle: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
}));

/** Your tasks, and where you are in the case. The sections of the tool are the tabs in the top bar. On narrow windows this opens from the top bar's "Outline" menu. */
export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface min-[1200px]:flex">
      <SidebarBody />
    </aside>
  );
}

export function SidebarBody() {
  const view = useGame((s) => s.view);
  const go = useGame((s) => s.go);
  const { caseId, step, picks, go: goStep } = useCase();
  const c = currentCase(caseId);
  const reached = c.decisions.filter((d) => picks[d.id]).length + 1; // furthest step open
  // A decision's title is only shown once the student has reached it, so the list can't give away what is coming.
  const steps = ["Briefing", ...c.decisions.map((d, i) => (i + 1 <= reached ? d.title : `Decision ${i + 1}`)), "Election night"];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <Tasks />
      {/* The outline is its own section, closed until asked for: the Case screen already shows the same steps. */}
      <details className="group mt-6">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-3.5 text-faint transition-transform group-open:rotate-90" />
          <h2 className="flex-1 text-[12px] font-medium text-muted">Case outline</h2>
          <span className="tnum text-[12px] text-faint">{Math.min(reached - 1, c.decisions.length)} of {c.decisions.length} decided</span>
        </summary>
        <ol className="mt-1">
          {steps.map((label, i) => {
            const done = i === 0 ? step > 0 : !!picks[c.decisions[i - 1]?.id];
            return (
              <li key={i}>
                <button
                  disabled={i > reached}
                  onClick={() => { goStep(i); go("case"); }}
                  aria-current={view === "case" && step === i ? "step" : undefined}
                  className={cn("group flex w-full items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-40 disabled:hover:bg-transparent", step === i && "bg-white/[0.04]")}
                >
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[9px]", done ? "border-gold bg-gold text-[#1a1408]" : step === i ? "border-gold text-gold" : "border-line-strong text-faint")}>
                    {done ? <Check className="size-3" strokeWidth={3} /> : i || ""}
                  </span>
                  <span className={cn("text-[13px] leading-snug", step === i ? "text-fg" : "text-soft")}>{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}

function Tasks() {
  const { tasks, add, toggle } = useTasks();
  const [text, setText] = useState("");
  return (
    <section className="mt-1">
      <div className="mb-1 flex items-baseline justify-between px-2.5">
        <h2 className="text-[12px] font-medium text-muted">Tasks</h2>
        <span className="tnum text-[12px] text-faint">{tasks.filter((t) => !t.done).length} left</span>
      </div>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <button onClick={() => toggle(t.id)} aria-pressed={t.done} className="group flex w-full items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.04]">
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
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) { add(text.trim()); setText(""); } }}
      >
        <Plus className="size-4 shrink-0" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task" aria-label="Add a task" className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-faint" />
      </form>
    </section>
  );
}
