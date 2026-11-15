"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo } from "react";
import { Button, Label, Meter } from "@/components/ui";
import { FACTIONS } from "@/lib/data";
import { incomeBy, limitStatus, matchStatus, nextPaymentDay, runway, avgIncome } from "@/lib/money/finance";
import { approveProposal, dismissProposal } from "@/lib/money/run";
import { ENVELOPES, GAME, NYC, SOURCE_NOTE, SOURCES, sum } from "@/lib/money/rules";
import { useGame } from "@/lib/store";
import { cn, money } from "@/lib/util";
import { activeRivals, ME, nameOf, rivalDef } from "@/lib/scenario";

// The campaign's money, in the three top-bar panels: what goes out (daily budgets), what comes in
// (donors and public funds), and the books (runway, matching funds, the spending limit, filings, Dana).

const groupName = (id: string) => FACTIONS.find((f) => f.id === id)?.name ?? id;

export function SpendingPanel() {
  const m = useGame((s) => s.money);
  const payroll = useGame((s) => s.losses[0]?.v ?? 0);
  const budget = useGame((s) => s.budget);
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <Label>Spending per day</Label>
        <span className="tnum font-mono text-[12px] text-soft">{money(payroll + sum(m.envelopes))}</span>
      </div>
      <div className="flex items-center justify-between text-[13px]">
        <span>Payroll</span>
        <span className="tnum font-mono text-[12px] text-soft">{money(payroll)}</span>
      </div>
      <p className="text-[11.5px] text-faint">Changes when you hire or let staff go.</p>
      <div className="mt-4 space-y-4">
        {ENVELOPES.map((e) => {
          const today = m.envelopes[e.id], used = m.spent[e.id], next = m.next[e.id];
          return (
            <div key={e.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px]">{e.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="tnum mr-1 font-mono text-[11.5px] text-muted">tomorrow {money(next)}</span>
                  <Step onClick={() => budget(e.id, -500)} label={`Less on ${e.label} tomorrow`}><Minus /></Step>
                  <Step onClick={() => budget(e.id, 500)} label={`More on ${e.label} tomorrow`}><Plus /></Step>
                </div>
              </div>
              <Meter value={today ? (used / today) * 100 : 0} color="var(--color-neg)" className="my-1.5" />
              <div className="flex justify-between text-[11.5px] text-faint">
                <span>{e.note}</span>
                <span className="tnum font-mono">{money(used)} of {money(today)} used</span>
              </div>
            </div>
          );
        })}
      </div>
      {m.waste && m.waste.amount > 0 && (
        <p className="mt-4 text-[12px] text-warm">Yesterday {money(m.waste.amount)} went unused and was lost ({ENVELOPES.filter((e) => m.waste!.by[e.id] > 0).map((e) => `${e.label} ${money(m.waste!.by[e.id])}`).join(", ")}).</p>
      )}
      <p className="mt-4 border-t border-line pt-3 text-[11.5px] text-faint">Each budget is paid every morning, and whatever nobody uses that day is lost. Changes apply from tomorrow. When a budget runs out, directors ask you for more.</p>
    </div>
  );
}

export function IncomePanel() {
  const m = useGame((s) => s.money);
  const day = useGame((s) => s.day);
  const by = useMemo(() => incomeBy(m, day), [m, day]);
  const total = SOURCES.reduce((a, k) => a + by[k], 0) || 1;
  const donors = Object.entries(m.donors).sort((a, b) => b[1].count - a[1].count);
  const count = donors.reduce((a, [, d]) => a + d.count, 0);
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <Label>Raised, last 7 days</Label>
        <span className="tnum font-mono text-[12px] text-soft">{money(total === 1 ? 0 : total)}</span>
      </div>
      <div className="space-y-3">
        {SOURCES.map((k) => (
          <div key={k}>
            <div className="flex justify-between text-[13px]"><span>{k}</span><span className="tnum font-mono text-[12px] text-soft">{money(by[k])}</span></div>
            <Meter value={(by[k] / total) * 100} color="var(--color-pos)" className="mt-1.5" />
          </div>
        ))}
      </div>
      <Label className="mt-5 block">Donors so far · {count.toLocaleString("en-US")}</Label>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-soft">
        {donors.slice(0, 6).map(([id, d]) => <span key={id}>{groupName(id)} <span className="tnum font-mono text-faint">{d.count.toLocaleString("en-US")}</span></span>)}
        {!donors.length && <span className="text-faint">No donors yet.</span>}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[11.5px] text-faint">Money comes in only from fundraising: call time and dinners reach big donors, house parties and emails reach small ones. Asking the same people again brings in less. Small online gifts grow when the polls show young voters warming to Cole.</p>
    </div>
  );
}

