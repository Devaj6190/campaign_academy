"use client";

import dynamic from "next/dynamic";
import { DoorOpen, HandCoins, Megaphone, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Dock, DockButton, Inspector, Label, Meter, Section, Tag, ViewHeader } from "@/components/ui";
import { night, tally, useNight } from "@/lib/cases/night";
import { FACTIONS_2013 } from "@/lib/cases/mayor2013-factions";
import { censusShare, cityShare, decisionFilter, decisionOf, lastDecided, longDate, mapValue, movedBy, supportIn, useCaseNow } from "@/lib/cases/store";
import { DISTRICTS, FETCHED, districtBy } from "@/lib/geo";
import { APPEARANCES, DAILY, appear, appearancesToday, preview, sendStaff } from "@/lib/staff/run";
import { useGame } from "@/lib/store";
import { cn, heat, tone } from "@/lib/util";
import { Changes } from "./CaseView";
import type { Layer, RealRow, Tip } from "./map/MapCanvas";

// ponytail: the one case with a baked result layer (mayor2013-ad.json); make this a field on the case when a second has one.
const REAL_RESULT: Record<string, string> = { "nyc-2013-dem-mayor": "Real result 2013" };
const RIVALS = ["deblasio", "thompson", "quinn", "liu", "weiner"] as const satisfies readonly (keyof RealRow)[];

/** A change in points, signed: "+1.4" or "−0.6". */
const pts = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;

const ICONS: Record<string, ReactNode> = { canvass: <DoorOpen />, rally: <Megaphone />, house_party: <HandCoins /> };

// The map itself touches the browser (WebGL), so it only renders on the client.
const MapCanvas = dynamic(() => import("./map/MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-[12px] text-faint">Loading the city…</div>,
});

