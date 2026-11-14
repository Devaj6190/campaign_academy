"use client";

import { Check, ChevronDown, DoorOpen, HandCoins, Megaphone, UserRound, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";
import { Dock, DockButton, Inspector, Label, Meter, Popover, Section, Tag, ViewHeader } from "@/components/ui";
import { appear, APPEARANCES, appearancesToday, DAILY, preview, sendStaff, type Appearance } from "@/lib/candidate";
import { groupsHere } from "@/lib/demographics";
import { DISTRICTS, FETCHED, districtBy } from "@/lib/geo";
import { sentimentOf, useGame } from "@/lib/store";
import { clock, cn, heat, tone } from "@/lib/util";

// The map itself touches the browser (WebGL), so it only renders on the client.
const MapCanvas = dynamic(() => import("./map/MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-[12px] text-faint">Loading the city…</div>,
});

const ICONS: Record<Appearance, ReactNode> = { canvass: <DoorOpen />, rally: <Megaphone />, house_party: <HandCoins />, coalition_meeting: <Users /> };

export function MapView() {
  const filter = useGame((s) => s.filter);
  const factions = useGame((s) => s.factions);
  const district = useGame((s) => s.district);
  const select = useGame((s) => s.select);
  const done = useGame((s) => appearancesToday(s));
  const sent = useGame((s) => s.sent);
  const [tip, setTip] = useState<{ x: number; y: number; cd: number } | null>(null);
  const [notice, setNotice] = useState<{ id: number; ok: boolean; text: string } | null>(null);
  const noticeId = useRef(0);
  const world = { sent, filter, factions };
  const sel = districtBy(district);
  const hovered = districtBy(tip?.cd ?? null);
  const current = factions.find((f) => f.id === filter);
  const left = DAILY - done;

  const go = (id: Appearance) => {
    if (!sel) return;
    const r = appear(sel.cd, id);
    const n = { id: ++noticeId.current, ok: r.ok, text: r.text };
    setNotice(n);
    setTimeout(() => setNotice((x) => (x?.id === n.id ? null : x)), 4200);
  };

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader
          title="New York City"
          sub="59 community districts on the real street map. Colour shows how each one feels about Cole."
          right={
            <div className="flex shrink-0 items-center gap-5">
              <div className="hidden items-center gap-2 text-[11px] text-muted @[700px]:flex">
                Cold
                <i className="h-1 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(20)}, ${heat(47)}, ${heat(75)})` }} />
                Warm
              </div>
              <div className="h-8">
                <Popover
                  align="end"
                  className="w-56 p-1.5"
                  trigger={() => (
                    <button className="flex h-8 items-center gap-2 rounded-md border border-line-strong bg-raised px-3 text-[12.5px] whitespace-nowrap transition-colors hover:bg-hover">
                      <span className="text-muted">Showing</span>
                      {current?.name ?? "All voters"}
                      <ChevronDown className="size-3.5 text-muted" />
                    </button>
                  )}
                >
                  {[{ id: "all", name: "All voters" }, ...factions].map((f) => (
                    <button key={f.id} onClick={() => select({ filter: f.id })} className="flex h-8 w-full items-center justify-between rounded-md px-2.5 text-[13px] text-soft transition-colors hover:bg-hover hover:text-fg">
                      {f.name}
                      {filter === f.id && <Check className="size-3.5" />}
                    </button>
                  ))}
                </Popover>
              </div>
            </div>
          }
        />
        <div className="relative min-h-0 flex-1 overflow-hidden border-t border-line">
          <MapCanvas onHover={setTip} onSelect={(cd) => select({ district: cd && districtBy(cd)?.park ? null : cd })} />
          {current && (
            <div className="pointer-events-none absolute top-3 left-3 rounded-md border border-line bg-raised/85 px-2.5 py-1.5 text-[11.5px] text-soft backdrop-blur">
              Showing <span className="text-fg">{current.name.toLowerCase()}</span>: colour is their support, brightness is how many live there
            </div>
          )}
          <AnimatePresence>
            {notice && (
              <motion.div key={notice.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("absolute bottom-24 left-1/2 z-30 max-w-[460px] -translate-x-1/2 rounded-lg border px-3.5 py-2 text-[12.5px] shadow-xl backdrop-blur", notice.ok ? "border-pos/30 bg-raised/90 text-soft" : "border-neg/30 bg-raised/90 text-neg")}>
                {notice.ok && <span className="mr-1.5 font-medium text-pos">Cole:</span>}
                {notice.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {tip && hovered && !hovered.park && (
          <div className="pointer-events-none fixed z-50 rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-[12px] shadow-xl" style={{ left: tip.x + 14, top: tip.y + 14 }}>
            {hovered.name}
            <span className="tnum ml-2 font-mono text-muted">{Math.round(sentimentOf(world, hovered.cd))}%</span>
          </div>
        )}
        <Dock label={sel ? `${sel.name} · Cole ${left}/${DAILY} left today` : "Select a district to act there"}>
          {sel && !sel.park && (
            <>
              {APPEARANCES.map((a, i) => {
                const e = preview(sel.cd, a.id);
                const gain = e.raised ? `raises ~$${(e.raised / 1000).toFixed(1)}k` : a.note;
                return <DockButton key={a.id} primary={i === 0} icon={ICONS[a.id]} label={a.label} sub={`$${e.cost.toLocaleString("en-US")} · ${gain}`} disabled={left <= 0} title={left <= 0 ? "Cole is out of appearances today. Send staff." : undefined} onClick={() => go(a.id)} />;
              })}
              <DockButton icon={<UserRound />} label="Send staff" sub="order to Field Director" onClick={() => sendStaff(sel.cd)} />
            </>
          )}
        </Dock>
      </section>

      <Inspector>{sel ? <DistrictPanel cd={sel.cd} /> : <CityPanel />}</Inspector>
    </div>
  );
}

function CityPanel() {
  const world = useGame();
  const select = useGame((s) => s.select);
  const ranked = DISTRICTS.filter((d) => !d.park).map((d) => ({ d, v: sentimentOf(world, d.cd) })).sort((a, b) => b.v - a.v);
  const list = (rows: typeof ranked) =>
    rows.map(({ d, v }) => (
      <button key={d.cd} onClick={() => select({ district: d.cd })} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
        <i className="size-2 shrink-0 rounded-sm" style={{ background: heat(v) }} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-soft">{d.name}</span>
        <span className="tnum font-mono text-[12px] text-muted">{Math.round(v)}%</span>
      </button>
    ));
  return (
    <>
      <Section title="Reading the map">
        <p className="text-[12.5px] leading-relaxed text-muted">Click a district to fly in: see who lives there, what they complain about, how they voted in 2025, and what you can do there. Drag with right-click to tilt.</p>
        <div className="mt-3 space-y-2 text-[12px] text-soft">
          <div className="flex items-start gap-2"><Tag kind="real" /><span>Streets, boundaries, 311 complaints ({FETCHED}), census demographics and 2025 turnout.</span></div>
          <div className="flex items-start gap-2"><Tag kind="sim" /><span>How each district feels about your candidate.</span></div>
        </div>
      </Section>
      <Section title="Strongest districts" right={<Tag kind="sim" />}>{list(ranked.slice(0, 5))}</Section>
      <Section title="Weakest districts" right={<Tag kind="sim" />}>{list(ranked.slice(-5).reverse())}</Section>
    </>
  );
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function DistrictPanel({ cd }: { cd: number }) {
  const world = useGame();
  const d = districtBy(cd)!;
  const v = Math.round(sentimentOf(world, cd));
  const max = d.issues[0]?.[1] ?? 1;
  const recent = world.ledger.filter((l) => l.effect.district === cd || l.effect.sent[cd] !== undefined).slice(-5).reverse();
  const name = (id: string) => world.factions.find((f) => f.id === id)?.name ?? id;
  const who = (l: (typeof recent)[number]) => (l.source === "candidate" ? "Cole" : world.staff.find((p) => p.id === l.effect.by)?.name?.split(" ")[0] ?? "Staff");
  const groups = groupsHere(cd).slice(0, 5);
  const demo = d.demo;
  const race = demo ? ([["Hispanic", demo.race.hispanic, "#f0a23b"], ["Black", demo.race.black, "#b4b4bd"], ["White", demo.race.white, "#5b8def"], ["Asian", demo.race.asian, "#5fd08a"]] as const) : [];

  return (
    <>
      <div className="border-b border-line px-5 py-5">
        <Label>{d.boro} · Community District {d.num}</Label>
        <h2 className="mt-1.5 text-[17px] leading-snug font-medium tracking-tight">{d.name}</h2>
      </div>
      {d.park ? (
        <Section title="No voters"><p className="text-[12.5px] text-muted">Park or airport land. Nobody votes from here.</p></Section>
      ) : (
        <Section title="Support for Cole" right={<Tag kind="sim" />}>
          <div className="flex items-baseline gap-2">
            <span className="tnum font-mono text-[30px] leading-none font-medium tracking-tight" style={{ color: tone(v) }}>{v}%</span>
            <span className="text-[12px] text-muted">{world.filter === "all" ? "of all voters" : `of ${name(world.filter).toLowerCase()}`}</span>
          </div>
          <Meter value={v} color={tone(v)} className="mt-3" />
        </Section>
      )}
      {!d.park && (
        <Section title="What happened here recently">
          {recent.length ? (
            <ol className="space-y-2">
              {recent.map((l) => {
                const delta = l.effect.sent[cd];
                return (
                  <li key={l.id} className="text-[12px] leading-snug">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-faint">
                      <span className="tnum font-mono">Day {l.day} · {clock(l.min)}</span>
                      {delta !== undefined && <span className={cn("tnum font-mono", delta >= 0 ? "text-pos" : "text-neg")}>{delta >= 0 ? "+" : ""}{delta}</span>}
                    </div>
                    <p className="text-soft"><span className="text-fg">{who(l)}</span> · {l.effect.summary.replace(/ \(Not their strength.*$/, "")}</p>
                  </li>
                );
              })}
            </ol>
          ) : <p className="text-[12.5px] text-faint">Nothing yet. Knock doors here or send staff.</p>}
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
            {race.map(([k, val, c]) => <i key={k} style={{ width: `${val}%`, background: c }} title={`${k} ${val}%`} />)}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-muted">
            {race.map(([k, val, c]) => <span key={k} className="flex items-center gap-1"><i className="size-1.5 rounded-full" style={{ background: c }} />{k} {val}%</span>)}
          </div>
          <p className="mt-2 text-[11px] text-faint">Census ACS 5-year estimates via NYC Planning.</p>
        </Section>
      )}
      {!!groups.length && (
        <Section title="Biggest voter groups here">
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-soft">{name(g.id)}</span>
                  <span className="flex items-center gap-1.5"><span className="tnum font-mono text-[11px] text-muted">{g.rel >= 1 ? `${g.rel.toFixed(1)}× city avg` : `${Math.round(g.share * 100)}%`}</span><Tag kind={g.real ? "real" : "sim"} /></span>
                </div>
                <Meter value={Math.min(100, (g.rel / 2) * 100)} color={g.real ? "var(--color-pos)" : "var(--color-warm)"} className="mt-1" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-faint">Aim actions at a group that lives here and they land harder.</p>
        </Section>
      )}
      {d.vote && (
        <Section title="2025 mayoral election" right={<Tag kind="real" />}>
          <div className="flex items-baseline gap-2">
            <span className="tnum font-mono text-[24px] leading-none font-medium">{d.vote.turnout}%</span>
            <span className="text-[12px] text-muted">turnout · rank {d.vote.rank} of 59</span>
          </div>
          <Meter value={d.vote.turnout} color="rgb(255 255 255 / .6)" className="mt-2.5" />
          <div className="mt-2 flex justify-between text-[11.5px] text-muted">
            <span><span className="tnum font-mono text-soft">{d.vote.votes.toLocaleString("en-US")}</span> votes cast</span>
            <span><span className="tnum font-mono text-soft">{d.vote.share}%</span> of the city&apos;s vote</span>
          </div>
          <p className="mt-2 text-[11px] text-faint">Board of Elections results; turnout is votes over citizens 18+.</p>
        </Section>
      )}
      <Section title="What residents report" right={<Tag kind="real" />}>
        {d.issues.length ? (
          <div className="space-y-2.5">
            {d.issues.map(([n, c]) => (
              <div key={n}>
                <div className="flex justify-between gap-3 text-[13px]"><span className="truncate text-soft capitalize">{n.toLowerCase()}</span><span className="tnum font-mono text-[12px] text-muted">{c.toLocaleString("en-US")}</span></div>
                <Meter value={(c / max) * 100} color="rgb(255 255 255 / .5)" className="mt-1.5" />
              </div>
            ))}
            <p className="pt-1 text-[11.5px] text-faint">311 service requests, last 30 days.</p>
          </div>
        ) : <p className="text-[12.5px] text-faint">No reports.</p>}
      </Section>
    </>
  );
}
