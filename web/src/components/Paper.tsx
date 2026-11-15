"use client";

import { ChevronDown, Megaphone, MessageSquare, Newspaper, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { DAILY, appearancesToday } from "@/lib/staff/run";
import { currentCase, longDate, shortDate, useCase } from "@/lib/cases/store";
import type { Case } from "@/lib/cases/types";
import { surnameOf, type Edition, type NewsItem } from "@/lib/paper/edition";
import { draftStances, respond, usePaper } from "@/lib/paper/run";
import { FACTIONS_2013 } from "@/lib/cases/mayor2013-factions";
import { cn } from "@/lib/util";
import { Cite } from "@/views/CaseView";
import { PHOTOS } from "@/views/Profile";
import { Dialog, Popover } from "./ui";

// The morning paper: one page per morning, every edition kept. What it reports from the record is the case's own
// paraphrase of cited coverage, ranked by how much it moved the race, wherever it happened; coverage dated today or
// later is held back, because a later headline can give away what the real campaign chose. What the campaigns did
// is the simulation's, and says so.
//
// Set as an old broadsheet: a masthead with ears, the lead in huge condensed type, a moving picture, column stories.
// The page is newsprint on the dark desk; the inks come from the `.ledger` colours in globals.css.

export { usePaper };

/** First sentence as the headline, the rest as the story. */
const split = (s: string): [string, string] => {
  const i = s.indexOf(". ");
  return i < 0 ? [s.replace(/\.$/, ""), ""] : [s.slice(0, i), s.slice(i + 2)];
};

const ease = [0.22, 1, 0.36, 1] as const;

export function Paper() {
  const { open, set } = usePaper();
  const close = () => set(false);
  return <Dialog open={open} onClose={close} className="ledger ledger-sheet max-w-[1080px]">{open && <Page close={close} />}</Dialog>;
}

/**
 * The morning paper is out. A notice in the corner glows until the student opens the paper or puts it aside; nothing
 * covers the screen. The clock waits meanwhile (see useTicker in Clock.tsx).
 */
export function PaperNotice() {
  const unread = usePaper((s) => s.unread);
  const e = usePaper((s) => s.editions.at(-1));
  return (
    <AnimatePresence>
      {unread && e && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.28, ease }}
          className="fixed bottom-5 left-5 z-50 w-[340px] min-[1200px]:left-[276px]"
        >
          <div role="status" className="signal flex gap-3 rounded-xl border border-line-strong bg-raised p-3.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)]">
            <button onClick={() => usePaper.getState().set(true)} className="group flex min-w-0 flex-1 gap-3 text-left">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gold/50 text-gold-bright [&_svg]:size-4"><Newspaper /></span>
              <span className="min-w-0">
                <span className="block font-display text-[12px] text-gold/80">The Five Borough Ledger · {shortDate(e.date)}</span>
                <span className="mt-0.5 line-clamp-2 block font-serif text-[15.5px] leading-snug transition-colors group-hover:text-gold-bright">{e.lead ? split(e.lead.text)[0] : "The race for mayor opens"}</span>
                <span className="mt-1 block text-[11.5px] text-muted">Press to read. The clock waits.</span>
              </span>
            </button>
            <button onClick={() => usePaper.setState({ unread: false })} aria-label="Read it later" title="Read it later" className="grid size-6 shrink-0 place-items-center rounded text-faint transition-colors hover:text-fg"><X className="size-3.5" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function Page({ close }: { close: () => void }) {
  const editions = usePaper((s) => s.editions);
  const showing = usePaper((s) => s.showing);
  const c = currentCase(useCase((s) => s.caseId));
  const e = editions.find((x) => x.id === showing) ?? editions.at(-1);
  if (!e) return null;
  const latest = e === editions.at(-1);

  return (
    <div className="overflow-y-auto px-11 pt-8 pb-7">
      <Masthead e={e} editions={editions} />
      {!latest && <p className="mt-3 text-center text-[13px] italic text-muted">An earlier edition. <button className="font-bold not-italic text-gold underline underline-offset-2" onClick={() => usePaper.getState().show(null)}>Back to this morning</button></p>}

      {/* key: a new edition prints its front page afresh, headline ink and all. */}
      <Lead key={e.id} c={c} e={e} latest={latest} close={close} />

      {/* Campaign and rivals stacked beside the poll box, so the row has no hole under a short story. */}
      <div className="ledger-rule mt-7 grid grid-cols-[1.6fr_1fr] gap-7 pt-5 max-[900px]:grid-cols-1">
        <div className="space-y-5 divide-y divide-line [&>*+*]:pt-5">
          <Sim id="ledger-campaign" label="Your campaign" s={e.campaign} />
          <Sim id="ledger-rivals" label="Your rivals" s={e.rivals} />
        </div>
        <Poll e={e} />
      </div>

      {!!e.news.length && (
        <section id="ledger-stories" className="ledger-rule mt-7 pt-4">
          <Kicker real>The stories moving the race</Kicker>
          <ol className="ledger-cols mt-4 columns-3 max-[1000px]:columns-2">
            {e.news.map((x) => <Item key={x.key} c={c} x={x} />)}
          </ol>
        </section>
      )}

      <section id="ledger-letters" className="ledger-rule mt-7 pt-4">
        <Kicker>Voices of the city · letters to the editor</Kicker>
        <div className="mt-3 grid grid-cols-2 gap-7 max-[900px]:grid-cols-1">
          {e.voices.map((v) => (
            <article key={v.group} className="border-l-2 border-line-strong pl-4">
              <h3 className="font-masthead text-[19px] leading-snug font-bold italic">{v.headline}</h3>
              <p className="ledger-text mt-1.5">{v.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[13px] italic text-muted">Your campaign, your rivals, the poll and these letters come from the simulation, not the 2013 record. Letters are written from what each group is likely to value.</p>
      </section>

      <Index e={e} />
    </div>
  );
}

/** Small caps over a rule; `real` marks the record, otherwise the section is the simulation's. */
function Kicker({ children, real }: { children: React.ReactNode; real?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="ledger-kicker">{children}</span>
      <span className={cn("ledger-kicker shrink-0 border px-1.5 py-px", real ? "border-pos/60 text-pos" : "border-warm/60 text-warm")}>{real ? "From the record" : "Simulated"}</span>
    </div>
  );
}

function Masthead({ e, editions }: { e: Edition; editions: Edition[] }) {
  return (
    <header className="pr-9">
      <div className="grid grid-cols-[minmax(0,170px)_1fr_minmax(0,170px)] items-center gap-5">
        {/* Left ear: the countdown, on a slowly turning sunburst. */}
        <div className="relative grid h-[118px] place-items-center border-2 border-fg">
          <Sun />
          <div className="relative text-center">
            <div className="font-headline text-[44px] leading-none tnum">{e.daysLeft || "—"}</div>
            <div className="ledger-kicker mt-1">{e.daysLeft ? "days to the primary" : "Primary day"}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="font-masthead text-[22px] leading-none italic font-bold">The</div>
          <h1 className="font-masthead text-[clamp(38px,4.6vw,64px)] leading-[0.95] font-black tracking-tight uppercase">Five Borough Ledger</h1>
        </div>
        {/* Right ear: date, edition, the archive. */}
        <div className="flex h-[118px] flex-col justify-between border-2 border-fg px-3 py-2.5 text-center">
          <div className="ledger-kicker">{longDate(e.date)}</div>
          <div className="text-[13px] italic">Edition No. {e.id}</div>
          <Archive editions={editions} current={e} />
        </div>
      </div>
      <div className="ledger-rule mt-4 border-b-[3px] border-b-fg [border-bottom-style:double] py-1.5 text-center">
        <span className="ledger-kicker">The city&rsquo;s morning record of the race for mayor · New York · 2013</span>
      </div>
    </header>
  );
}

function Sun() {
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg viewBox="-50 -50 100 100" className="ledger-sun absolute size-[104px] opacity-[0.16]" aria-hidden>
      {rays.map((a) => <path key={a} d="M0-48 L3-14 L-3-14 Z" transform={`rotate(${a})`} fill="currentColor" />)}
      <circle r="14" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Archive({ editions, current }: { editions: Edition[]; current: Edition }) {
  return (
    <Popover
      align="end"
      trigger={() => <button className="ledger-kicker mx-auto flex items-center gap-1 underline-offset-2 hover:underline">Archive · {editions.length} <ChevronDown className="size-3.5" /></button>}
      className="w-[320px]"
    >
      <ul className="ledger max-h-[320px] overflow-y-auto bg-[#e9ddc0] py-1.5">
        {[...editions].reverse().map((x) => (
          <li key={x.id}>
            <button onClick={() => usePaper.getState().show(x.id)} className={cn("flex w-full gap-3 px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-hover", x.id === current.id && "font-bold")}>
              <span className="tnum w-14 shrink-0 italic text-muted">{shortDate(x.date)}</span>
              <span className="line-clamp-2">{x.lead ? split(x.lead.text)[0] : "The race for mayor opens"}</span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}

/** Headline size by length, so a short headline fills the page and a long one still fits in three lines. */
const headSize = (s: string) => (s.length <= 24 ? 112 : s.length <= 48 ? 88 : s.length <= 80 ? 68 : 52);

/** The headline inks in a word at a time when the page opens. */
function Headline({ text }: { text: string }) {
  const still = useReducedMotion();
  const words = text.split(" ");
  return (
    <h2 className="font-headline leading-[0.95] tracking-[0.005em] uppercase [text-wrap:balance]" style={{ fontSize: `min(${headSize(text)}px, ${(headSize(text) / 11).toFixed(1)}vw)` }}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={still ? false : { opacity: 0, filter: "blur(8px)", y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease }}
        >
          {w}{i < words.length - 1 && " "}
        </motion.span>
      ))}
    </h2>
  );
}

type Shot = { src: string; caption: React.ReactNode; lift: number };

/**
 * The moving picture. A candidate named in the lead gets their photograph when we have one; the press room and the
 * skyline follow, crossfading. Each frame keeps moving on its own (the `.living` styles).
 */
function Living({ c, text }: { c: Case; text: string }) {
  const named = c.candidates.find((x) => PHOTOS[x.id] && text.includes(surnameOf(x.name)));
  const shots: Shot[] = [
    ...(named ? [{
      src: PHOTOS[named.id].src,
      lift: 1.05,
      caption: <>{named.name}, 2013. Photo: <a href={PHOTOS[named.id].href} target="_blank" rel="noreferrer" className="underline">{PHOTOS[named.id].credit}</a></>,
    }] : []),
    { src: "/art/plate-press.webp", lift: 1.25, caption: "The presses ran through the night." },
    { src: "/art/masthead-skyline.webp", lift: 3.2, caption: "The city wakes to the morning’s news." },
  ];
  const [at, setAt] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAt((i) => (i + 1) % shots.length), 9000);
    return () => clearInterval(t);
  }, [shots.length]);
  return (
    // The picture stretches to the height of the story beside it, so neither column leaves a gap.
    <figure className="flex flex-col">
      <div className="living min-h-[190px] max-h-[560px] flex-1">
        {shots.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.src} src={s.src} alt="" style={{ opacity: i === at ? 1 : 0, ["--lift" as string]: s.lift }} />
        ))}
        <span className="sweep" />
        <span className="vignette" />
      </div>
      <figcaption className="mt-1.5 border-b border-line pb-1.5 text-[13px] italic text-muted">{shots[at]?.caption}</figcaption>
    </figure>
  );
}

const STAMP: Record<string, string> = { respond: "Answered", staff: "To Comms", pass: "Let pass" };

function Lead({ c, e, latest, close }: { c: Case; e: Edition; latest: boolean; close: () => void }) {
  const [note, setNote] = useState("");
  const [answering, setAnswering] = useState(false);
  const [head, body] = e.lead ? split(e.lead.text) : ["The race for mayor opens", ""];
  const left = DAILY - appearancesToday();
  const full = c.candidates.find((x) => x.id === c.follow)?.name;
  const you = full ? surnameOf(full).replace(/^./, (ch) => ch.toUpperCase()) : "The candidate";
  const story = e.lead ? body : c.briefing.slice(1, 3).map((x) => x.text).join(" ");
  const sources = e.lead ? e.lead.sources : c.briefing.slice(1, 3).flatMap((x) => x.sources);
  return (
    <section id="ledger-lead" className="mt-6">
      <Kicker real>{e.lead?.outlet ? `Lead story · ${e.lead.outlet}` : "Lead story"}</Kicker>
      <div className="mt-3"><Headline text={head} /></div>

      <div className="mt-5 grid grid-cols-[1fr_1.1fr] gap-7 max-[900px]:grid-cols-1">
        <Living c={c} text={e.lead?.text ?? ""} />
        <div>
          <p className="ledger-text ledger-drop">
            {story || head}
            {sources.map((id) => <Cite key={id} c={c} id={id} className="text-[13px] font-bold" />)}
          </p>
          {e.lead && (
            <p className="mt-2 text-[13px] italic text-muted">
              {e.lead.outlet ? `${e.lead.outlet}, ` : ""}{longDate(e.lead.date)} · paraphrased, not the article&rsquo;s own words
            </p>
          )}
          {e.lead && latest && !e.decision && !answering && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className="ledger-btn solid" disabled={left <= 0} title={left <= 0 ? "He has no time left today. Hand it to Comms." : undefined} onClick={() => { setAnswering(true); void draftStances(e); }}>
                <Megaphone className="size-3.5" />Answer the story
              </button>
              <button className="ledger-btn" onClick={() => { respond(e, "staff"); close(); }}><MessageSquare className="size-3.5" />Hand it to Comms</button>
              <button className="ledger-btn border-transparent" onClick={() => setNote(respond(e, "pass"))}><X className="size-3.5" />Let it pass</button>
            </div>
          )}
          {e.lead && latest && !e.decision && answering && <Answer e={e} you={you} onCancel={() => setAnswering(false)} onDone={setNote} />}
          {/* Once the campaign has decided, a rubber stamp lands where the buttons were. */}
          {e.decision && (
            <motion.div
              initial={{ opacity: 0, scale: 2.2, rotate: -14 }}
              animate={{ opacity: 0.85, scale: 1, rotate: -6 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="pointer-events-none mt-4 inline-block border-[3px] border-neg px-3 py-0.5 font-headline text-[28px] tracking-wide text-neg uppercase"
            >
              {STAMP[e.decision]}
            </motion.div>
          )}
          {(note || e.answer) && <p className="mt-3 border-t border-line pt-2 text-[13.5px] italic">{e.answer ?? note}</p>}
          <Inside e={e} />
        </div>
      </div>
    </section>
  );
}

/** "Inside today": the morning's other headlines, boxed under the lead like a broadsheet's teasers. Each jumps to its story. */
function Inside({ e }: { e: Edition }) {
  if (!e.news.length) return null;
  return (
    <div className="mt-5 border-y-2 border-fg py-2.5">
      <div className="ledger-kicker">Inside today&rsquo;s Ledger</div>
      <ul className="mt-1.5 divide-y divide-line">
        {e.news.slice(0, 3).map((x) => (
          <li key={x.key}>
            <button onClick={() => jump("ledger-stories")} className="block w-full py-1.5 text-left font-masthead text-[15px] leading-snug font-bold hover:underline">{split(x.text)[0]}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Three ways to answer the lead, drafted by the comms shop. Pick one and put it out. */
function Answer({ e, you, onCancel, onDone }: { e: Edition; you: string; onCancel: () => void; onDone: (note: string) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const name = (id: string) => FACTIONS_2013.find((f) => f.id === id)?.name ?? id;
  const stance = pick === null ? null : e.stances?.[pick];
  return (
    <div className="mt-4 border-2 border-fg p-4">
      <div className="ledger-kicker">How should {you} answer it?</div>
      {!e.stances ? (
        <p className="mt-3 text-[13.5px] italic text-muted">The communications shop is drafting three ways to answer&hellip;</p>
      ) : (
        <div className="mt-3 space-y-2" role="radiogroup">
          {e.stances.map((s, i) => {
            const on = pick === i;
            return (
              <button key={s.label} role="radio" aria-checked={on} onClick={() => setPick(i)} className={cn("block w-full border p-3 text-left transition-colors", on ? "border-fg bg-hover shadow-[inset_0_0_0_1px_var(--color-fg)]" : "border-line-strong hover:bg-hover/60")}>
                <div className="font-masthead text-[15px] font-bold">{s.label}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                  {s.helps.map((g) => <span key={g} className="text-pos">▲ {name(g)}</span>)}
                  {s.annoys.map((g) => <span key={g} className="text-neg">▼ {name(g)}</span>)}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button className="ledger-btn solid" disabled={!stance} onClick={() => onDone(respond(e, "respond", { stance: stance! }))}>Put it out</button>
        <button className="ledger-btn border-transparent" onClick={onCancel}>Back</button>
      </div>
    </div>
  );
}

function Item({ c, x }: { c: Case; x: NewsItem }) {
  const [head, rest] = split(x.text);
  return (
    <li className="mb-5 break-inside-avoid">
      <h3 className="font-masthead text-[17px] leading-tight font-bold">{head}</h3>
      <div className="mt-1 text-[13px] italic text-muted">{x.outlet ? `${x.outlet}, ` : ""}{longDate(x.date)}</div>
      {rest && <p className="ledger-text mt-1">{rest}</p>}
      <div className="mt-0.5">
        {x.estimate && <span className="mr-1 border border-warm/60 px-1 text-[13px] text-warm italic" title="The tie to this race is our inference, not the source's">Estimate</span>}
        {x.sources.map((id) => <Cite key={id} c={c} id={id} className="text-[13px] font-bold" />)}
      </div>
    </li>
  );
}

function Sim({ id, label, s }: { id: string; label: string; s: { headline: string; body: string } }) {
  return (
    <article id={id}>
      <Kicker>{label}</Kicker>
      {/* A simulated headline can run to a whole sentence; a long one steps down so it does not swamp its story. */}
      <h3 className={cn("mt-2 font-masthead leading-[1.15] font-black", s.headline.length > 70 ? "text-[18px]" : "text-[22px]")}>{s.headline}</h3>
      <p className="ledger-text mt-2">{s.body}</p>
    </article>
  );
}

/** The poll box. A poll runs about once a week (POLL_EVERY); other mornings the box says so. */
function Poll({ e }: { e: Edition }) {
  const still = useReducedMotion();
  return (
    <aside id="ledger-poll" className="border-2 border-fg p-4">
      <div className="text-center">
        <div className="ledger-kicker">Special report</div>
        <h3 className="font-headline text-[30px] leading-none uppercase">The poll</h3>
      </div>
      {!e.polled ? (
        <p className="mt-3 text-center text-[13.5px] italic">No new poll this morning. The Ledger polls about once a week; earlier polls are in the archive.</p>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {e.poll.map((x, i) => (
              <div key={x.id} className="text-[13.5px]">
                <div className="flex justify-between"><span className={cn(x.you && "font-bold")}>{x.name}</span><span className="tnum font-bold">{x.v}%</span></div>
                <div className="mt-0.5 h-[7px] border border-fg/70">
                  <motion.div
                    className={cn("h-full", x.you ? "bg-neg" : "bg-fg")}
                    initial={still ? false : { width: 0 }}
                    animate={{ width: `${Math.min(100, x.v * 2)}%` }}
                    transition={{ delay: 0.5 + i * 0.12, duration: 0.9, ease }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-line-strong pt-2.5 text-[13.5px]">
            <p><b>Strongest</b> with {e.strong.map((x) => `${x.name} (${x.v}%)`).join(", ")}</p>
            <p><b>Weakest</b> with {e.weak.map((x) => `${x.name} (${x.v}%)`).join(", ")}</p>
          </div>
        </>
      )}
    </aside>
  );
}

/** The foot of the page: an index like the old broadsheets', numbered in page order; each entry jumps to its section. */
function Index({ e }: { e: Edition }) {
  const entries = ([
    ["Lead", "ledger-lead"],
    ["Campaign", "ledger-campaign"],
    ["Rivals", "ledger-rivals"],
    [e.polled ? "Poll" : "No poll", "ledger-poll"],
    ...(e.news.length ? [["Stories", "ledger-stories"]] : []),
    ["Letters", "ledger-letters"],
  ] as [string, string][]).map(([label, id], i) => [label, String(i + 1), id] as const);
  return (
    <nav className="ledger-rule mt-6 flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-b-fg pt-2 pb-1.5">
      {entries.map(([label, n, id]) => (
        <button key={id} onClick={() => jump(id)} className="group flex items-baseline gap-1.5">
          <span className="text-[13.5px] italic group-hover:underline">{label}</span>
          <span className="font-headline text-[26px] leading-none">{n}</span>
        </button>
      ))}
      <span className="flex items-baseline gap-1.5"><span className="text-[13.5px] italic">days left</span><span className="font-headline text-[26px] leading-none tnum">{e.daysLeft}</span></span>
    </nav>
  );
}
