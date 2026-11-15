"use client";

import dynamic from "next/dynamic";
import { DoorOpen, HandCoins, Megaphone, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dock, DockButton, Inspector, Label, Meter, Section, Tag, ViewHeader } from "@/components/ui";
import { mapValue, useCaseNow } from "@/lib/cases/store";
import { DISTRICTS, FETCHED, districtBy } from "@/lib/geo";
import { APPEARANCES, DAILY, appear, appearancesToday, preview, sendStaff } from "@/lib/staff/run";
import { sentimentOf, useGame } from "@/lib/store";
import { cn, heat, tone } from "@/lib/util";
import type { RealRow, Tip } from "./map/MapCanvas";

// ponytail: the one case with a baked result layer (mayor2013-ad.json); make this a field on the case when a second has one.
const REAL_RESULT: Record<string, string> = { "nyc-2013-dem-mayor": "Real result 2013" };
const RIVALS = ["deblasio", "thompson", "quinn", "liu", "weiner"] as const satisfies readonly (keyof RealRow)[];

const ICONS: Record<string, ReactNode> = { canvass: <DoorOpen />, rally: <Megaphone />, house_party: <HandCoins /> };

// The map itself touches the browser (WebGL), so it only renders on the client.
const MapCanvas = dynamic(() => import("./map/MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-[12px] text-faint">Loading the city…</div>,
});

