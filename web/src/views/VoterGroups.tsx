"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, ChevronDown, Map as MapIcon, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Fit } from "@/components/Fit";
import { Dock, DockButton, Label, ViewHeader } from "@/components/ui";
import { FACTION_POLLS, FACTIONS_2013, factionNow, type Faction } from "@/lib/cases/mayor2013-factions";
import { LEANINGS_2013 } from "@/lib/cases/mayor2013-leanings";
import { LINKS_2013, linksOf, type Link } from "@/lib/cases/mayor2013-links";
import { factionWork, useCase, useCaseNow, worldAt } from "@/lib/cases/store";
import { DISTRICTS } from "@/lib/geo";
import { usePlanks } from "@/lib/manifesto/run";
import type { Plank } from "@/lib/manifesto/rules";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";

// Factions: who the primary's voters are, how big each group is, where you stand with them and how they pull on
// each other. Sizes and the February and September figures are real poll numbers (lib/cases/mayor2013-factions).
// Where you stand now is simulated. What a group wants, and so every line, is inferred (mayor2013-leanings, -links).
// The screen carries no real / simulated / estimate tags, at Devaj's decision on 15 November 2026.

type P = { x: number; y: number; r: number };

// The canvas. A circle's area is the group's share of likely voters: radius = K × √share, with nothing added, so a
// group twice the size covers twice the area. Groups of one kind sit together under a heading, three rows of kinds.
const W = 1400, H = 680, K = 10.8, GAP = 10, BETWEEN = 52, HEAD = 26, ROW_GAP = 30;
const ROWS: Faction["kind"][][] = [["Race", "Borough", "Ideology"], ["Religion", "Age", "Gender"], ["Income", "Education", "Labor"]];
const radius = (share: number) => K * Math.sqrt(share);

const { BASE, HEADS } = (() => {
  const base: Record<string, P> = {}, heads: { kind: string; x: number; y: number }[] = [];
  const rows = ROWS.map((kinds) => kinds.map((kind) => FACTIONS_2013.filter((f) => f.kind === kind)));
  const tall = rows.map((row) => 2 * Math.max(...row.flat().map((f) => radius(f.share))));
  const wide = (fs: Faction[]) => fs.reduce((a, f) => a + 2 * radius(f.share), 0) + GAP * (fs.length - 1);
  let y = (H - tall.reduce((a, t) => a + HEAD + t, 0) - ROW_GAP * (rows.length - 1)) / 2;
  rows.forEach((row, i) => {
    let x = (W - row.reduce((a, fs) => a + wide(fs), 0) - BETWEEN * (row.length - 1)) / 2;
    for (const fs of row) {
      heads.push({ kind: fs[0].kind, x: x + wide(fs) / 2, y: y + HEAD / 2 });
      for (const f of fs) {
        const r = radius(f.share);
        base[f.id] = { x: x + r, y: y + HEAD + tall[i] / 2, r };
        x += 2 * r + GAP;
      }
      x += BETWEEN - GAP;
    }
    y += HEAD + tall[i] + ROW_GAP;
  });
  return { BASE: base, HEADS: heads };
})();

// A picked group moves here and grows; the groups it is linked to stand on an arc to its left, and the card opens on
// the right. Everything else fades into the background.
const FOCUS: P = { x: 500, y: H / 2, r: 128 };
function focusLayout(id: string): Record<string, P> {
  const links = linksOf(id).sort((a, b) => BASE[a.other].y - BASE[b.other].y || BASE[a.other].x - BASE[b.other].x);
  const out: Record<string, P> = { [id]: FOCUS };
  const half = Math.min(80, 22 * (links.length - 1));
  links.forEach((l, i) => {
    const phi = ((links.length === 1 ? 0 : -half + (2 * half * i) / (links.length - 1)) * Math.PI) / 180;
    out[l.other] = { x: FOCUS.x - 270 * Math.cos(phi), y: FOCUS.y + 246 * Math.sin(phi), r: Math.max(36, BASE[l.other].r * 0.7) };
  });
  return out;
}

