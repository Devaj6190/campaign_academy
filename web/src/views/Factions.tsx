"use client";

import { motion } from "motion/react";
import { Map as MapIcon, ScrollText } from "lucide-react";
import { Fit } from "@/components/Fit";
import { Button, Dock, DockButton, Inspector, Label, Meter, Section, ViewHeader } from "@/components/ui";
import { FACTIONS } from "@/lib/data";
import { useGame } from "@/lib/store";
import { cn, feelWord, tone } from "@/lib/util";

// Bubble positions: rough seeds, then pushed apart once so circles can never overlap.
const W = 900, H = 500, GAP = 16;
const radius = (size: number) => 34 + size * 0.56;
const SEEDS: Record<string, [number, number]> = { renters: [420, 200], homeowners: [720, 180], immigrants: [200, 350], transit: [540, 380], seniors: [760, 380], unions: [190, 160], smallbiz: [600, 250], progressives: [350, 380], donors: [600, 80], students: [330, 70] };
const POS = (() => {
  const p = FACTIONS.map((f) => ({ id: f.id, x: SEEDS[f.id][0], y: SEEDS[f.id][1], r: radius(f.size) }));
  for (let n = 0; n < 400; n++)
    for (const a of p) {
      for (const b of p) {
        if (a === b) continue;
        const dx = a.x - b.x, dy = a.y - b.y, dist = Math.hypot(dx, dy) || 1, need = a.r + b.r + GAP;
        if (dist < need) { a.x += (dx / dist) * (need - dist) * 0.5; a.y += (dy / dist) * (need - dist) * 0.5; }
      }
      a.x = Math.max(a.r, Math.min(W - a.r, a.x));
      a.y = Math.max(a.r, Math.min(H - a.r, a.y));
    }
  return Object.fromEntries(p.map((x) => [x.id, x]));
})();

export function Factions() {
  const factions = useGame((s) => s.factions);
  const faction = useGame((s) => s.faction);
  const select = useGame((s) => s.select);
  const open = useGame((s) => s.open);
  const go = useGame((s) => s.go);
  const sel = factions.find((f) => f.id === faction);
  const showOnMap = (id: string) => { select({ filter: id }); go("map"); };

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <ViewHeader title="Factions" sub="Who the voters are. Bigger circle, bigger group. Colour shows how they feel about Cole." />
        <div className="relative min-h-0 flex-1 px-6 pb-24" onClick={() => select({ faction: null })}>
          <div className="dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
          <Fit w={W} h={H}>
            {factions.map((f, i) => {
              const p = POS[f.id], c = tone(f.feel), on = f.id === faction;
              return (
                <motion.button
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.035 }}
                  transition={{ duration: 0.4, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => { e.stopPropagation(); select({ faction: f.id }); }}
                  className={cn("absolute grid place-items-center rounded-full border text-center transition-[border-color,box-shadow] duration-300", on && "shadow-[0_0_0_1.5px_#fff,0_0_44px_rgba(255,255,255,0.2)]")}
                  style={{
                    left: p.x - p.r, top: p.y - p.r, width: p.r * 2, height: p.r * 2,
                    borderColor: `color-mix(in srgb, ${c} ${on ? 0 : 45}%, transparent)`,
                    background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${c} 20%, transparent), color-mix(in srgb, ${c} 6%, transparent))`,
                  }}
                >
                  <span className="px-3">
                    <span className={cn("block leading-tight font-medium", p.r > 60 ? "text-[14px]" : "text-[12px]")}>{f.name}</span>
                    <span className="mt-0.5 block text-[10.5px]" style={{ color: c }}>{feelWord(f.feel)}</span>
                  </span>
                </motion.button>
              );
            })}
          </Fit>
        </div>
        <Dock label={sel ? sel.name : "Read-only. Use this to write better policy."}>
          <DockButton primary icon={<ScrollText />} label={sel ? "Write policy for them" : "Open the manifesto"} onClick={() => open("manifesto")} />
          {sel && <DockButton icon={<MapIcon />} label="Show on map" onClick={() => showOnMap(sel.id)} />}
        </Dock>
      </section>

      <Inspector>
        {sel ? (
          <>
            <div className="border-b border-line px-5 py-5">
              <Label>Faction</Label>
              <h2 className="mt-1.5 text-[17px] font-medium tracking-tight">{sel.name}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-raised px-3 py-2.5">
                  <div className="text-[15px] font-medium" style={{ color: tone(sel.feel) }}>{feelWord(sel.feel)}</div>
                  <div className="text-[11.5px] text-muted">Toward Cole</div>
                </div>
                <div className="rounded-lg border border-line bg-raised px-3 py-2.5">
                  <div className="text-[15px] font-medium">{sel.size >= 70 ? "Large" : sel.size >= 40 ? "Medium" : "Small"}</div>
                  <div className="text-[11.5px] text-muted">Share of voters</div>
                </div>
              </div>
            </div>
            <Section title="Who they are"><p className="text-[13px] leading-relaxed text-soft">{sel.about}</p></Section>
            <Section title="What they value"><Bullets items={sel.values} color="var(--color-pos)" /></Section>
            <Section title="What they dislike"><Bullets items={sel.dislikes} color="var(--color-neg)" /></Section>
            <Section title="Where they are"><Button size="sm" onClick={() => showOnMap(sel.id)}><MapIcon className="size-3.5" />Show on map</Button></Section>
          </>
        ) : (
          <>
            <Section title="Reading factions">
              <p className="text-[12.5px] leading-relaxed text-muted">You cannot change a faction from here. Read what each one values and dislikes, then write policy and choose actions with that in mind.</p>
            </Section>
            <Section title="All factions">
              <div className="-mx-2">
                {[...factions].sort((a, b) => b.size - a.size).map((f) => (
                  <button key={f.id} onClick={() => select({ faction: f.id })} className="block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-hover">
                    <div className="flex justify-between text-[13px]"><span className="text-soft">{f.name}</span><span className="text-[11.5px]" style={{ color: tone(f.feel) }}>{feelWord(f.feel)}</span></div>
                    <Meter value={f.size} color="rgb(255 255 255 / .35)" className="mt-1.5" />
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}
      </Inspector>
    </div>
  );
}

const Bullets = ({ items, color }: { items: string[]; color: string }) => (
  <ul className="space-y-1.5">
    {items.map((t) => (
      <li key={t} className="flex items-center gap-2.5 text-[13px] text-soft"><i className="size-1 shrink-0 rounded-full" style={{ background: color }} />{t}</li>
    ))}
  </ul>
);