export function MapView() {
  const world = useGame();
  const select = useGame((s) => s.select);
  const [tip, setTip] = useState<Tip | null>(null);
  // The real result is only offered once the student has finished the case, so it can't spoil a decision.
  const { c: theCase, step } = useCaseNow();
  const realLabel = step > theCase.decisions.length ? REAL_RESULT[theCase.id] : undefined;
  const [wantReal, setReal] = useState(false);
  const real = wantReal && !!realLabel;
  const sel = districtBy(world.district);
  const hovered = districtBy(tip?.cd ?? null);
  // The candidate in person: a few appearances a day in the selected district (lib/staff/run). Simulated.
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const left = DAILY - appearancesToday();
  const act = (id: (typeof APPEARANCES)[number]["id"]) => { if (sel) setNotice(appear(sel.cd, id)); };

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader
          title="New York City"
          sub={real ? "The certified result in the 65 Assembly Districts. Colour shows de Blasio's share of the vote in each one." : "59 community districts on the real street map. Colour shows where your campaign is stronger or weaker than its citywide standing."}
          right={
            <div className="flex shrink-0 items-center gap-5">
              <div className="hidden items-center gap-2 text-[11px] text-muted @[700px]:flex">
                {real ? "25%" : "Below your average"}
                <i className="h-1 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(20)}, ${heat(47)}, ${heat(75)})` }} />
                {real ? "55%" : "Above"}
              </div>
              {realLabel && (
                <div className="flex h-8 overflow-hidden rounded-md border border-line-strong text-[12.5px]">
                  {([[false, "Your campaign"], [true, realLabel]] as const).map(([v, label]) => (
                    <button key={label} aria-pressed={real === v} onClick={() => { setReal(v); if (v) select({ district: null }); }} className={cn("px-3 whitespace-nowrap transition-colors", real === v ? "bg-hover text-gold-bright" : "bg-raised text-muted hover:text-fg")}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        />
        <div className="relative min-h-0 flex-1 overflow-hidden border-t border-line">
          <MapCanvas real={real} onHover={setTip} onSelect={(cd) => select({ district: cd && districtBy(cd)?.park ? null : cd })} />
          {real && (
            <div className="pointer-events-none absolute top-3 left-3 flex max-w-[440px] items-start gap-2 rounded-md border border-line bg-raised/85 px-2.5 py-1.5 text-[11.5px] text-soft backdrop-blur">
              <Tag kind="real" />
              <span>Board of Elections certified returns, primary of 10 September 2013. Votes are counted by Assembly District, so the boundaries differ from your campaign map.</span>
            </div>
          )}
        </div>
        {tip && hovered && !hovered.park && (
          <div className="pointer-events-none fixed z-50 rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-[12px] shadow-xl" style={{ left: tip.x + 14, top: tip.y + 14 }}>
            {hovered.name}
            <span className="tnum ml-2 font-mono text-muted">{Math.round(sentimentOf(world, hovered.cd))}%</span>
          </div>
        )}
        {tip?.real && (
          <div className="pointer-events-none fixed z-50 min-w-44 rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-[12px] shadow-xl" style={{ left: tip.x + 14, top: tip.y + 14 }}>
            <div className="mb-1 flex justify-between gap-4">Assembly District {tip.real.ad}<span className="tnum font-mono text-muted">{tip.real.total.toLocaleString("en-US")} votes</span></div>
            {[...RIVALS].sort((a, b) => tip.real![b] - tip.real![a]).map((id) => (
              <div key={id} className="flex justify-between gap-4 text-soft">
                {theCase.candidates.find((x) => x.id === id)?.name ?? id}
                <span className="tnum font-mono text-muted">{((tip.real![id] / tip.real!.total) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {!real && (
          <Dock label={sel && !sel.park ? `${sel.name} · ${left} of ${DAILY} appearances left today` : "Select a district to act there"}>
            {sel && !sel.park && (
              <>
                {APPEARANCES.map((a, i) => {
                  const e = preview(sel.cd, a.id);
                  return <DockButton key={a.id} primary={i === 0} icon={ICONS[a.id]} label={a.label} sub={`$${e.cost.toLocaleString("en-US")} · ${a.note}`} disabled={left <= 0} onClick={() => act(a.id)} />;
                })}
                <DockButton icon={<UserRound />} label="Send staff" sub="order to the Field Director" onClick={() => sendStaff(sel.cd)} />
              </>
            )}
          </Dock>
        )}
        {notice && !real && (
          <div role="status" className={cn("pointer-events-none absolute bottom-24 left-1/2 z-30 max-w-[460px] -translate-x-1/2 rounded-lg border bg-raised px-3.5 py-2 text-[12.5px] shadow-xl", notice.ok ? "border-line-strong text-soft" : "border-neg/40 text-neg")}>
            {notice.text}
          </div>
        )}
      </section>

      <Inspector>{sel && !real ? <DistrictPanel cd={sel.cd} /> : <CityPanel real={real} />}</Inspector>
    </div>
  );
}

function CityPanel({ real }: { real: boolean }) {
  const world = useGame();
  const select = useGame((s) => s.select);
  const ranked = DISTRICTS.filter((d) => !d.park).map((d) => ({ d, v: sentimentOf(world, d.cd) })).sort((a, b) => b.v - a.v);
  const list = (rows: typeof ranked) =>
    rows.map(({ d, v }) => (
      <button key={d.cd} onClick={() => select({ district: d.cd })} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
        <i className="size-2 shrink-0 rounded-sm" style={{ background: heat(mapValue(v)) }} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-soft">{d.name}</span>
        <span className="tnum font-mono text-[12px] text-muted">{Math.round(v)}%</span>
      </button>
    ));
  return (
    <>
      <Section title="Reading the map">
        {real ? (
          <p className="text-[12.5px] leading-relaxed text-muted">Hover a district to see how each candidate really did there. Switch back to Your campaign to compare it with where your own decisions left you.</p>
        ) : (
          <p className="text-[12.5px] leading-relaxed text-muted">Click a district to fly in and see who lives there and how strong your campaign is. The colours move when your decisions move a voter group that lives there. Drag with right-click to tilt.</p>
        )}
        <div className="mt-3 space-y-2 text-[12px] text-soft">
          <div className="flex items-start gap-2"><Tag kind="real" /><span>Streets, boundaries, census demographics, and the certified 2013 result once you finish the case.</span></div>
          <div className="flex items-start gap-2"><Tag kind="sim" /><span>Your support in each district: your standing with each voter group, placed by who lives there.</span></div>
        </div>
      </Section>
      {!real && (
        <>
          <Section title="Your strongest districts">{list(ranked.slice(0, 5))}</Section>
          <Section title="Your weakest districts">{list(ranked.slice(-5).reverse())}</Section>
        </>
      )}
    </>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function DistrictPanel({ cd }: { cd: number }) {
  const world = useGame();
  const { c, w } = useCaseNow();
  const d = districtBy(cd)!;
  const v = Math.round(sentimentOf(world, cd));
  const max = d.issues[0]?.[1] ?? 1;
  const demo = d.demo;
  const race = demo ? ([["Hispanic", demo.race.hispanic, "#f0a23b"], ["Black", demo.race.black, "#b4b4bd"], ["White", demo.race.white, "#5b8def"], ["Asian", demo.race.asian, "#5fd08a"]] as const) : [];
  const groups = demo ? c.groups.filter((g) => g.census).map((g) => ({ ...g, share: demo.race[g.census!], support: w.groups[g.id] ?? 0 })).sort((a, b) => b.share - a.share) : [];

  return (
    <>
      <div className="border-b border-line px-5 py-5">
        <Label>{d.boro} · Community District {d.num}</Label>
        <h2 className="mt-1.5 text-[17px] leading-snug font-medium tracking-tight">{d.name}</h2>
      </div>
      {d.park ? (
        <Section title="No voters"><p className="text-[12.5px] text-muted">Park or airport land. Nobody votes from here.</p></Section>
      ) : (
        <Section title="Your support here" right={<Tag kind="sim" />}>
          <div className="flex items-baseline gap-2">
            <span className="tnum font-mono text-[30px] leading-none font-medium tracking-tight" style={{ color: tone(v * 2) }}>{v}%</span>
            <span className="text-[12px] text-muted">of all voters</span>
          </div>
          <Meter value={v * 2} color={tone(v * 2)} className="mt-3" />
        </Section>
      )}
      {!!groups.length && (
        <Section title="Why: the voter groups here">
          <div className="space-y-2.5">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="text-soft">{g.name}</span>
                  <span className="tnum font-mono text-[11.5px] text-muted">{Math.round(g.share)}% of residents · you have {Math.round(g.support)}%</span>
                </div>
                <Meter value={g.share} color="rgb(255 255 255 / .5)" className="mt-1" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-faint">Your support here is each group&rsquo;s support, weighted by how many of them live here.</p>
        </Section>
      )}
      {demo && (
        <Section title="Who lives here" right={<Tag kind="real" />}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
            {([["Population", demo.pop.toLocaleString("en-US")], ["Median income", demo.income >= 200000 ? "$200,000+" : money(demo.income)], ["Renters", `${demo.renters}%`], ["Median age", String(demo.age)], ["Other language", `${demo.otherLang}%`], ["Aged 65+", `${demo.over65}%`]] as const).map(([k, val]) => (
              <div key={k}><dt className="text-[11px] text-muted">{k}</dt><dd className="tnum font-mono text-soft">{val}</dd></div>
            ))}
          </dl>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            {race.map(([k, val, col]) => <i key={k} style={{ width: `${val}%`, background: col }} title={`${k} ${val}%`} />)}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-muted">
            {race.map(([k, val, col]) => <span key={k} className="flex items-center gap-1"><i className="size-1.5 rounded-full" style={{ background: col }} />{k} {val}%</span>)}
          </div>
          <p className="mt-2 text-[11px] text-faint">Census ACS 5-year estimates via NYC Planning. Current figures, not 2013.</p>
        </Section>
      )}
      <Section title="What residents report today" right={<Tag kind="real" />}>
        {d.issues.length ? (
          <div className="space-y-2.5">
            {d.issues.map(([n, count]) => (
              <div key={n}>
                <div className="flex justify-between gap-3 text-[13px]"><span className="truncate text-soft capitalize">{n.toLowerCase()}</span><span className="tnum font-mono text-[12px] text-muted">{count.toLocaleString("en-US")}</span></div>
                <Meter value={(count / max) * 100} color="rgb(255 255 255 / .5)" className="mt-1.5" />
              </div>
            ))}
            <p className="pt-1 text-[11.5px] text-faint">311 service requests in the 30 days to {FETCHED}. Not from the period of the case.</p>
          </div>
        ) : <p className="text-[12.5px] text-faint">No reports.</p>}
      </Section>
    </>
  );
}