// Warm where you run ahead of your citywide figure, cool where you trail it by two points or more.
const tint = (support: number, citywide: number) => (support >= citywide + 2 ? "var(--color-warm)" : support <= citywide - 2 ? "var(--color-cool)" : "var(--color-soft)");
const word = (support: number, citywide: number) => (support >= citywide + 2 ? "Ahead of" : support <= citywide - 2 ? "Behind" : "Level with");

// The two kinds of line must never be mistaken for each other: gold and unbroken with a dot where two groups want the
// same thing; red and broken with a cross where one wants what the other does not.
const LINE = { shared: "var(--color-gold-bright)", opposed: "var(--color-neg)" } as const;
const SAYS = { shared: "Both want", opposed: "Split on" } as const;

function Tie({ a, b, kind, strength }: { a: P; b: P; kind: Link["kind"]; strength: "faint" | "strong" | "off" }) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const x1 = a.x + ux * (a.r + 4), y1 = a.y + uy * (a.r + 4), x2 = b.x - ux * (b.r + 4), y2 = b.y - uy * (b.r + 4);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, strong = strength === "strong";
  return (
    <g opacity={strong ? 1 : strength === "faint" ? 0.3 : 0.07} style={{ transition: "opacity .25s" }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={LINE[kind]} strokeWidth={strong ? 2.4 : 1.4} strokeDasharray={kind === "opposed" ? "7 6" : undefined} strokeLinecap="round" />
      {kind === "shared" ? (
        <circle cx={mx} cy={my} r={strong ? 5 : 3.2} fill={LINE.shared} />
      ) : (
        <g stroke={LINE.opposed} strokeWidth={strong ? 2.4 : 1.6} strokeLinecap="round">
          <circle cx={mx} cy={my} r={strong ? 9 : 6} fill="var(--color-bg)" stroke="none" />
          <line x1={mx - (strong ? 5 : 3.5)} y1={my - (strong ? 5 : 3.5)} x2={mx + (strong ? 5 : 3.5)} y2={my + (strong ? 5 : 3.5)} />
          <line x1={mx - (strong ? 5 : 3.5)} y1={my + (strong ? 5 : 3.5)} x2={mx + (strong ? 5 : 3.5)} y2={my - (strong ? 5 : 3.5)} />
        </g>
      )}
    </g>
  );
}

