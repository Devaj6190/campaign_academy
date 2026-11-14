"use client";

// Agent Plan, adapted from 21st.dev (isaiahbjork/agent-plan): https://21st.dev/r/isaiahbjork/agent-plan
// Changes from the original: tasks come in as props instead of demo data, statuses are driven by the caller
// rather than toggled at random, "MCP servers" became "assigned to", and colours use this app's tokens.

import { CheckCircle2, Circle, CircleAlert, CircleDotDashed, CircleX } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/util";

export type PlanStatus = "pending" | "in-progress" | "completed" | "need-help" | "failed";
export type PlanSubtask = { id: string; title: string; description: string; status: PlanStatus; assigned?: string[] };
export type PlanTask = { id: string; title: string; status: PlanStatus; subtasks: PlanSubtask[] };

const EASE = [0.2, 0.65, 0.3, 0.9] as const;
const LABEL: Record<PlanStatus, string> = { pending: "Queued", "in-progress": "Working", completed: "Done", "need-help": "Needs you", failed: "Failed" };
const BADGE: Record<PlanStatus, string> = {
  pending: "bg-white/[0.06] text-muted",
  "in-progress": "bg-warm/15 text-warm",
  completed: "bg-pos/15 text-pos",
  "need-help": "bg-warm/15 text-warm",
  failed: "bg-neg/15 text-neg",
};

function StatusIcon({ status, className }: { status: PlanStatus; className: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={status} className="block" initial={{ opacity: 0, scale: 0.8, rotate: -10 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.8, rotate: 10 }} transition={{ duration: 0.2, ease: EASE }}>
        {status === "completed" ? <CheckCircle2 className={cn(className, "text-pos")} />
          : status === "in-progress" ? <CircleDotDashed className={cn(className, "animate-[spin_4s_linear_infinite] text-warm")} />
          : status === "need-help" ? <CircleAlert className={cn(className, "text-warm")} />
          : status === "failed" ? <CircleX className={cn(className, "text-neg")} />
          : <Circle className={cn(className, "text-faint")} />}
      </motion.span>
    </AnimatePresence>
  );
}

export function AgentPlan({ tasks }: { tasks: PlanTask[] }) {
  // Tasks open by default; the set records the ones the reader closed.
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Record<string, boolean>>({});

  return (
    <LayoutGroup>
      <ul className="-mx-2">
        {tasks.map((task) => {
          const open = !closed[task.id];
          return (
            <motion.li key={task.id} layout="position" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
              <button onClick={() => setClosed((c) => ({ ...c, [task.id]: open }))} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
                <StatusIcon status={task.status} className="size-[18px]" />
                <span className={cn("min-w-0 flex-1 truncate text-[13px]", task.status === "completed" && "text-muted line-through")}>{task.title}</span>
                <motion.span key={task.status} initial={{ scale: 1 }} animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }} className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-medium", BADGE[task.status])}>
                  {LABEL[task.status]}
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && task.subtasks.length > 0 && (
                  <motion.div className="relative overflow-hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                    {/* Dashed line tying the subtasks to the task icon above. */}
                    <div className="absolute top-0 bottom-1 left-[16px] border-l border-dashed border-white/15" />
                    <ul className="mb-1.5 ml-3 space-y-0.5">
                      {task.subtasks.map((sub, i) => {
                        const key = `${task.id}-${sub.id}`;
                        return (
                          <motion.li key={sub.id} className="pl-5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 500, damping: 25, delay: i * 0.05 }}>
                            <button onClick={() => setDetail((d) => ({ ...d, [key]: !d[key] }))} className="flex w-full items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-hover">
                              <StatusIcon status={sub.status} className="size-3.5" />
                              <span className={cn("min-w-0 flex-1 truncate text-[12.5px]", sub.status === "completed" ? "text-muted line-through" : "text-soft")}>{sub.title}</span>
                              {sub.assigned?.[0] && <span className="shrink-0 text-[10.5px] text-faint">{sub.assigned[0]}</span>}
                            </button>
                            <AnimatePresence initial={false}>
                              {detail[key] && (
                                <motion.div className="ml-[7px] overflow-hidden border-l border-dashed border-white/15 pl-4 text-[11.5px] text-muted" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                                  <p className="py-1">{sub.description}</p>
                                  {!!sub.assigned?.length && (
                                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                      <span>Assigned to</span>
                                      {sub.assigned.map((a, n) => (
                                        <motion.span key={a} className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[10.5px] font-medium text-soft" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: n * 0.05 } }}>
                                          {a}
                                        </motion.span>
                                      ))}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}
