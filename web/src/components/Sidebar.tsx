"use client";

import { Check, ChevronRight, Newspaper, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { create } from "zustand";
import { currentCase, useCase } from "@/lib/cases/store";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { usePaper } from "./Paper";
import { Label } from "./ui";

// The student's own to-do list. It starts empty: the game store's tasks belong to the fictional race, which is no longer mounted.
// ponytail: kept in memory only, like the rest of the case state; persist it with the picks if they ever get saved.
type Task = { id: number; text: string; done: boolean };
const useTasks = create<{ tasks: Task[]; add: (text: string) => void; toggle: (id: number) => void }>((set) => ({
  tasks: [],
  add: (text) => set((s) => ({ tasks: [...s.tasks, { id: Date.now(), text, done: false }] })),
  toggle: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
}));

/** Your tasks, and where you are in the case. The sections of the tool are the tabs in the top bar. On narrow windows this opens from the top bar's "Tasks" menu. */
export function Sidebar() {
  return (
    <aside className="edge-r hidden w-[256px] shrink-0 flex-col bg-gradient-to-r from-[#0b0906] to-[#090706] min-[1200px]:flex">
      <SidebarBody />
    </aside>
  );
}

export function SidebarBody() {
  const view = useGame((s) => s.view);
  const go = useGame((s) => s.go);
  const { caseId, step, picks, at, go: goStep } = useCase();
  const c = currentCase(caseId);
  const reached = at; // furthest step the campaign has reached
  const openPaper = usePaper((s) => s.set);
  // A decision's title is only shown once the student has reached it, so the list can't give away what is coming.
  const steps = ["Briefing", ...c.decisions.map((d, i) => (i + 1 <= reached ? d.title : `Decision ${i + 1}`)), "Election night"];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pt-5 pb-4">
      <Tasks />
      <section className="mt-7">
        <div className="plate mb-2 flex h-8 items-center gap-2.5 px-5"><Label className="flex-1 text-gold-bright">Desk</Label></div>
        <div className="px-4">
          <button onClick={() => openPaper(true)} className="group flex h-10 w-full items-center gap-3 rounded-lg px-1 text-[13px] text-soft transition-colors hover:text-gold-bright">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong transition-colors group-hover:border-gold [&_svg]:size-3.5 [&_svg]:text-gold"><Newspaper /></span>
            Morning paper
          </button>
        </div>
      </section>
      {/* The outline is its own section, closed until asked for: the Case screen already shows the same steps. */}
      <details className="group mt-7">
        <summary className="plate flex h-8 cursor-pointer list-none items-center gap-2.5 px-5 [&::-webkit-details-marker]:hidden">
          <ChevronRight className="-mx-1 size-3.5 text-gold transition-transform group-open:rotate-90" />
          <Label className="flex-1 text-gold-bright">Case outline</Label>
          <span className="tnum font-mono text-[11px] text-gold/80">{c.decisions.filter((d) => picks[d.id]).length} of {c.decisions.length}</span>
        </summary>
        {/* Steps hang off a rail: each one is a node on the line. */}
        <ol className="mt-3 mr-4 ml-[27px] border-l border-line-strong">
          {steps.map((label, i) => {
            const done = i === 0 ? step > 0 : !!picks[c.decisions[i - 1]?.id];
            return (
              <li key={i}>
                <button
                  disabled={i > reached}
                  onClick={() => { goStep(i); go("case"); }}
                  aria-current={view === "case" && step === i ? "step" : undefined}
                  className="group/step relative flex w-full py-[7px] pr-1 pl-5 text-left disabled:opacity-40"
                >
                  <Node on={done} here={step === i}>{done ? <Check className="size-2.5" strokeWidth={3.5} /> : null}</Node>
                  <span className={cn("text-[13px] leading-snug transition-colors", step === i ? "text-gold-bright" : "text-soft group-hover/step:text-fg")}>{label}</span>
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
    <section>
      <div className="plate mb-3 flex h-8 items-center gap-2.5 px-5">
        <Label className="flex-1 text-gold-bright">Tasks</Label>
        <span className="tnum font-mono text-[11px] text-gold/80">{tasks.filter((t) => !t.done).length} left</span>
      </div>
      <ul className="mr-4 ml-[27px] border-l border-line-strong">
        {tasks.map((t) => (
          <li key={t.id}>
            <button onClick={() => toggle(t.id)} aria-pressed={t.done} className="group/step relative flex w-full py-[7px] pr-1 pl-5 text-left">
              <Node on={t.done}>{t.done ? <Check className="size-2.5" strokeWidth={3.5} /> : null}</Node>
              <span className={cn("text-[13px] leading-snug transition-colors", t.done ? "text-faint line-through" : "text-soft group-hover/step:text-fg")}>{t.text}</span>
            </button>
          </li>
        ))}
        <li>
          <form
            className="relative flex items-center py-[7px] pl-5 text-faint focus-within:text-gold-bright"
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) { add(text.trim()); setText(""); } }}
          >
            <span className="absolute -left-[7.5px] grid size-[14px] place-items-center rounded-full border border-dashed border-current bg-bg"><Plus className="size-2.5" /></span>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task" aria-label="Add a task" className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-faint" />
          </form>
        </li>
      </ul>
    </section>
  );
}

/** A node on the rail: filled gold when done, ringed bright where you are. */
const Node = ({ on, here, children }: { on: boolean; here?: boolean; children?: ReactNode }) => (
  <span className={cn("absolute top-[9px] -left-[7.5px] grid size-[14px] place-items-center rounded-full border transition-colors", on ? "border-gold bg-gold text-bg" : here ? "border-gold-bright bg-bg" : "border-gold/60 bg-bg group-hover/step:border-gold-bright")}>
    {children}
  </span>
);
