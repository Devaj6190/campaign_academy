"use client";

import { Check } from "lucide-react";
import { currentCase, useCase } from "@/lib/cases/store";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";

/** Where you are in the case. The sections of the tool are the tabs in the top bar. On narrow windows this opens from the top bar's "Outline" menu. */
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
      <section className="mt-1">
        <div className="mb-1 flex items-baseline justify-between px-2.5">
          <h2 className="text-[12px] font-medium text-muted">The case</h2>
          <span className="tnum text-[12px] text-faint">{Math.min(reached - 1, c.decisions.length)} of {c.decisions.length} decided</span>
        </div>
        <ol>
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
      </section>
    </div>
  );
}
