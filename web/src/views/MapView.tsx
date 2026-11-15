"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { DoorOpen, HandCoins, Megaphone, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Dock, DockButton, Inspector, Label, Meter, Section, Tag, ViewHeader } from "@/components/ui";
import { night, tally, useNight } from "@/lib/cases/night";
import { FACTIONS_2013, factionFilter, factionNow, factionOf, whereFaction, type Faction } from "@/lib/cases/mayor2013-factions";
import { cityShare, decisionFilter, decisionOf, factionWork, lastDecided, longDate, mapValue, movedBy, supportIn, useCaseNow } from "@/lib/cases/store";
import { DISTRICTS, FETCHED, districtBy, type District } from "@/lib/geo";
import { APPEARANCES, DAILY, appear, appearancesToday, preview, sendStaff } from "@/lib/staff/run";
import { useGame } from "@/lib/store";
import { cn, heat, tone } from "@/lib/util";
import { Changes } from "./CaseView";
import type { Layer, RealRow, Tip } from "./map/MapCanvas";

// ponytail: the one case with a baked result layer (mayor2013-ad.json); make this a field on the case when a second has one.
const REAL_RESULT: Record<string, string> = { "nyc-2013-dem-mayor": "Real result 2013" };
const RIVALS = ["deblasio", "thompson", "quinn", "liu", "weiner"] as const satisfies readonly (keyof RealRow)[];
const KINDS = [...new Set(FACTIONS_2013.map((f) => f.kind))];

/** A change in points, signed: "+1.4" or "−0.6". */
const pts = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;

const ICONS: Record<string, ReactNode> = { canvass: <DoorOpen />, rally: <Megaphone />, house_party: <HandCoins /> };

// The map itself touches the browser (WebGL), so it only renders on the client.
const MapCanvas = dynamic(() => import("./map/MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-[13px] text-faint">Loading the city…</div>,
});

