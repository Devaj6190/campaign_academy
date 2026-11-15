"use client";

import { AnimatePresence, motion } from "motion/react";
import { Lock, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import { canAdd, DAYS_BETWEEN, FREE_PLANKS, type Shaped } from "@/lib/manifesto/rules";
import { commit, shapeIdea } from "@/lib/manifesto/run";
import { RealPlatform } from "./RealPlatform";
import { cn } from "@/lib/util";
import { tacticRisk, type Deliverer } from "@/lib/engine/tactic";
import { Avatar, Button, Dialog, Label, Meter } from "./ui";
import { ShaderBackground } from "./ui21/dithering";
import { PaperView } from "@/views/paper/Paper";
import { MomentCard } from "./MomentCard";
import { Debrief } from "./Debrief";
import { ACTIVE, colorOf, fullNameOf, ME, nameOf } from "@/lib/scenario";

export function Overlays() {
  const overlay = useGame((s) => s.overlay);
  const open = useGame((s) => s.open);
  const close = () => open(null);
  return (
    <>
      <Dialog open={overlay === "paper"} onClose={close} plate="plate-press" className="max-w-[1040px]"><PaperView close={close} /></Dialog>
      <Dialog open={overlay === "manifesto"} onClose={close} side="right"><Manifesto /></Dialog>
      <Dialog open={overlay === "calendar"} onClose={close} className="max-w-[880px]"><Calendar /></Dialog>
      <Dialog open={overlay === "tactic"} onClose={close} className="max-w-[440px]"><Tactic close={close} /></Dialog>
      <Dialog open={overlay === "moment"} onClose={close} className="max-w-[860px]"><MomentCard close={close} /></Dialog>
      <Dialog open={overlay === "debrief"} onClose={close} className="max-w-[980px]"><Debrief /></Dialog>
      <Dialog open={overlay === "election"} onClose={close} plate="plate-election" className="max-w-[520px]"><Election /></Dialog>
      <Toasts />
    </>
  );
}

// Policy lives in one document. Planks are suggested or reshaped from what the player types, and they are permanent.
function Manifesto() {
  const planks = useGame((s) => s.planks);
  const day = useGame((s) => s.day);
  const factions = useGame((s) => s.factions);
  const focus = useGame((s) => s.manifestoFocus);
  const hasDirector = useGame((s) => s.staff.some((p) => p.id === "pol" && p.name));
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Shaped | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const name = (id: string) => factions.find((f) => f.id === id)?.name ?? id;
  const gate = canAdd(planks, day);
  const focusName = focus ? name(focus) : null;

  const shape = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setNote("");
    setDraft(await shapeIdea(t, focus ?? undefined));
    setBusy(false);
  };

  return (
    <>
      <div className="border-b border-line px-7 pt-8 pb-6">
        <Label>Manifesto</Label>
        <h2 className="mt-2 font-serif text-[34px] leading-none tracking-tight">What {ME.short} stands for</h2>
        <p className="mt-3 text-[13px] text-muted">Once a plank goes in, it cannot be removed. Speeches, ads and door scripts are written from this. Build to {FREE_PLANKS}, then one new plank every {DAYS_BETWEEN} days.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-3">
        <ol>
          {planks.map((p, i) => (
            <motion.li key={p.text} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 border-b border-line py-4 last:border-b-0">
              <span className="tnum font-mono text-[11px] leading-[22px] text-faint">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1">
                <div className="text-[14px] leading-[22px]">{p.text}</div>
                {(p.serves.length > 0 || p.offends.length > 0) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.serves.map((r) => <span key={r.faction} title={r.why} className="rounded-full border border-pos/25 px-2 py-0.5 text-[11px] text-pos">Serves {name(r.faction).toLowerCase()}</span>)}
                    {p.offends.map((r) => <span key={r.faction} title={r.why} className="rounded-full border border-neg/25 px-2 py-0.5 text-[11px] text-neg">Costs {name(r.faction).toLowerCase()}</span>)}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-faint">{p.by === "record" ? "On the record at the start" : `Added on day ${p.day}${p.by === "pol" ? " · shaped by the Policy Director" : " · a staff draft"}`}</div>
              </div>
              <Lock className="mt-1 size-3.5 shrink-0 text-faint" />
            </motion.li>
          ))}
        </ol>
        <RealPlatform />
      </div>
      <div className="border-t border-line p-5">
        <AnimatePresence mode="wait" initial={false}>
          {draft ? (
            <motion.div key="draft" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-line-strong bg-raised p-4">
              <div className="flex items-center justify-between"><Label>{draft.by === "pol" ? "Your Policy Director's version" : "A staff draft"}</Label><span className="text-[10.5px] text-faint">{draft.mode === "live" ? "AI draft; effects computed by the game" : "Rough draft from the groups' stated values"}</span></div>
              <p className="mt-2 text-[14px] leading-relaxed">{draft.text}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {draft.serves.map((r) => <span key={r.faction} title={r.why} className="rounded-full border border-pos/25 px-2 py-0.5 text-[11.5px] text-pos">Serves {name(r.faction).toLowerCase()}</span>)}
                {draft.offends.map((r) => <span key={r.faction} title={r.why} className="rounded-full border border-neg/25 px-2 py-0.5 text-[11.5px] text-neg">Costs {name(r.faction).toLowerCase()}</span>)}
                {!draft.serves.length && !draft.offends.length && <span className="text-[11.5px] text-faint">No clear winners or losers: it may not move anyone.</span>}
              </div>
              {draft.tradeoff && <p className="mt-2 text-[12px] text-muted">{draft.tradeoff}</p>}
              {note && <p className="mt-2 text-[12px] text-neg">{note}</p>}
              <div className="mt-4 flex items-center gap-2">
                <Button variant="primary" disabled={!gate.ok} onClick={() => { const err = commit(draft); if (err) setNote(err); else { setDraft(null); setText(""); useGame.setState({ manifestoFocus: null }); } }}><Lock className="size-3.5" />Add permanently</Button>
                <Button variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-baseline justify-between"><Label>Propose a policy{focusName ? ` for ${focusName.toLowerCase()}` : ""}</Label>{!gate.ok && <span className="text-[11px] text-warm">Next plank on day {gate.next}</span>}</div>
              <div className="mt-2 rounded-xl border border-line-strong bg-raised p-2 transition-colors focus-within:border-white/30">
                <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Say what you want in your own words, e.g. make buses free" className="w-full resize-none bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-faint" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-faint">{hasDirector ? "Your Policy Director will shape it." : "No Policy Director yet: a staffer drafts it, less sharply."}</span>
                  <Button size="sm" variant="primary" disabled={!text.trim() || busy} onClick={shape}><Sparkles className="size-3.5" />{busy ? "Shaping…" : "Shape into policy"}</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function Calendar() {
  const day = useGame((s) => s.day);
  const calendar = useGame((s) => s.calendar);
  return (
    <div className="overflow-y-auto p-7">
      <Label>Calendar</Label>
      <h2 className="mt-2 font-serif text-[34px] leading-none tracking-tight">Thirty days</h2>
      <div className="mt-6 grid grid-cols-6 gap-1.5">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
          <div key={d} className={cn("h-[88px] overflow-hidden rounded-lg border p-2", d === day ? "border-line-strong bg-raised" : "border-line", d < day && "opacity-35")}>
            <div className="flex items-center justify-between">
              <span className={cn("tnum font-mono text-[11px]", d === day ? "text-fg" : "text-faint")}>{String(d).padStart(2, "0")}</span>
              {d === day && <span className="text-[10px] text-warm">Today</span>}
            </div>
            <div className="mt-1 space-y-0.5">
              {(calendar[d] ?? []).slice(0, 3).map((e, i) => (
                <div key={i} className={cn("truncate rounded px-1.5 py-px text-[11px]", d === 30 ? "bg-fg text-bg" : "bg-white/[0.06] text-soft")}>{e}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bold moves are honest but risky. The risk is shown before you commit, and it decides whether the move backfires.
function Tactic({ close }: { close: () => void }) {
  const run = useGame((s) => s.runTactic);
  const adsLeft = useGame((s) => s.money.envelopes.ads - s.money.spent.ads);
  const comms = useGame((s) => s.staff.find((p) => p.id === "com")?.name ?? "Your communications director");
  const staffAll = useGame((s) => s.staff);
  const staffName = (id: string) => { const p = staffAll.find((x) => x.id === id); return p?.name && p.name !== p.role ? p.name.split(" ")[0] : p?.role ?? id; };
  const result = useGame((s) => s.tacticResult);
  const world = useGame();
  const [by, setBy] = useState<Deliverer>("com");
  // The risk is worked out from the situation (engine/tactic.ts) and shown with its reasons before you commit.
  const { risk, reasons } = tacticRisk(world, by);
  const pct = Math.round(risk * 100);
  if (result)
    return (
      <div className="p-7">
        <Label className={result === "backfired" ? "text-neg" : "text-pos"}>{result === "backfired" ? "It backfired" : "It worked, this time"}</Label>
        <h2 className="mt-2 font-serif text-[30px] leading-tight tracking-tight">{result === "backfired" ? "Voters read it as an attack" : "The contrast landed"}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-soft">{result === "backfired" ? "The Ledger calls it the first negative ad of the race, and some volunteers have cancelled shifts. The next poll will show how far seniors moved." : "It landed this time. The next poll will show whether it moved seniors. Going negative again will carry more risk."}</p>
        <div className="mt-6 flex justify-end"><Button variant="primary" onClick={close}>Continue</Button></div>
      </div>
    );
  return (
    <div className="p-7">
      <div className="flex items-center gap-2.5"><Avatar name={comms} size={26} /><span className="text-[12.5px] text-muted">{comms} proposes</span></div>
      <h2 className="mt-4 font-serif text-[30px] leading-[1.1] tracking-tight">{ACTIVE.story.tactic.title}</h2>
      <p className="mt-2 text-[13px] text-muted">{ACTIVE.story.tactic.note}</p>
      <dl className="mt-5 space-y-2 text-[13px]">
        <div className="flex justify-between"><dt className="text-muted">Cost</dt><dd className="tnum font-mono">$8,000 <span className="text-faint">from today&apos;s Ads budget (${Math.max(0, adsLeft).toLocaleString("en-US")} left)</span></dd></div>
        <div className="flex justify-between"><dt className="text-muted">If it lands</dt><dd className="text-pos">Seniors may warm to you</dd></div>
        <div className="flex justify-between"><dt className="text-muted">If it reads as an attack</dt><dd className="text-neg">Seniors cool, volunteers drop out</dd></div>
      </dl>
      <div className="mt-5 flex items-center gap-1.5 text-[12px]">
        <span className="mr-1 text-muted">Who delivers it</span>
        {([["com", `${staffName("com")} (comms)`], ["pr", `${staffName("pr")} (press)`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setBy(id)} className={cn("rounded-full border px-2.5 py-0.5 transition-colors", by === id ? "border-white/40 bg-white/[0.08] text-fg" : "border-line-strong text-muted hover:text-fg")}>{label}</button>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-neg/25 bg-neg/[0.06] p-4">
        <div className="flex items-baseline justify-between"><Label className="text-neg">Risk of backlash</Label><span className="tnum font-mono text-[20px] font-medium text-neg">{pct}%</span></div>
        <Meter value={pct} color="var(--color-neg)" className="mt-2.5 h-1.5" />
        <ul className="mt-3 space-y-1 text-[11.5px]">
          {reasons.map((r) => (
            <li key={r.text} className="flex justify-between gap-3"><span className="text-soft">{r.text}</span><span className={cn("tnum shrink-0 font-mono", r.v > 0 ? "text-neg" : "text-pos")}>{r.v > 0 ? "+" : "−"}{Math.round(Math.abs(r.v) * 100)}</span></li>
          ))}
        </ul>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="primary" onClick={close}>Hold off</Button>
        <Button onClick={close}>Ask for a positive version</Button>
        <Button variant="ghost" className="ml-auto text-neg hover:text-neg" disabled={adsLeft < 8000} title={adsLeft < 8000 ? "Not enough left in today's Ads budget. Raise tomorrow's in the top bar." : undefined} onClick={() => run(by)}>Run it</Button>
      </div>
    </div>
  );
}

function Election() {
  // District-by-district result from the engine (engine/election.ts), revealed on the map first.
  const result = useGame((s) => s.election?.result);
  if (!result) return null;
  const won = result.won;
  const rows: [string, number, string][] = result.ranked.map((id) => [fullNameOf(id), result.pct[id], colorOf(id)]);
  const r = result.runoff;
  return (
    <div className="relative p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 opacity-30 [mask-image:linear-gradient(black,transparent)]"><ShaderBackground /></div>
      <Label className="relative">Election night · polls closed</Label>
      <h2 className="relative mt-3 font-serif text-[56px] leading-none tracking-tight">{r && !won && (r.a === ME.id || r.b === ME.id) ? `${ME.short} loses the runoff.` : won ? (r ? `${ME.short} wins the runoff.` : `${ME.short} wins.`) : `${ME.short} concedes.`}</h2>
      {r && <p className="relative mt-2 text-[13px] text-muted">Nobody reached {ACTIVE.threshold}%, so {nameOf(r.a)} and {nameOf(r.b)} met in a runoff: {nameOf(r.a)} {r.pct[r.a]}%, {nameOf(r.b)} {r.pct[r.b]}% (simulated).</p>}
      <div className="mt-8 space-y-4">
        {rows.map(([n, v, c], i) => (
          <div key={n}>
            <div className="flex justify-between text-[13px]"><span>{n}</span><span className="tnum font-mono">{v}%</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="h-full rounded-full" style={{ background: c }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 1.4, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">
        {ME.short} carried {result.districtsWon[ME.id] ?? 0} of 59 districts ({result.ranked.filter((id) => id !== ME.id).map((id) => `${nameOf(id)} ${result.districtsWon[id] ?? 0}`).join(", ")}) with {(result.totals[ME.id] ?? 0).toLocaleString("en-US")} votes. Turnout starts from the real 2025 count in each district and rose where your field work was strongest.
      </p>
      {ACTIVE.kind === "real" && (
        <div className="relative mt-6 flex justify-end">
          <Button variant="primary" onClick={() => useGame.setState({ overlay: "debrief" })}>See how it really went</Button>
        </div>
      )}
    </div>
  );
}

// Staff speak up unprompted. Clicking a message opens that person in the war room.
function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const staff = useGame((s) => s.staff);
  const dismiss = useGame((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-[330px] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const p = staff.find((x) => x.id === t.staff)!;
          return <ToastCard key={t.id} name={p.name ?? p.role} role={p.onRecord ? `${p.role} · real person, simulated words` : p.role} text={t.text} onClose={() => dismiss(t.id)} onOpen={() => { dismiss(t.id); useGame.setState((s) => ({ view: "war", person: t.staff, unread: { ...s.unread, [t.staff]: false } })); }} />;
        })}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ name, role, text, onClose, onOpen }: { name: string; role: string; text: string; onClose: () => void; onOpen: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto flex cursor-pointer gap-3 rounded-xl border border-line-strong bg-raised p-3 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)]"
      onClick={onOpen}
    >
      <Avatar name={name} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2"><span className="text-[13px] font-medium">{name}</span><span className="truncate text-[11px] text-faint">{role}</span></div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-soft">{text}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Dismiss" className="grid size-5 shrink-0 place-items-center rounded text-faint transition-colors hover:text-fg"><X className="size-3.5" /></button>
    </motion.div>
  );
}
