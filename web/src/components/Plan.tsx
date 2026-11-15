"use client";

import { LINES, targetsOf, type Line } from "@/lib/cases/allocation";
import { currentCase, shortDate, staffMoney, useCase, useCaseNow } from "@/lib/cases/store";
import { campaignDay, rate, runway } from "@/lib/sim/spend";
import { cn } from "@/lib/util";
import { Label, Tag } from "./ui";

// The weekly plan's sliders, at the top of the top bar's Spending and Income panels (#33). Each line is how many of
// one action the campaign buys a week and where it is aimed; the clock spends the plan every seventh day
// (lib/sim/spend) and the work lands on the case like a staff job. Simulated, and labelled so.

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function PlanLines({ side }: { side: "out" | "in" }) {
  const allocation = useCase((s) => s.allocation);
  const work = useCase((s) => s.work);
  const { today } = useCaseNow();
  const lines = LINES.filter((l) => l.side === side);
  const r = runway(allocation);
  const day = campaignDay(today);
  const next = day + 7 - (day % 7);
  const nextDate = new Date(Date.parse(currentCase(useCase.getState().caseId).briefingDate) + (next - 1) * 86_400_000).toISOString().slice(0, 10);
  // Raised money only pays for work (the cap): anything beyond what work has cost cannot be spent.
  const waste = work.reduce((a, x) => a + x.raised, 0) - staffMoney(work).raised;
  const weekly = lines.reduce((a, l) => a + (side === "out" ? rate(l).cost : rate(l).raised) * (allocation[l.id]?.n ?? 0), 0);

  return (
    <div className="mb-4 border-b border-line pb-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Label>{side === "out" ? "Spend each week" : "Raise each week"}</Label>
        <span className="flex items-center gap-2">
          <span className="tnum font-mono text-[13px] text-soft">{side === "in" && weekly ? "about " : ""}{usd(weekly)}</span>
          <Tag kind="sim" />
        </span>
      </div>
      <div className="space-y-3.5">
        {lines.map((l) => <PlanLine key={l.id} l={l} />)}
      </div>
      <p className="mt-3 text-[12px] leading-snug text-muted">
        {side === "out"
          ? r.burn === 0
            ? "Fundraising covers the plan."
            : r.runsOut
              ? <span className="text-neg">At this rate the money runs out on {shortDate(r.runsOut)}.</span>
              : r.eatsClose
                ? <span className="text-warm">This leaves less than the {usd(r.close)} the closing push needs.</span>
                : "At this rate the money lasts to primary day."
          : waste > 0
            ? <span className="text-warm">{usd(waste)} raised beyond what work cost. Under the cap it cannot be spent.</span>
            : "Money raised pays for work, never above the cap."}
        {" "}Next run {shortDate(nextDate)}.
      </p>
    </div>
  );
}

function PlanLine({ l }: { l: Line }) {
  const { n, to } = useCase((s) => s.allocation[l.id]);
  const allot = useCase((s) => s.allot);
  const rt = rate(l);
  const targets = targetsOf(l);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("text-[13px]", !n && "text-muted")}>{l.label}</span>
        <span className="tnum font-mono text-[12.5px] text-soft">
          {n ? `${n}× · ${l.side === "out" ? usd(rt.cost * n) : `+${usd(rt.raised * n)}`}` : "None"}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={l.max}
        step={1}
        value={n}
        onChange={(e) => allot(l.id, { n: +e.target.value })}
        aria-label={`${l.label}, times a week`}
        className="mt-1.5 h-1.5 w-full cursor-pointer accent-[var(--color-gold)]"
      />
      <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-muted">
        <span>{l.does}</span>
        {targets.length > 0 && (
          <select
            value={to}
            onChange={(e) => allot(l.id, { to: e.target.value })}
            aria-label={`${l.label}: aimed at`}
            className="max-w-[160px] truncate rounded border border-line bg-raised px-1.5 py-0.5 text-[12px] text-soft"
          >
            {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
