"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { realPlanksAt } from "@/components/RealPlatform";
import { ACTIVE, colorOf, fullNameOf, ME, nameOf } from "@/lib/scenario";
import { CASE } from "@/lib/scenario/case";
import { MOMENTS } from "@/lib/scenario/moments";
import { RESULT_2013 } from "@/lib/scenario/nyc2013";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { Claims, Cite } from "@/views/CaseView";
import { Button, Label, Meter, Tag } from "./ui";

// The end of a real race: your simulated election night, then what really happened, borough by borough and
// moment by moment, with sources. It compares; it does not grade. Matching the real campaign is not the same
// as being right.

const BOROS: Record<number, string> = { 1: "Manhattan", 2: "Bronx", 3: "Brooklyn", 4: "Queens", 5: "Staten Island" };
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export function Debrief() {
  const g = useGame();
  const r = g.election?.result;
  if (!r || ACTIVE.kind !== "real") return null;
  const real = CASE.result;
  const realMine = real.find((x) => x.candidate === ME.id)!;

  // Your simulated result by borough, next to the certified one.
  const boros = [1, 2, 3, 4, 5].map((b) => {
    const rows = r.byDistrict.filter((d) => Math.floor(d.cd / 100) === b);
    const tot = rows.reduce((a, d) => a + Object.values(d.shares).reduce((x, y) => x + y, 0), 0);
    const mine = rows.reduce((a, d) => a + (d.shares[ME.id] ?? 0), 0);
    const top = Object.keys(rows[0]?.shares ?? {}).sort((a, c) => rows.reduce((s, d) => s + (d.shares[c] ?? 0), 0) - rows.reduce((s, d) => s + (d.shares[a] ?? 0), 0))[0];
    const rb = RESULT_2013.byBorough[b as 1];
    const rtop = Object.entries(rb).filter(([k]) => k !== "total").sort((a, c) => c[1] - a[1])[0][0];
    return { b, yours: pct(mine, tot), yourTop: top, real: pct(rb[ME.id], rb.total), realTop: rtop };
  });
  const planks = realPlanksAt(ME.id, 30, Object.fromEntries(MOMENTS.map((m) => [m.id, { status: "decided" }])));

  return (
    <div className="flex max-h-[88vh] flex-col">
      <header className="shrink-0 border-b border-line px-8 pt-7 pb-5">
        <Label>Debrief · {ACTIVE.title}</Label>
        <h2 className="mt-2 font-serif text-[34px] leading-tight tracking-tight">Your race, and the real one</h2>
      </header>
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2"><Label>Your election night</Label><Tag kind="sim" /></div>
            <div className="mt-3 space-y-2">
              {r.ranked.map((id) => (
                <div key={id}>
                  <div className="flex justify-between text-[13px]"><span className={cn(id === ME.id && "font-medium text-gold-bright")}>{fullNameOf(id)}</span><span className="tnum font-mono text-soft">{r.pct[id]}%</span></div>
                  <Meter value={r.pct[id] * 2} color={colorOf(id)} className="mt-1" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12.5px] text-muted">
              {r.runoff ? `Nobody reached ${ACTIVE.threshold}%: ${nameOf(r.runoff.a)} and ${nameOf(r.runoff.b)} met in a simulated runoff, which ${nameOf(r.runoff.winner)} won with ${r.runoff.pct[r.runoff.winner]}%.` : `${nameOf(r.winner)} cleared ${ACTIVE.threshold}% with no runoff.`}
            </p>
          </section>
          <section>
            <div className="flex items-center gap-2"><Label>What really happened</Label><Tag kind="real" /></div>
            <div className="mt-3 space-y-2">
              {real.map((x) => (
                <div key={x.candidate}>
                  <div className="flex justify-between text-[13px]"><span className={cn(x.candidate === ME.id && "font-medium text-gold-bright")}>{fullNameOf(x.candidate)}</span><span className="tnum font-mono text-soft">{x.share.toFixed(2)}%</span></div>
                  <Meter value={x.share * 2} color={colorOf(x.candidate)} className="mt-1" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-faint">Certified result{CASE.resultSources.map((id) => <Cite key={id} c={CASE} id={id} />)} · {ME.short} {realMine.share.toFixed(2)}%</p>
            <div className="mt-3"><Claims c={CASE} items={CASE.aftermath} /></div>
          </section>
        </div>

        <section>
          <Label>Borough by borough</Label>
          <table className="tnum mt-3 w-full font-mono text-[12.5px]">
            <thead className="text-faint"><tr><th className="text-left font-sans font-normal">Borough</th><th className="text-right font-normal">{ME.short}, yours</th><th className="text-right font-normal">{ME.short}, real</th><th className="text-right font-sans font-normal">First, yours</th><th className="text-right font-sans font-normal">First, real</th></tr></thead>
            <tbody>
              {boros.map((x) => (
                <tr key={x.b} className="border-t border-line">
                  <td className="py-1.5 font-sans text-soft">{BOROS[x.b]}</td>
                  <td className="text-right">{x.yours}%</td>
                  <td className="text-right text-soft">{x.real}%</td>
                  <td className="text-right font-sans" style={{ color: colorOf(x.yourTop) }}>{nameOf(x.yourTop)}</td>
                  <td className="text-right font-sans" style={{ color: colorOf(x.realTop) }}>{nameOf(x.realTop)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[11.5px] text-faint">Real figures: the Board of Elections&apos; certified borough recaps (<a href={RESULT_2013.source} target="_blank" rel="noreferrer" className="underline">source</a>). Yours: the simulation.</p>
        </section>

        <section>
          <Label>The real moments: your call and theirs</Label>
          <div className="mt-3 space-y-3">
            {MOMENTS.map((d, i) => {
              const m = g.moments[d.id];
              const you = m?.option ? d.options.find((o) => o.id === m.option)?.label : null;
              const yours = !m ? "The race ended before this moment" : m.status === "decided" ? you : m.status === "own" ? "Handled it your own way, through the war room" : "Let it pass";
              const they = d.options.find((o) => o.id === d.taken);
              return (
                <div key={d.id} className="rounded-lg border border-line bg-raised p-4">
                  <div className="text-[14px] font-medium">{i + 1}. {d.title}</div>
                  <div className="mt-2 grid gap-1 text-[13px] text-muted">
                    <div>You: <span className="text-soft">{yours}</span>{m?.why && <span> · &ldquo;{m.why}&rdquo;</span>}</div>
                    <div>The real campaign: <span className="text-soft">{they?.label ?? "Something not on the list"}</span>{m?.option && m.option === d.taken && <span className="text-pos"> · the same call</span>}</div>
                  </div>
                  <div className="mt-3 space-y-3 border-t border-line pt-3">
                    <div><Label>What they did</Label><div className="mt-1.5"><Claims c={CASE} items={d.did} /></div></div>
                    <div><Label>What followed</Label><div className="mt-1.5"><Claims c={CASE} items={d.followed} /></div></div>
                    {!!d.saidAfter.length && <div><Label>What was said afterwards</Label><div className="mt-1.5"><Claims c={CASE} items={d.saidAfter} /></div></div>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-muted">Making the same call as the real campaign is not the same as being right. Several accounts of this race give luck and rivals&rsquo; mistakes a share of the credit.</p>
        </section>

        <section className="grid grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2"><Label>Your platform</Label><Tag kind="sim" /></div>
            <ol className="mt-3 space-y-2 text-[13px] text-soft">{g.manifesto.map((p, i) => <li key={p}><span className="tnum mr-2 font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>{p}</li>)}</ol>
          </div>
          <div>
            <div className="flex items-center gap-2"><Label>What {ME.short} really ran on</Label><Tag kind="real" /></div>
            <ol className="mt-3 space-y-2 text-[13px] text-soft">{planks.map((p, i) => <li key={p.text}><span className="tnum mr-2 font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>{p.text}{p.sources.slice(0, 1).map((s) => <Cite key={s} c={CASE} id={s} />)}</li>)}</ol>
          </div>
        </section>

        <section>
          <Label>Sources</Label>
          <ol className="mt-2 space-y-1 text-[12px] text-muted">
            {CASE.sources.map((s, i) => (
              <li key={s.id}>[{i + 1}] <a href={s.url} target="_blank" rel="noreferrer" className="text-soft hover:text-gold-bright hover:underline">{s.title} <ExternalLink className="inline size-3" /></a> · {s.publisher}{s.date ? ` · ${s.date}` : ""}</li>
            ))}
          </ol>
        </section>
      </div>
      <footer className="shrink-0 border-t border-line px-8 py-4">
        <Button onClick={() => window.location.reload()}><RotateCcw className="size-3.5" />Play the race again</Button>
      </footer>
    </div>
  );
}
