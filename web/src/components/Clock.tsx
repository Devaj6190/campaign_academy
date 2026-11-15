"use client";

import { FastForward, Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { DAY_MS, SPEEDS, finished, pause, run, skip, tick, waiting } from "@/lib/cases/clock";
import { currentCase, longDate, useCase } from "@/lib/cases/store";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { DecisionStep } from "@/views/CaseView";
import { usePaper } from "./Paper";
import { Dialog, Label } from "./ui";

// The clock's controls for the top bar, the timer behind them, and the card that opens when a decision arrives.

/** What follows a step of the clock: the paper on a morning with news, election night on the map when the campaign is over. */
function land(r: ReturnType<typeof tick>) {
  if (r === "event") usePaper.getState().set(true);
  if (r === "arrived" && finished()) useGame.setState({ view: "map", district: null });
}

/** Keeps the days passing while the clock is running. Time waits while the paper is open. Mount once. */
export function useTicker() {
  const running = useCase((s) => s.running);
  const speed = useCase((s) => s.speed);
  const paper = usePaper((s) => s.open);
  useEffect(() => {
    if (!running || paper) return;
    const t = setInterval(() => land(tick()), DAY_MS / speed);
    return () => clearInterval(t);
  }, [running, speed, paper]);
}

const round = "grid size-7 place-items-center rounded-full border border-line-strong text-soft transition-colors hover:border-gold hover:text-gold-bright disabled:opacity-35 disabled:hover:border-line-strong disabled:hover:text-soft [&_svg]:size-3.5";

/** Run, pause, skip ahead and speed. While a decision is waiting the clock cannot run: the button opens the decision instead. */
export function ClockControls() {
  const running = useCase((s) => s.running);
  const speed = useCase((s) => s.speed);
  useCase((s) => s.at);
  useCase((s) => s.picks);
  if (finished()) return null;
  if (waiting())
    return (
      <button onClick={() => useCase.setState({ card: true })} className="btn-gold h-7 rounded-full px-3 text-[12px] whitespace-nowrap" title="The clock is stopped until you decide">
        Decision waiting
      </button>
    );
  const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  return (
    <div className="flex items-center gap-1.5">
      <button className={round} onClick={() => (running ? pause() : land(run()))} aria-label={running ? "Pause the clock" : "Run the clock"} title={running ? "Pause" : "Run the campaign forward"}>
        {running ? <Pause /> : <Play />}
      </button>
      <button className={round} onClick={() => land(skip())} aria-label="Skip to the next news or decision" title="Skip to the next news or decision">
        <FastForward />
      </button>
      <button onClick={() => useCase.setState({ speed: next })} className={cn(round, "tnum w-9 font-mono text-[11.5px]")} aria-label={`Speed ${speed} times. Change to ${next} times.`} title="Change speed">
        {speed}×
      </button>
    </div>
  );
}

/** The decision the campaign has reached, as a card over whatever screen the student is on. */
export function DecisionCard() {
  const { caseId, at, card } = useCase();
  const c = currentCase(caseId);
  const d = c.decisions[at - 1];
  const close = () => useCase.setState({ card: false });
  return (
    <Dialog open={card && !!d} onClose={close} className="max-w-[820px]">
      {card && d && (
        <div className="overflow-y-auto">
          <div className="px-5 pt-5"><Label>Decision {at} of {c.decisions.length} · {longDate(d.date)}</Label></div>
          <DecisionStep key={d.id} c={c} d={d} index={at - 1} />
        </div>
      )}
    </Dialog>
  );
}