export function MapView() {
  const district = useGame((s) => s.district);
  const filter = useGame((s) => s.filter);
  const select = useGame((s) => s.select);
  const [tip, setTip] = useState<Tip | null>(null);
  // The real result is only offered once the student has finished the case, so it can't spoil a decision.
  const { c: theCase, step } = useCaseNow();
  const over = step > theCase.decisions.length;
  const realLabel = over ? REAL_RESULT[theCase.id] : undefined;
  // Once the campaign is over the map opens on the student's election night; they can switch layers from there.
  const [choice, setChoice] = useState<Layer | null>(null);
  const layer: Layer = realLabel ? (choice ?? "night") : "campaign";
  const real = layer === "real", isNight = layer === "night";
  const n = useMemo(() => (over ? night() : null), [over]);
  const shown = useNight((s) => s.shown);
  const counting = !!n && isNight && shown < n.rows.length;
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => useNight.setState((x) => ({ shown: x.shown + 1 })), 350);
    return () => clearInterval(t);
  }, [counting]);
  const sel = districtBy(district);
  // The voter group filter: the case's groups that the census can place on the map.
  const placed = theCase.groups.filter((g) => g.census);
  const group = layer === "campaign" ? placed.find((g) => g.id === filter) : undefined;
  // What one decision moved, district by district. Opened from a decision's "See it on the map" or the control above the map.
  const dec = layer === "campaign" ? decisionOf(filter) : null;
  const moved = dec ? movedBy(dec.change) : null;
  const last = lastDecided();
  const options: [string, string][] = [["all", "Your support"], ...(last ? [[decisionFilter(last.id), "Last decision"] as [string, string]] : []), ...placed.map((g) => [g.id, g.name] as [string, string])];
  const current = dec ? decisionFilter(dec.d.id) : (group?.id ?? "all");
  const hovered = districtBy(tip?.cd ?? null);
  // The candidate in person: a few appearances a day in the selected district (lib/staff/run). Simulated.
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const left = DAILY - appearancesToday();
  const act = (id: (typeof APPEARANCES)[number]["id"]) => { if (sel) setNotice(appear(sel.cd, id)); };

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader
          title={isNight ? "Election night" : "New York City"}
          sub={isNight ? "Your result in the 65 Assembly Districts: each one's certified 2013 result, moved by your citywide finish. Colour shows your share." : real ? "The certified result in the 65 Assembly Districts. Colour shows de Blasio's share of the vote in each one." : dec ? `What your decision "${dec.d.title}" moved. Colour and arrows show where you gained and lost ground because of it, in points.` : group ? `Where ${group.name} live. Colour shows each district's share of residents in this group, against the group's share of the whole city (census).` : "59 community districts on the real street map. Colour shows where your campaign is stronger or weaker than its citywide standing."}
          right={
            <div className="flex shrink-0 items-center gap-5">
              <div className="hidden items-center gap-2 text-[11px] text-muted @[700px]:flex">
                {real || isNight ? "25%" : dec ? "Lost ground" : group ? "Fewer live here" : "Below your average"}
                <i className="h-1 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(20)}, ${heat(47)}, ${heat(75)})` }} />
                {real || isNight ? "55%" : dec ? "Gained" : group ? "More" : "Above"}
              </div>
              {layer === "campaign" && (
                <div role="group" aria-label="Colour the map by" className="flex h-8 overflow-hidden rounded-md border border-line-strong text-[12.5px]">
                  {options.map(([id, label]) => (
                    <button key={id} aria-pressed={current === id} onClick={() => select({ filter: id, district: null })} className={cn("px-3 whitespace-nowrap transition-colors", current === id ? "bg-hover text-gold-bright" : "bg-raised text-muted hover:text-fg")}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {realLabel && (
                <div className="flex h-8 overflow-hidden rounded-md border border-line-strong text-[12.5px]">
                  {([["campaign", "Your campaign"], ["night", "Your election night"], ["real", realLabel]] as const).map(([v, label]) => (
                    <button key={label} aria-pressed={layer === v} onClick={() => { setChoice(v); if (v !== "campaign") select({ district: null }); }} className={cn("px-3 whitespace-nowrap transition-colors", layer === v ? "bg-hover text-gold-bright" : "bg-raised text-muted hover:text-fg")}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        />
        <div className="relative min-h-0 flex-1 overflow-hidden border-t border-line">
          <MapCanvas layer={layer} night={n ? { ...n, shown } : undefined} onHover={setTip} onSelect={(cd) => select({ district: cd && districtBy(cd)?.park ? null : cd })} />
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
            <span className="tnum ml-2 font-mono text-muted">{moved ? `${pts(moved[hovered.cd] ?? 0)} points` : group ? `${Math.round(censusShare(hovered.cd, group.census!))}% of residents` : `${Math.round(supportIn(hovered.cd) ?? 0)}%`}</span>
          </div>
        )}
        {tip?.real && (() => {
          // On election night the hover shows the student's simulated result there, once that district has reported.
          const row = tip.night ? n?.rows.find((r) => r.ad === tip.real!.ad) : undefined;
          const votes: Record<string, number> | null = !tip.night ? (tip.real as unknown as Record<string, number>) : row && n!.order.indexOf(row.ad) < shown ? row.votes : null;
          return (
            <div className="pointer-events-none fixed z-50 min-w-44 rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-[12px] shadow-xl" style={{ left: tip.x + 14, top: tip.y + 14 }}>
              <div className="mb-1 flex justify-between gap-4">Assembly District {tip.real.ad}<span className="tnum font-mono text-muted">{tip.real.total.toLocaleString("en-US")} votes</span></div>
              {!votes && <div className="text-muted">Not reported yet</div>}
              {votes && [...RIVALS].sort((a, b) => votes[b] - votes[a]).map((id) => (
                <div key={id} className="flex justify-between gap-4 text-soft">
                  {theCase.candidates.find((x) => x.id === id)?.name ?? id}
                  <span className="tnum font-mono text-muted">{((votes[id] / tip.real!.total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          );
        })()}
        {layer === "campaign" && !over && (
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
        {notice && layer === "campaign" && !over && (
          <div role="status" className={cn("pointer-events-none absolute bottom-24 left-1/2 z-30 max-w-[460px] -translate-x-1/2 rounded-lg border bg-raised px-3.5 py-2 text-[12.5px] shadow-xl", notice.ok ? "border-line-strong text-soft" : "border-neg/40 text-neg")}>
            {notice.text}
          </div>
        )}
      </section>

      <Inspector>{isNight && n ? <NightPanel n={n} shown={shown} /> : sel && layer === "campaign" ? <DistrictPanel cd={sel.cd} moved={moved && dec ? { v: moved[sel.cd] ?? 0, title: dec.d.title } : undefined} /> : dec && moved ? <DecisionPanel dec={dec} moved={moved} /> : group ? <GroupPanel id={group.id} /> : <CityPanel real={real} />}</Inspector>
    </div>
  );
}

/** The count as it comes in, and the result once every district has reported. */
function NightPanel({ n, shown }: { n: ReturnType<typeof night>; shown: number }) {
  const { c } = useCaseNow();
  const go = useGame((s) => s.go);
  const all = n.rows.length, done = shown >= all;
  const t = tally(n, shown);
  const rows = n.ids.map((id) => ({ id, name: id === c.follow ? "You" : (c.candidates.find((x) => x.id === id)?.name ?? id), votes: t.votes[id], v: t.total ? (t.votes[id] / t.total) * 100 : 0 })).sort((a, b) => b.v - a.v);
  const place = rows.findIndex((r) => r.id === c.follow) + 1, mine = rows[place - 1]?.v ?? 0;
  const verdict = place === 1 && mine >= c.threshold ? `You finish first with ${mine.toFixed(1)} percent, above the ${c.threshold} needed. No runoff.` : place <= 2 ? `You finish ${place === 1 ? "first" : "second"} with ${mine.toFixed(1)} percent, short of ${c.threshold}. You go to a runoff.` : `You finish outside the top two with ${mine.toFixed(1)} percent and miss the runoff.`;
  return (
    <>
      <div className="border-b border-line px-5 py-5">
        <Label>Primary day · {longDate(c.electionDate)}</Label>
        <h2 className="mt-1.5 text-[17px] leading-snug font-medium tracking-tight">{done ? "Every district has reported" : `${shown} of ${all} districts reporting`}</h2>
      </div>
      <Section title="The count" right={<Tag kind="sim" />}>
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.id}>
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className={r.id === c.follow ? "text-gold-bright" : "text-soft"}>{r.name}</span>
                <span className="tnum font-mono text-[11.5px] text-muted">{r.votes.toLocaleString("en-US")} · {r.v.toFixed(1)}%</span>
              </div>
              <Meter value={r.v * 2} color={r.id === c.follow ? "var(--color-warm)" : "rgb(255 255 255 / .5)"} className="mt-1" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-faint">{t.total.toLocaleString("en-US")} ballots counted. Percentages are of all ballots, including candidates not listed.</p>
      </Section>
      <Section title={done ? "The result" : "How to read this"}>
        {done ? <p className="text-[13.5px] leading-relaxed text-fg">{verdict}</p> : <p className="text-[12.5px] leading-relaxed text-muted">Where each candidate is strong comes from the certified 2013 result. How far each district moves from it comes from your campaign. No reporting order was published, so districts arrive in a fixed shuffle.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {!done && <Button onClick={() => useNight.setState({ shown: all })}>Skip to the full result</Button>}
          {done && <Button variant="primary" onClick={() => go("case")}>Read the debrief</Button>}
        </div>
      </Section>
    </>
  );
}

/** One voter group on the map: how large it is, where you stand with it, and where it lives. */
function GroupPanel({ id }: { id: string }) {
  const { c, w } = useCaseNow();
  const select = useGame((s) => s.select);
  const g = c.groups.find((x) => x.id === id)!;
  const poll = FACTIONS_2013.find((f) => f.tracks === id);
  const city = cityShare(g.census!);
  const top = DISTRICTS.filter((d) => !d.park && d.demo).map((d) => ({ d, v: censusShare(d.cd, g.census!) })).sort((a, b) => b.v - a.v).slice(0, 8);
  return (
    <>
      <div className="border-b border-line px-5 py-5">
        <Label>Voter group</Label>
        <h2 className="mt-1.5 text-[17px] leading-snug font-medium tracking-tight">{g.name}</h2>
      </div>
      <Section title="Your support with them" right={<Tag kind="sim" />}>
        <div className="flex items-baseline gap-2">
          <span className="tnum font-mono text-[30px] leading-none font-medium tracking-tight text-gold-bright">{Math.round(w.groups[id] ?? 0)}%</span>
          <span className="text-[12px] text-muted">against {Math.round(w.poll[c.follow] ?? 0)}% citywide</span>
        </div>
      </Section>
      <Section title="How many there are" right={<Tag kind="real" />}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
          {poll && <div><dt className="text-[11px] text-muted">Of likely primary voters</dt><dd className="tnum font-mono text-soft">{poll.share}%</dd></div>}
          <div><dt className="text-[11px] text-muted">Of city residents</dt><dd className="tnum font-mono text-soft">{Math.round(city)}%</dd></div>
        </dl>
        <p className="mt-2 text-[11px] text-faint">Likely voters: Marist poll, September 2013. Residents: census estimates via NYC Planning, current figures, not 2013.</p>
      </Section>
      <Section title="Where they live" right={<Tag kind="real" />}>
        {top.map(({ d, v }) => (
          <button key={d.cd} onClick={() => select({ district: d.cd })} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
            <span className="min-w-0 flex-1 truncate text-[13px] text-soft">{d.name}</span>
            <span className="tnum font-mono text-[12px] text-muted">{Math.round(v)}%</span>
          </button>
        ))}
        <p className="mt-2 text-[11px] text-faint">Share of each district&rsquo;s residents in this group. Click a district to see your support there.</p>
      </Section>
    </>
  );
}

/** One decision on the map: what the student chose, what it changed, and the districts it moved most. */
function DecisionPanel({ dec, moved }: { dec: NonNullable<ReturnType<typeof decisionOf>>; moved: Record<number, number> }) {
  const { c } = useCaseNow();
  const select = useGame((s) => s.select);
  const rows = DISTRICTS.filter((d) => !d.park && d.demo).map((d) => ({ d, v: moved[d.cd] ?? 0 })).sort((a, b) => b.v - a.v);
  const still = rows.every((r) => Math.abs(r.v) < 0.05);
  const list = (xs: typeof rows) =>
    xs.map(({ d, v }) => (
      <button key={d.cd} onClick={() => select({ district: d.cd })} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
        <span className="min-w-0 flex-1 truncate text-[13px] text-soft">{d.name}</span>
        <span className={cn("tnum font-mono text-[12px]", v >= 0 ? "text-pos" : "text-neg")}>{pts(v)}</span>
      </button>
    ));
  const lost = rows.filter((r) => r.v <= -0.05).slice(-5).reverse();
  return (
    <>
      <div className="border-b border-line px-5 py-5">
        <Label>Decision · {longDate(dec.d.date)}</Label>
        <h2 className="mt-1.5 text-[17px] leading-snug font-medium tracking-tight">{dec.d.title}</h2>
        <p className="mt-1 text-[12.5px] text-muted">You chose: <span className="text-soft">{dec.label}</span></p>
      </div>
      <Section title="What it changed" right={<Tag kind="sim" />}><Changes c={c} s={dec.change} /></Section>
      {still ? (
        <Section title="On the map"><p className="text-[12.5px] leading-relaxed text-muted">No district moved: this decision did not shift a voter group or your citywide standing.</p></Section>
      ) : (
        <>
          <Section title="Gained most">{list(rows.filter((r) => r.v >= 0.05).slice(0, 5))}</Section>
          {!!lost.length && <Section title="Lost most">{list(lost)}</Section>}
          <p className="px-5 pb-4 text-[11px] text-faint">Points of support. A district moves when the decision moves a voter group that lives there. Where the decision left your citywide figure unchanged, ground gained in some districts shows as ground lost in others.</p>
        </>
      )}
    </>
  );
}

function CityPanel({ real }: { real: boolean }) {
  useCaseNow(); // re-rank when the case moves
  const select = useGame((s) => s.select);
  const ranked = DISTRICTS.filter((d) => !d.park).map((d) => ({ d, v: supportIn(d.cd) ?? 0 })).sort((a, b) => b.v - a.v);
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

function DistrictPanel({ cd, moved }: { cd: number; moved?: { v: number; title: string } }) {
  const { c, w } = useCaseNow();
  const d = districtBy(cd)!;
  const v = Math.round(supportIn(cd) ?? 0);
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
          {moved && <p className="mt-3 text-[12.5px] text-muted">Your decision &ldquo;{moved.title}&rdquo; moved it <span className={cn("tnum font-mono", moved.v >= 0 ? "text-pos" : "text-neg")}>{pts(moved.v)}</span> points.</p>}
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