export function VoterGroups() {
  const { c, w, step } = useCaseNow();
  const picks = useCase((s) => s.picks);
  const planks = usePlanks((s) => s.planks);
  const go = useGame((s) => s.go);
  const select = useGame((s) => s.select);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const mine = w.poll[c.follow] ?? 0, mineStart = c.start.poll[c.follow] ?? 0;
  const boost = factionWork();
  const now = (f: Faction) => factionNow(f, w.groups, mine, mineStart, boost);
  const sel = FACTIONS_2013.find((f) => f.id === picked) ?? null;
  const focus = sel ? focusLayout(sel.id) : null;
  const ties = sel ? linksOf(sel.id) : [];
  const near = hover ? new Set([hover, ...linksOf(hover).map((l) => l.other)]) : null;

  useEffect(() => {
    if (!picked) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPicked(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [picked]);

  return (
    <section className="@container relative flex h-full min-w-0 flex-col">
      <ViewHeader title="Factions" sub="Who votes in the primary. Bigger circle, more voters. Lines show who pulls together and who pulls apart." />
      <div className="relative min-h-0 flex-1 px-6 pb-24" onClick={() => setPicked(null)}>
        <div className="dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        <Fit w={W} h={H}>
          <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {!focus && LINKS_2013.map((l) => <Tie key={l.a + l.b} a={BASE[l.a]} b={BASE[l.b]} kind={l.kind} strength={!hover ? "faint" : l.a === hover || l.b === hover ? "strong" : "off"} />)}
            {focus && sel && (
              <motion.g key={sel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.35 }}>
                {ties.map((l) => <Tie key={l.other} a={focus[sel.id]} b={focus[l.other]} kind={l.kind} strength="strong" />)}
              </motion.g>
            )}
          </svg>
          {HEADS.map((h) => (
            <motion.span key={h.kind} animate={{ opacity: focus ? 0 : 1 }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 font-display text-[12.5px] whitespace-nowrap text-gold/75" style={{ left: h.x, top: h.y }}>{h.kind}</motion.span>
          ))}
          {FACTIONS_2013.map((f) => {
            const p = focus?.[f.id] ?? BASE[f.id], v = now(f), col = tint(v, mine), on = f.id === picked;
            const away = !!focus && !focus[f.id];
            const big = p.r > 100;
            return (
              <motion.button
                key={f.id}
                initial={false}
                animate={{ left: p.x - p.r, top: p.y - p.r, width: p.r * 2, height: p.r * 2, opacity: away ? 0.05 : near && !near.has(f.id) ? 0.45 : 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => { e.stopPropagation(); setHover(null); setPicked(on ? null : f.id); }}
                onMouseEnter={() => !focus && setHover(f.id)}
                onMouseLeave={() => setHover(null)}
                aria-pressed={on}
                className={cn("absolute grid place-items-center rounded-full border bg-bg text-center transition-[border-color,box-shadow] duration-300", on && "shadow-[0_0_0_1.5px_var(--color-gold-bright)]", away && "pointer-events-none")}
                style={{
                  borderColor: `color-mix(in srgb, ${col} ${on ? 0 : 45}%, transparent)`,
                  backgroundImage: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${col} 18%, transparent), color-mix(in srgb, ${col} 5%, transparent))`,
                }}
              >
                <span className="px-1.5">
                  <span className={cn("block leading-tight font-medium", big ? "text-[20px]" : p.r > 62 ? "text-[14px]" : p.r > 48 ? "text-[12px]" : "text-[10.5px]")}>{f.name}</span>
                  <span className={cn("tnum mt-0.5 block font-mono", big ? "text-[34px] leading-tight" : p.r > 48 ? "text-[13.5px]" : "text-[12px]")} style={{ color: col }}>{Math.round(v)}%</span>
                  <span className={cn("tnum block font-mono text-faint", big ? "text-[12px]" : "text-[9px]")}>{f.share}% of voters</span>
                </span>
              </motion.button>
            );
          })}
          {/* What each line to the picked group rests on, beside the group at its other end, on the side away from the centre. */}
          {focus && sel && ties.map((l) => {
            const p = focus[l.other], dy = p.y - FOCUS.y, upright = Math.abs(dy) > 190;
            const at = upright ? { left: p.x - 84, top: dy < 0 ? p.y - p.r - 36 : p.y + p.r + 6 } : { left: p.x - p.r - 164, top: p.y - 16 };
            return (
              <motion.span key={sel.id + l.other} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className={cn("pointer-events-none absolute flex h-8 text-[11.5px] leading-tight", upright ? "w-[168px] justify-center text-center" : "w-[156px] items-center justify-end text-right", upright && (dy < 0 ? "items-end" : "items-start"))} style={{ ...at, color: LINE[l.kind] }}>
                <span><span className="font-medium">{SAYS[l.kind]}:</span> <span className="text-soft">{l.why[0].toLowerCase() + l.why.slice(1)}</span></span>
              </motion.span>
            );
          })}
        </Fit>
        <div className="pointer-events-none absolute bottom-24 left-7 flex max-w-[calc(100%-3.5rem)] flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-warm" />Ahead of your {Math.round(mine)}%</span>
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-cool" />Behind</span>
          <span className="flex items-center gap-1.5"><svg width="30" height="10" aria-hidden><line x1="1" y1="5" x2="29" y2="5" stroke={LINE.shared} strokeWidth="2" /><circle cx="15" cy="5" r="3.2" fill={LINE.shared} /></svg>Same wants</span>
          <span className="flex items-center gap-1.5"><svg width="30" height="10" aria-hidden><line x1="1" y1="5" x2="29" y2="5" stroke={LINE.opposed} strokeWidth="2" strokeDasharray="5 4" /><path d="M12 2l6 6M18 2l-6 6" stroke={LINE.opposed} strokeWidth="1.6" /></svg>Opposed</span>
          <span title="A voter belongs to several groups at once, so shares do not add to 100.">Groups overlap</span>
        </div>
        <AnimatePresence>
          {sel && (
            <Card
              key={sel.id}
              f={sel}
              now={now(sel)}
              mine={mine}
              path={sel.tracks ? pathOf(c, picks, w, step, sel.tracks) : null}
              census={c.groups.find((g) => g.id === sel.tracks)?.census}
              planks={planks}
              onClose={() => setPicked(null)}
              toDistrict={(cd) => { select({ district: cd }); go("map"); }}
            />
          )}
        </AnimatePresence>
      </div>
      <Dock label={sel ? sel.name : "Select a group to read where you stand with it."}>
        <DockButton primary icon={<BookOpen />} label="Back to the case" onClick={() => go("case")} />
        <DockButton icon={<MapIcon />} label="Open the map" onClick={() => go("map")} />
      </Dock>
    </section>
  );
}

type CaseNow = ReturnType<typeof useCaseNow>;

/** Support in one of the case's own groups: at the briefing, on arriving at each decision reached, and now. */
function pathOf(c: CaseNow["c"], picks: ReturnType<typeof useCase.getState>["picks"], w: CaseNow["w"], step: number, id: string): number[] {
  const arrived = Math.min(Math.max(step - 1, 0), c.decisions.length);
  const pts = [c.start.groups[id] ?? 0, ...Array.from({ length: arrived }, (_, i) => worldAt(c, picks, i + 1).groups[id] ?? 0)];
  const now = w.groups[id] ?? 0;
  return pts[pts.length - 1] === now ? pts : [...pts, now];
}

const Part = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <div className="mb-2 flex items-center gap-3"><Label>{title}</Label><span className="h-px flex-1 bg-line" /></div>
    {children}
  </div>
);

const Wants = ({ title, items, color }: { title: string; items: string[]; color: string }) => (
  <div>
    <div className="mb-1.5 text-[12px] text-muted">{title}</div>
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[13px] leading-snug text-soft"><i className="diamond mt-[5px] size-[7px] shrink-0" style={{ background: color }} />{t}</li>
      ))}
    </ul>
  </div>
);

/**
 * One group as a faction card: who they are, how you stand with them and what they want. Everything else the old
 * sidebar held (the citywide comparison, the poll line, your path, where they live) waits behind "More".
 */
function Card({ f, now, mine, path, census, planks, onClose, toDistrict }: { f: Faction; now: number; mine: number; path: number[] | null; census?: "white" | "black" | "asian" | "hispanic"; planks: Plank[]; onClose: () => void; toDistrict: (cd: number) => void }) {
  const [more, setMore] = useState(false);
  const col = tint(now, mine);
  const l = LEANINGS_2013[f.id];
  const homes = census ? DISTRICTS.filter((d) => d.demo && !d.park).sort((a, b) => b.demo!.race[census] - a.demo!.race[census]).slice(0, 4) : [];
  const mineHere = planks.flatMap((p) => [...p.serves.filter((r) => r.faction === f.id).map(() => ({ text: p.text, good: true })), ...p.offends.filter((r) => r.faction === f.id).map(() => ({ text: p.text, good: false }))]);
  const src = "tnum font-mono text-fg underline decoration-gold/40 underline-offset-2 hover:text-gold-bright";
  return (
    <motion.aside
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.15, duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, x: 28, transition: { duration: 0.18 } }}
      onClick={(e) => e.stopPropagation()}
      aria-label={f.name}
      className="panel absolute top-1/2 right-5 z-20 flex max-h-[calc(100%-7rem)] w-[420px] max-w-[calc(100%-2.5rem)] -translate-y-[calc(50%+2.5rem)] flex-col overflow-hidden rounded-xl border border-line-strong shadow-[0_30px_80px_-20px_rgba(0,0,0,1)]"
    >
      <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 z-10 grid size-7 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-gold hover:text-gold-bright"><X className="size-4" /></button>
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
        <Label>{f.kind}</Label>
        <h2 className="mt-1 font-serif text-[34px] leading-none tracking-tight">{f.name}</h2>
        <div className="mt-2.5 flex items-baseline justify-between gap-4 border-b border-line pb-4">
          <span className="text-[14px]" style={{ color: col }}>{word(now, mine)} <span className="text-muted">your {Math.round(mine)}%</span></span>
          <span className="text-[12.5px] text-muted"><span className="tnum font-mono text-soft">{f.share}%</span> of voters</span>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-soft">
          De Blasio polled <a href={FACTION_POLLS.feb.url} target="_blank" rel="noreferrer" title={FACTION_POLLS.feb.label} className={src}>{f.feb}%</a> with them in February 2013 and <a href={FACTION_POLLS.sep.url} target="_blank" rel="noreferrer" title={FACTION_POLLS.sep.label} className={src}>{f.sep}%</a> in September.
        </p>

        <div className="mt-5">
          {l && (l.values.length || l.dislikes.length) ? (
            <div className="grid grid-cols-2 gap-6">
              {!!l.values.length && <Wants title="They want" items={l.values} color="var(--color-gold-bright)" />}
              {!!l.dislikes.length && <Wants title="They do not want" items={l.dislikes} color="var(--color-neg)" />}
            </div>
          ) : (
            <p className="text-[13px] text-muted">Who they are says too little about what they want.</p>
          )}
        </div>

        {!!mineHere.length && (
          <ul className="mt-5 space-y-1.5 border-t border-line pt-4">
            {mineHere.map((p) => (
              <li key={p.text + p.good} className="flex gap-2 text-[13px] leading-snug text-soft"><span className={cn("shrink-0 font-medium", p.good ? "text-pos" : "text-neg")}>{p.good ? "Your plank serves them" : "Your plank costs you here"}</span><span className="min-w-0 truncate text-muted" title={p.text}>{p.text}</span></li>
            ))}
          </ul>
        )}

        {more && (
          <div className="mt-5 space-y-5 border-t border-line pt-5">
            <p className="text-[12.5px] leading-relaxed text-muted">Citywide he had {FACTION_POLLS.feb.citywide}% in February and {FACTION_POLLS.sep.citywide}% in September. February asked registered Democrats and September likely voters, so the two are not strictly comparable.</p>
            {l?.poll && <Part title="In the 2013 polls"><p className="text-[13px] leading-relaxed text-soft">{l.poll}</p></Part>}
            <Part title="Your path with them">
              {path ? (
                <div className="tnum flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[13px] text-soft">
                  {path.map((v, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <ArrowRight className="size-3 text-faint" />}<span className={i === path.length - 1 ? "text-fg" : ""}>{Math.round(v)}</span></span>)}
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted">This group moves with your citywide standing: gain citywide and you gain here in proportion to how far the real campaign moved this group.</p>
              )}
            </Part>
            {census && (
              <Part title="Where they live">
                <ul>
                  {homes.map((d) => (
                    <li key={d.cd}>
                      <button onClick={() => toDistrict(d.cd)} className="-mx-2 flex w-[calc(100%+16px)] items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-[13px] text-soft transition-colors hover:bg-hover hover:text-fg">
                        <span className="min-w-0 truncate">{d.name}</span>
                        <span className="tnum shrink-0 font-mono text-[11.5px] text-muted">{Math.round(d.demo!.race[census])}% of residents</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11.5px] text-faint">Census estimates by community district. Current figures, not 2013.</p>
              </Part>
            )}
          </div>
        )}
      </div>
      <button onClick={() => setMore(!more)} aria-expanded={more} className="flex h-11 shrink-0 items-center justify-center gap-1.5 border-t border-line font-display text-[12.5px] text-muted transition-colors hover:bg-gold/5 hover:text-gold-bright">
        {more ? "Less" : "More"} <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
      </button>
    </motion.aside>
  );
}
