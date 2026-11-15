"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, CalendarDays, Map as MapIcon, Minimize2, Plus, Wallet } from "lucide-react";
import { Button, Dock, DockButton, Label, Tag } from "@/components/ui";
import { ShaderBackground } from "@/components/ui21/dithering";
import { useCase, useCaseNow } from "@/lib/cases/store";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { Claims } from "./CaseView";
import { PlankDesk } from "@/components/PlankDesk";
import { PlatformSection } from "./Platform";

// The real candidate and race of the current case, as one card. It opens small (portrait, name, two figures) and a
// click grows it into the full card; the page itself never scrolls. Everything here is read from the case file; the
// only simulated numbers are the student's own standing and money, which follow their decisions so far.

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1000)}k`);
const TABS = [["record", "Platform"], ["yours", "Your additions"]] as const;

// The card and everything that travels with it move on one spring with no overshoot. What only exists in the open card
// fades in once the card has most of its size, so nothing pops in mid-flight.
const move = { type: "spring", duration: 0.6, bounce: 0 } as const;
const arrive = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { layout: move, opacity: { delay: 0.35, duration: 0.3 } } };

// ponytail: keyed by candidate id here, not a field on the shared Candidate type; move it into the case file once that
// type change has been announced on the board. A candidate without an entry gets their initials.
export const PHOTOS: Record<string, { src: string; credit: string; href: string }> = {
  deblasio: { src: "/art/deblasio-2013.jpg", credit: "Kevin Case · CC BY 2.0", href: "https://commons.wikimedia.org/wiki/File:Bill_de_Blasio_11-2-2013.jpg" },
};

export function Profile() {
  const go = useGame((s) => s.go);
  // The platform shows what was on record by the step the campaign has reached.
  const { c, w, step, daysLeft } = useCaseNow();
  const picks = useCase((s) => s.picks);
  const me = c.candidates.find((x) => x.id === c.follow)!;
  const photo = PHOTOS[me.id];
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("record");
  const left = money(Math.max(0, w.budget));

  // No poll figures and no rivals here: polls are in the morning paper on the mornings it carries one, and what the
  // rivals are doing opens from the poll strip in the top bar. Money is the one simulated figure, so it carries the tag.
  const stats: [string, string, string, boolean?][] = [
    [String(daysLeft), "days left", `Primary on ${new Date(c.electionDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`],
    [left, "money left", "To spend under the cap", true],
    [`${c.threshold}%`, "to win outright", "Below it, a runoff"],
  ];

  return (
    <div className="flex h-full">
      <section className="@container relative flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center px-10 pt-8 pb-24">
          <motion.div
            layout
            transition={move}
            style={{ borderRadius: 28, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.9)" }}
            whileHover={open ? undefined : { y: -4 }}
            onClick={open ? undefined : () => setOpen(true)}
            className={cn(
              "border border-line-strong bg-gradient-to-b from-raised to-surface",
              open ? "flex h-full max-h-[760px] w-full max-w-[1080px] flex-col p-7" : "w-[340px] cursor-pointer p-2.5 transition-colors hover:border-gold/60",
            )}
          >
            <div className={open ? "flex gap-8" : "flex flex-col"}>
              {/* The same 4:5 frame in both states, so the photo only scales and never stretches. */}
              <motion.div
                layout
                transition={move}
                style={{ borderRadius: 20 }}
                className={cn("relative aspect-[4/5] shrink-0 overflow-hidden border border-line bg-gradient-to-b from-[#1b1b20] to-[#0c0c0e]", open ? "w-[176px] self-start" : "w-full")}
              >
                {photo ? (
                  <>
                    <Image src={photo.src} alt={me.name} fill sizes="340px" className="object-cover object-top" />
                    <motion.a
                      layout="position"
                      transition={move}
                      href={photo.href}
                      target="_blank"
                      rel="noreferrer"
                      title="Photo credit and licence"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-[13px] text-white/80 hover:text-white"
                    >
                      {photo.credit}
                    </motion.a>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 opacity-45 [mask-image:linear-gradient(to_top,black,transparent_85%)]"><ShaderBackground /></div>
                    <span className="absolute inset-0 grid place-items-center font-serif text-[64px] text-white/70 mix-blend-overlay">{me.name.split(" ").map((p) => p[0]).join("")}</span>
                  </>
                )}
              </motion.div>

              <motion.div layout="position" transition={move} className={open ? "min-w-0 flex-1" : "px-3.5 pt-5"}>
                {open && <motion.div {...arrive}><Label className="text-[13px]">The campaign you run</Label></motion.div>}
                {/* One size in both states: the name slides to its new place and never jumps in size. */}
                <motion.h1 layout="position" transition={move} className={cn("font-serif text-[40px] leading-none tracking-tight", open && "mt-2")}>{me.name}</motion.h1>
                <motion.p layout="position" transition={move} className="mt-3 text-[16px] leading-relaxed text-soft">{me.standing}.{open && ` Running for ${c.office}.`}</motion.p>
                {open && <motion.div {...arrive} className="mt-4"><Claims big c={c} items={me.about} /></motion.div>}
              </motion.div>

              {open ? (
                <motion.div layout="position" {...arrive} className="w-[270px] shrink-0 space-y-4">
                  {stats.map(([v, k, sub, sim]) => (
                    <div key={k}>
                      <div className="flex items-baseline gap-2.5">
                        <span className="tnum font-mono text-[32px] leading-none font-medium tracking-tight">{v}</span>
                        <Label className="text-[13px]">{k}</Label>
                        {sim && <Tag kind="sim" />}
                      </div>
                      <div className="mt-1 text-[13px] text-muted">{sub}</div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div layout="position" {...arrive} className="flex items-center gap-4 px-3.5 pt-5 pb-3">
                  <span className="tnum flex items-center gap-1.5 font-mono text-[15px]" title="Days left"><CalendarDays className="size-4 text-muted" />{daysLeft}</span>
                  <span className="tnum flex items-center gap-1.5 font-mono text-[15px]" title="Money left (simulated)"><Wallet className="size-4 text-muted" />{left}</span>
                  {/* The click bubbles to the card, which opens it. */}
                  <Button variant="primary" className="ml-auto">Open <Plus className="size-4" /></Button>
                </motion.div>
              )}
            </div>

            {open && (
              <motion.div layout="position" {...arrive} className="mt-6 flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-1 border-b border-line">
                  {TABS.map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)} className={cn("-mb-px border-b-2 px-3 pb-2.5 font-display text-[15px] font-semibold transition-colors", tab === id ? "border-gold text-gold-bright" : "border-transparent text-muted hover:text-fg")}>{label}</button>
                  ))}
                  <button onClick={() => setOpen(false)} className="ml-auto flex items-center gap-1.5 pb-2.5 text-[13px] text-muted transition-colors hover:text-gold-bright"><Minimize2 className="size-3.5" />Close card</button>
                </div>
                {/* Both stay mounted so a half-written plank survives a tab switch. This body scrolls only if the record outgrows the card. */}
                <div className="min-h-0 flex-1 overflow-y-auto pt-5 pr-2">
                  <div className={tab === "record" ? undefined : "hidden"}><PlatformSection c={c} step={step} picks={picks} /></div>
                  <div className={tab === "yours" ? undefined : "hidden"}><PlankDesk /></div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
        <Dock>
          <DockButton primary icon={<BookOpen />} label="Back to the case" onClick={() => go("case")} />
          <DockButton icon={<MapIcon />} label="Map" onClick={() => go("map")} />
          <DockButton icon={<ArrowRight />} label="War room" onClick={() => go("war")} />
        </Dock>
      </section>
    </div>
  );
}