/** What the subtitle says under a faction filter. */
function factionSub(f: Faction): string {
  const where = whereFaction(f.id);
  if (!where) return `The map can't place ${f.name}: no district data says where they live. It shows your support.`;
  if (f.kind === "Borough") return `${f.name} lit, the rest dimmed. Colour still shows your support.`;
  if (where.rough) return `Brightest where the "${f.name}" faction is likely most common, judged by each district's median ${f.kind === "Age" ? "age" : "income"}.`;
  return `Brightest where most ${f.name} live. Colour still shows your support.`;
}

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
  // A faction filter keeps the support colours and brightens where that faction lives (map/MapCanvas).
  const faction = layer === "campaign" ? factionOf(filter) : null;
  // What one decision moved, district by district. Opened from a decision's "See it on the map" or the control above the map.
  const dec = layer === "campaign" ? decisionOf(filter) : null;
  const moved = dec ? movedBy(dec.change) : null;
  const last = lastDecided();
  const options: [string, string][] = [["all", "Your support"], ...(last ? [[decisionFilter(last.id), "Last decision"] as [string, string]] : [])];
  const current = dec ? decisionFilter(dec.d.id) : "all";
  const hovered = districtBy(tip?.cd ?? null);
  // The candidate in person: a few appearances a day in the selected district (lib/staff/run). Simulated.
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const left = DAILY - appearancesToday();
  const act = (id: (typeof APPEARANCES)[number]["id"]) => { if (sel) setNotice(appear(sel.cd, id)); };
  // The legend: full words on a wide screen, short ones when the header is tight.
  const [lo, hi, loShort] = real || isNight ? ["25%", "55%", "25%"] : dec ? ["Lost ground", "Gained", "Lost"] : ["Below your average", "Above", "Below"];
  const seg = (on: boolean) => cn("px-3.5 whitespace-nowrap transition-colors", on ? "bg-hover text-gold-bright" : "bg-raised text-muted hover:text-fg");

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader
          title={isNight ? "Election night" : "New York City"}
          sub={isNight ? "Each district's certified 2013 result, moved by your citywide finish. Colour shows your share." : real ? "The certified result by Assembly District. Colour shows de Blasio's share." : dec ? `Where "${dec.d.title}" won and lost you ground, in points.` : faction ? factionSub(faction) : "Colour shows where you're stronger or weaker than your citywide standing."}
          right={
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-2 text-[13px] text-muted">
                <span className="hidden @[1000px]:inline">{lo}</span>
                <span className="@[1000px]:hidden">{loShort}</span>
                <i className="h-1.5 w-16 rounded-full @[1000px]:w-24" style={{ background: `linear-gradient(90deg, ${heat(20)}, ${heat(47)}, ${heat(75)})` }} />
                {hi}
              </div>
              {layer === "campaign" && (
                <div className="flex items-center gap-2">
                  <div role="group" aria-label="Colour the map by" className="flex h-9 overflow-hidden rounded-md border border-line-strong text-[14px]">
                    {options.map(([id, label]) => (
                      <button key={id} aria-pressed={current === id} onClick={() => select({ filter: id, district: null })} className={seg(current === id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <select
                    aria-label="Brighten where one faction lives"
                    value={faction ? factionFilter(faction.id) : ""}
                    onChange={(e) => select({ filter: e.target.value || "all", district: null })}
                    className={cn("h-9 max-w-[220px] cursor-pointer rounded-md border bg-raised px-2.5 text-[14px] [color-scheme:dark] transition-colors outline-none hover:text-fg focus-visible:border-gold", faction ? "border-gold/60 text-gold-bright" : "border-line-strong text-muted")}
                  >
                    <option value="">All factions</option>
                    {KINDS.map((k) => (
                      <optgroup key={k} label={k}>
                        {FACTIONS_2013.filter((f) => f.kind === k).map((f) => <option key={f.id} value={factionFilter(f.id)}>{f.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
              {realLabel && (
                <div className="flex h-9 overflow-hidden rounded-md border border-line-strong text-[14px]">
                  {([["campaign", "Your campaign"], ["night", "Your election night"], ["real", realLabel]] as const).map(([v, label]) => (
                    <button key={label} aria-pressed={layer === v} onClick={() => { setChoice(v); if (v !== "campaign") select({ district: null }); }} className={seg(layer === v)}>
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
            <div className="pointer-events-none absolute top-3 left-3 flex max-w-[440px] items-start gap-2 rounded-md border border-line bg-raised/85 px-2.5 py-1.5 text-[13px] text-soft backdrop-blur">
              <Tag big kind="real" />
              <span>Certified returns, 10 September 2013. Counted by Assembly District, so the lines differ from your campaign map.</span>
            </div>
          )}
        </div>
        {tip && hovered && !hovered.park && (
          <div className="pointer-events-none fixed z-50 rounded-md border border-line-strong bg-raised px-3 py-1.5 text-[14px] shadow-xl" style={{ left: tip.x + 14, top: tip.y + 14 }}>
            {hovered.name}
            <span className="tnum ml-2 font-mono text-muted">{moved ? `${pts(moved[hovered.cd] ?? 0)} points` : `${Math.round(supportIn(hovered.cd) ?? 0)}%`}</span>
          </div>
        )}
        {tip?.real && (() => {
          // On election night the hover shows the student's simulated result there, once that district has reported.
          const row = tip.night ? n?.rows.find((r) => r.ad === tip.real!.ad) : undefined;
          const votes: Record<string, number> | null = !tip.night ? (tip.real as unknown as Record<string, number>) : row && n!.order.indexOf(row.ad) < shown ? row.votes : null;
          return (
            <div className="pointer-events-none fixed z-50 min-w-52 rounded-md border border-line-strong bg-raised px-3 py-2 text-[13px] shadow-xl" style={{ left: tip.x + 14, top: tip.y + 14 }}>
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
          <div role="status" className={cn("pointer-events-none absolute bottom-24 left-1/2 z-30 max-w-[460px] -translate-x-1/2 rounded-lg border bg-raised px-3.5 py-2 text-[13.5px] shadow-xl", notice.ok ? "border-line-strong text-soft" : "border-neg/40 text-neg")}>
            {notice.text}
          </div>
        )}
      </section>

      <Inspector>{isNight && n ? <NightPanel n={n} shown={shown} /> : sel && layer === "campaign" ? <DistrictPanel cd={sel.cd} moved={moved && dec ? { v: moved[sel.cd] ?? 0, title: dec.d.title } : undefined} /> : dec && moved ? <DecisionPanel dec={dec} moved={moved} /> : faction ? <FactionPanel f={faction} /> : <CityPanel real={real} />}</Inspector>
    </div>
  );
}

// The right panel's pieces. Names and numbers are big enough to scan; sources and fine print sit one click away.

const Head = ({ label, name, children }: { label: ReactNode; name: string; children?: ReactNode }) => (
  <div className="border-b border-line px-5 py-5">
    <Label className="text-[13px]">{label}</Label>
    <h2 className="mt-1.5 font-display text-[22px] leading-tight font-semibold">{name}</h2>
    {children}
  </div>
);

const Stat = ({ value, sub, color }: { value: string; sub: string; color?: string }) => (
  <div className="flex items-baseline gap-2.5">
    <span className={cn("tnum font-mono text-[36px] leading-none font-medium tracking-tight", !color && "text-gold-bright")} style={color ? { color } : undefined}>{value}</span>
    <span className="text-[14px] text-muted">{sub}</span>
  </div>
);

const Body = ({ children }: { children: ReactNode }) => <p className="text-[14px] leading-relaxed text-soft">{children}</p>;

/** Fine print, closed until asked for. */
const Note = ({ label = "Source", children }: { label?: string; children: ReactNode }) => (
  <details className="mt-3 text-[13px] leading-relaxed text-faint">
    <summary className="w-fit cursor-pointer list-none text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-gold-bright [&::-webkit-details-marker]:hidden">{label}</summary>
    <div className="mt-1.5">{children}</div>
  </details>
);

/** A list of districts, each one a click away from its own panel. */
function Districts({ rows }: { rows: { d: District; v: string; dot?: string; className?: string }[] }) {
  const select = useGame((s) => s.select);
  return (
    <div>
      {rows.map(({ d, v, dot, className }) => (
        <button key={d.cd} onClick={() => select({ district: d.cd })} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-hover">
          {dot && <i className="size-2.5 shrink-0 rounded-sm" style={{ background: dot }} />}
          <span className="min-w-0 flex-1 truncate text-[15px] text-soft">{d.name}</span>
          <span className={cn("tnum font-mono text-[14px]", className ?? "text-muted")}>{v}</span>
        </button>
      ))}
    </div>
  );
}

const placed = () => DISTRICTS.filter((d) => !d.park && d.demo);

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
      <Head label={`Primary day · ${longDate(c.electionDate)}`} name={done ? "Every district has reported" : `${shown} of ${all} districts reporting`} />
      <Section big title="The count" right={<Tag big kind="sim" />}>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("text-[15px]", r.id === c.follow ? "text-gold-bright" : "text-soft")}>{r.name}</span>
                <span className="tnum font-mono text-[14px] text-muted">{r.v.toFixed(1)}%</span>
              </div>
              <div className="relative mt-1">
                <Meter value={r.v * 2} color={r.id === c.follow ? "var(--color-warm)" : "rgb(255 255 255 / .5)"} />
                {/* The share that wins outright. */}
                <span className="pointer-events-none absolute -top-[3px] -bottom-[3px] w-px bg-gold/70" style={{ left: `${c.threshold * 2}%` }} aria-hidden />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-muted"><span className="mr-1.5 inline-block h-3 w-px translate-y-[2px] bg-gold/70" aria-hidden />{c.threshold}% wins outright. Below it, the top two go to a runoff.</p>
        <Note label="About the count">{t.total.toLocaleString("en-US")} ballots counted. Percentages are of all ballots, including candidates not listed. Each candidate&rsquo;s strongholds come from the certified 2013 result; how far each district moves comes from your campaign. No reporting order was published, so districts arrive in a fixed shuffle.</Note>
      </Section>
      <Section big title={done ? "The result" : "What happens next"}>
        {done ? (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="rounded-lg border border-gold/60 bg-gold/[0.06] px-4 py-3.5">
            <p className="font-display text-[13px] font-semibold tracking-[0.1em] text-gold uppercase">{place === 1 && mine >= c.threshold ? "Outright win" : place <= 2 ? `Runoff against ${rows[place === 1 ? 1 : 0]?.name}` : "Out of the race"}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-fg">{verdict}</p>
          </motion.div>
        ) : <Body>Districts report one by one. Hover one on the map to see how it voted.</Body>}
        <div className="mt-3 flex flex-wrap gap-2">
          {!done && <Button onClick={() => useNight.setState({ shown: all })}>Skip to the full result</Button>}
          {done && <Button variant="primary" onClick={() => go("case")}>Read the debrief</Button>}
        </div>
      </Section>
    </>
  );
}

/** One faction on the map: where you stand with it, how big it is, and where it lives. */
function FactionPanel({ f }: { f: Faction }) {
  const { c, w } = useCaseNow();
  const mine = w.poll[c.follow] ?? 0;
  const v = factionNow(f, w.groups, mine, c.start.poll[c.follow] ?? 0, factionWork());
  const census = c.groups.find((g) => g.id === f.tracks)?.census;
  const where = whereFaction(f.id);
  const top = where ? placed().map((d) => ({ d, at: where.at[d.cd] ?? 0, s: supportIn(d.cd) ?? 0 })).sort((a, b) => b.at - a.at || b.s - a.s).slice(0, 6) : [];
  return (
    <>
      <Head label={`Faction · ${f.kind}`} name={f.name} />
      <Section big title="Your support" right={<Tag big kind="sim" />}>
        <Stat value={`${Math.round(v)}%`} sub={`against ${Math.round(mine)}% citywide`} />
      </Section>
      <Section big title="How many" right={<Tag big kind="real" />}>
        <div className="flex gap-8">
          <div><div className="tnum font-mono text-[20px] text-soft">{f.share}%</div><div className="text-[13px] text-muted">of likely voters</div></div>
          {census && <div><div className="tnum font-mono text-[20px] text-soft">{Math.round(cityShare(census))}%</div><div className="text-[13px] text-muted">of residents</div></div>}
        </div>
        <Note>Likely voters: Marist poll, 3 to 6 September 2013.{census && " Residents: census estimates via NYC Planning, current figures, not 2013."}</Note>
      </Section>
      {where ? (
        <Section big title="Your support where they live">
          <Districts rows={top.map(({ d, s }) => ({ d, v: `${Math.round(s)}%`, dot: heat(mapValue(s)) }))} />
          {where.rough && <Note label="How they are placed">Estimated from each district&rsquo;s median {f.kind === "Age" ? "age" : "household income"} (census), not from a count of the faction itself.</Note>}
        </Section>
      ) : (
        <Section big title="On the map"><Body>No district data says where {f.name.toLowerCase()} live, so the map shows your overall support.</Body></Section>
      )}
    </>
  );
}

/** One decision on the map: what the student chose, what it changed, and the districts it moved most. */
function DecisionPanel({ dec, moved }: { dec: NonNullable<ReturnType<typeof decisionOf>>; moved: Record<number, number> }) {
  const { c } = useCaseNow();
  const rows = placed().map((d) => ({ d, v: moved[d.cd] ?? 0 })).sort((a, b) => b.v - a.v);
  const still = rows.every((r) => Math.abs(r.v) < 0.05);
  const list = (xs: typeof rows) => <Districts rows={xs.map(({ d, v }) => ({ d, v: pts(v), className: v >= 0 ? "text-pos" : "text-neg" }))} />;
  const lost = rows.filter((r) => r.v <= -0.05).slice(-5).reverse();
  return (
    <>
      <Head label={`Decision · ${longDate(dec.d.date)}`} name={dec.d.title}>
        <p className="mt-1.5 text-[14px] text-muted">You chose <span className="text-soft">{dec.label}</span></p>
      </Head>
      <Section big title="What it changed" right={<Tag big kind="sim" />}><Changes c={c} s={dec.change} /></Section>
      {still ? (
        <Section big title="On the map"><Body>No district moved. This decision did not shift a voter group or your citywide standing.</Body></Section>
      ) : (
        <>
          <Section big title="Gained most">{list(rows.filter((r) => r.v >= 0.05).slice(0, 5))}</Section>
          {!!lost.length && <Section big title="Lost most">{list(lost)}</Section>}
          <div className="px-5 pb-4"><Note label="How this works">Points of support. A district moves when the decision moves a voter group that lives there. Where the decision left your citywide figure unchanged, ground gained in some districts shows as ground lost in others.</Note></div>
        </>
      )}
    </>
  );
}

function CityPanel({ real }: { real: boolean }) {
  useCaseNow(); // re-rank when the case moves
  const ranked = DISTRICTS.filter((d) => !d.park).map((d) => ({ d, v: supportIn(d.cd) ?? 0 })).sort((a, b) => b.v - a.v);
  const list = (rows: typeof ranked) => <Districts rows={rows.map(({ d, v }) => ({ d, v: `${Math.round(v)}%`, dot: heat(mapValue(v)) }))} />;
  return (
    <>
      <Section big title="Reading the map">
        <Body>{real ? "Hover a district to see how each candidate really did there." : "Click a district to fly in. Colours move when your decisions move a voter group that lives there."}</Body>
        <Note label="What's real, what's simulated">
          <div className="space-y-2 text-soft">
            <div className="flex items-start gap-2"><Tag big kind="real" /><span>Streets, boundaries, census demographics, and the certified 2013 result once you finish the case.</span></div>
            <div className="flex items-start gap-2"><Tag big kind="sim" /><span>Your support in each district: your standing with each voter group, placed by who lives there.</span></div>
          </div>
          {!real && <p className="mt-2">Drag with right-click to tilt the map.</p>}
        </Note>
      </Section>
      {!real && (
        <>
          <Section big title="Strongest districts">{list(ranked.slice(0, 5))}</Section>
          <Section big title="Weakest districts">{list(ranked.slice(-5).reverse())}</Section>
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
  const issue = ([n, count]: [string, number]) => (
    <div key={n}>
      <div className="flex justify-between gap-3 text-[14px]"><span className="truncate text-soft capitalize">{n.toLowerCase()}</span><span className="tnum font-mono text-muted">{count.toLocaleString("en-US")}</span></div>
      <Meter value={(count / max) * 100} color="rgb(255 255 255 / .5)" className="mt-1.5" />
    </div>
  );

  return (
    <>
      <Head label={`${d.boro} · Community District ${d.num}`} name={d.name} />
      {d.park ? (
        <Section big title="No voters"><Body>Park or airport land. Nobody votes from here.</Body></Section>
      ) : (
        <Section big title="Your support here" right={<Tag big kind="sim" />}>
          <Stat value={`${v}%`} sub="of all voters" color={tone(v * 2)} />
          <Meter value={v * 2} color={tone(v * 2)} className="mt-3" />
          {moved && <p className="mt-3 text-[14px] text-muted">&ldquo;{moved.title}&rdquo; moved it <span className={cn("tnum font-mono", moved.v >= 0 ? "text-pos" : "text-neg")}>{pts(moved.v)}</span> points.</p>}
        </Section>
      )}
      {!!groups.length && (
        <Section big title="Why: who lives here">
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] text-soft">{g.name}</span>
                  <span className="tnum font-mono text-[14px] text-soft">you have {Math.round(g.support)}%</span>
                </div>
                <Meter value={g.share} color="rgb(255 255 255 / .5)" className="mt-1.5" />
                <div className="tnum mt-1 font-mono text-[13px] text-muted">{Math.round(g.share)}% of residents</div>
              </div>
            ))}
          </div>
          <Note label="How this works">Your support here is each group&rsquo;s support, weighted by how many of them live here.</Note>
        </Section>
      )}
      {demo && (
        <Section big title="The district" right={<Tag big kind="real" />}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {([["Population", demo.pop.toLocaleString("en-US")], ["Median income", demo.income >= 200000 ? "$200,000+" : money(demo.income)], ["Renters", `${demo.renters}%`], ["Median age", String(demo.age)], ["Other language", `${demo.otherLang}%`], ["Aged 65+", `${demo.over65}%`]] as const).map(([k, val]) => (
              <div key={k}><dt className="text-[13px] text-muted">{k}</dt><dd className="tnum font-mono text-[15px] text-soft">{val}</dd></div>
            ))}
          </dl>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
            {race.map(([k, val, col]) => <i key={k} style={{ width: `${val}%`, background: col }} title={`${k} ${val}%`} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted">
            {race.map(([k, val, col]) => <span key={k} className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: col }} />{k} {val}%</span>)}
          </div>
          <Note>Census ACS 5-year estimates via NYC Planning. Current figures, not 2013.</Note>
        </Section>
      )}
      <Section big title="What residents report" right={<Tag big kind="real" />}>
        {d.issues.length ? (
          <>
            <div className="space-y-3">{d.issues.slice(0, 3).map(issue)}</div>
            {d.issues.length > 3 && (
              <details className="group mt-3">
                <summary className="w-fit cursor-pointer list-none text-[13px] text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-gold-bright group-open:hidden [&::-webkit-details-marker]:hidden">{d.issues.length - 3} more</summary>
                <div className="space-y-3">{d.issues.slice(3).map(issue)}</div>
              </details>
            )}
            <Note>311 service requests in the 30 days to {FETCHED}. Not from the period of the case.</Note>
          </>
        ) : <Body>No reports.</Body>}
      </Section>
    </>
  );
}