export function FinancePanel() {
  const g = useGame();
  const m = g.money;
  const payroll = g.losses[0]?.v ?? 0;
  const ms = matchStatus(m);
  const lim = limitStatus(m);
  const rw = runway(g.cash, payroll, m, g.day);
  const pay = nextPaymentDay(g.day);
  const p = m.proposal?.state === "open" ? m.proposal : null;
  const join = g.joinPublicFinancing;
  const filings = [
    { name: ME.short, raised: m.raisedTotal + m.matchPaid, spent: m.spentTotal, cash: g.cash, note: m.participant === false ? "not in public financing" : "in public financing" },
    ...activeRivals(g.day).map((id) => ({ name: nameOf(id), raised: g.rivals[id].raised, spent: g.rivals[id].spent, cash: g.rivals[id].cash, note: rivalDef(id).participant ? "in public financing" : "not in public financing" })),
  ];
  return (
    <div className="max-h-[78vh] overflow-y-auto p-4">
      {m.participant === null && (
        <div className="mb-4 rounded-lg border border-warm/30 bg-warm/[0.06] p-3">
          <Label className="text-warm">Decide today</Label>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-soft">
            Join the city&apos;s public financing program? The first ${NYC.matchable} from each New York donor is matched {NYC.ratio} to 1 once you qualify, but you accept a spending limit of {money(GAME.spendingLimit)} and donors can give at most ${NYC.limitParticipant.toLocaleString("en-US")}. Stay out and there is no match and no limit, and donors can give up to ${NYC.limitNonParticipant.toLocaleString("en-US")}.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => join(true)}>Join</Button>
            <Button size="sm" onClick={() => join(false)}>Stay out</Button>
          </div>
        </div>
      )}

      {p && (
        <div className="mb-4 rounded-lg border border-line-strong p-3">
          <Label>Dana&apos;s budget for the week</Label>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-soft">{p.note}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
            {ENVELOPES.map((e) => (
              <div key={e.id} className="rounded-md bg-white/[0.04] px-2 py-1.5">
                <div className="text-faint">{e.label}</div>
                <div className="tnum font-mono">{money(p[e.id])}</div>
                <div className="tnum font-mono text-[10.5px] text-faint">now {money(m.next[e.id])}</div>
              </div>
            ))}
          </div>
          <ul className="mt-2 space-y-0.5 text-[12px] text-soft">{p.fundraising.map((t) => <li key={t}>· {t}</li>)}</ul>
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" variant="primary" onClick={approveProposal}>Approve</Button>
            <Button size="sm" variant="ghost" onClick={dismissProposal}>Not now</Button>
          </div>
          <p className="mt-1.5 text-[11px] text-faint">Approving sets tomorrow&apos;s budgets and sends Dana after the first fundraising step. To change it, set the budgets yourself in Spending.</p>
        </div>
      )}

      <Row k="Runway" v={Number.isFinite(rw) ? `${Math.floor(rw)} days` : "Lasts to election day"} warn={rw < 30 - g.day} />
      <Row k="Net per day" v={`${avgIncome(m, g.day) - payroll - sum(m.next) < 0 ? "−" : "+"}${money(Math.abs(avgIncome(m, g.day) - payroll - sum(m.next)))}`} />

      <Label className="mt-4 block">Public matching funds</Label>
      {m.participant === false ? (
        <p className="mt-1.5 text-[12px] text-muted">{ME.short} stayed out: no matching funds and no spending limit.</p>
      ) : (
        <div className="mt-2 space-y-2 text-[12px]">
          {!ms.qualified && (
            <>
              <Progress label="Matchable money" have={ms.matchable} need={GAME.thresholdDollars} fmt={money} />
              <Progress label="New York donors" have={ms.nycDonors} need={GAME.thresholdDonors} fmt={(n) => Math.round(n).toLocaleString("en-US")} />
            </>
          )}
          {ms.qualified && <p className="text-pos">Qualified. Matched so far {money(ms.earned)}, paid {money(m.matchPaid)}.</p>}
          {m.matchStopped ? (
            <p className="text-neg">Matching payments stopped after the spending limit was broken.</p>
          ) : (
            pay && <p className="text-muted">Next payment day {pay}{ms.owed ? `: about ${money(ms.owed)} due` : ""}.</p>
          )}
        </div>
      )}

      {lim.limit !== null && (
        <>
          <Label className="mt-4 block">Spending limit</Label>
          <Meter value={(m.spentTotal / lim.limit) * 100} color={lim.over ? "var(--color-neg)" : "var(--color-warm)"} className="mt-2" />
          <div className="tnum mt-1 flex justify-between font-mono text-[11.5px] text-muted"><span>{money(m.spentTotal)} spent</span><span>limit {money(lim.limit)}</span></div>
          {m.fines.length > 0 && <p className="mt-1 text-[12px] text-neg">Fined {money(m.fines.reduce((a, f) => a + f.amount, 0))} for overspending.</p>}
        </>
      )}

      <Label className="mt-4 block">Filings</Label>
      <table className="tnum mt-2 w-full font-mono text-[11.5px]">
        <thead className="text-faint"><tr><th className="text-left font-normal">Campaign</th><th className="text-right font-normal">Raised</th><th className="text-right font-normal">Spent</th><th className="text-right font-normal">Cash</th></tr></thead>
        <tbody>
          {filings.map((f) => (
            <tr key={f.name} title={f.note}><td className={cn("py-0.5 font-sans", f.name === ME.short ? "text-warm" : "text-soft")}>{f.name}</td><td className="text-right">{money(f.raised)}</td><td className="text-right">{money(f.spent)}</td><td className="text-right">{money(f.cash)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 border-t border-line pt-3 text-[11px] text-faint">{SOURCE_NOTE}</p>
    </div>
  );
}

const Row = ({ k, v, warn }: { k: string; v: string; warn?: boolean }) => (
  <div className="flex justify-between text-[13px]"><span className="text-muted">{k}</span><span className={cn("tnum font-mono text-[12.5px]", warn && "text-neg")}>{v}</span></div>
);

function Progress({ label, have, need, fmt }: { label: string; have: number; need: number; fmt: (n: number) => string }) {
  return (
    <div>
      <div className="flex justify-between"><span className="text-soft">{label}</span><span className="tnum font-mono text-muted">{fmt(have)} / {fmt(need)}</span></div>
      <Meter value={(have / need) * 100} color="var(--color-pos)" className="mt-1" />
    </div>
  );
}

const Step = ({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} className="grid size-5 place-items-center rounded border border-line-strong text-muted transition-colors hover:bg-hover hover:text-fg [&_svg]:size-3">
    {children}
  </button>
);
