"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, Lock, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DISTRICTS } from "@/lib/geo";
import { useGame, type Draft } from "@/lib/store";
import { cn, hash } from "@/lib/util";
import { Avatar, Button, Dialog, Label, Meter, Tag } from "./ui";
import { ShaderBackground } from "./ui21/dithering";

export function Overlays() {
  const overlay = useGame((s) => s.overlay);
  const open = useGame((s) => s.open);
  const close = () => open(null);
  return (
    <>
      <Dialog open={overlay === "paper"} onClose={close} className="max-w-[720px]"><Paper close={close} /></Dialog>
      <Dialog open={overlay === "manifesto"} onClose={close} side="right"><Manifesto /></Dialog>
      <Dialog open={overlay === "calendar"} onClose={close} className="max-w-[880px]"><Calendar /></Dialog>
      <Dialog open={overlay === "tactic"} onClose={close} className="max-w-[440px]"><Tactic close={close} /></Dialog>
      <Dialog open={overlay === "election"} onClose={close} className="max-w-[520px]"><Election /></Dialog>
      <Toasts />
    </>
  );
}

// The morning paper: how events and yesterday's results reach the player.
function Paper({ close }: { close: () => void }) {
  const day = useGame((s) => s.day);
  const poll = useGame((s) => s.poll);
  const factions = useGame((s) => s.factions);
  // Lead story is built from a real district's top 311 complaint.
  const lead = DISTRICTS.filter((d) => !d.park && d.issues.length).sort((a, b) => hash(b.cd, day) - hash(a.cd, day))[0];
  const [issue, count] = lead.issues[0];
  const up = factions.filter((f) => f.feel >= 58), down = factions.filter((f) => f.feel <= 40);
  const rows: [string, number, string][] = [["Hale", poll.hale, "rgb(255 255 255 / .45)"], ["Cole", poll.cole, "var(--color-warm)"], ["Brandt", poll.brandt, "rgb(255 255 255 / .25)"]];
  return (
    <div className="overflow-y-auto px-10 pt-9 pb-8">
      <div className="tnum flex justify-between pr-8 font-mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
        <span>Day {day}</span><span>{30 - day} days to the election</span><span>Morning edition</span>
      </div>
      <h1 className="mt-4 border-y border-line-strong py-3 text-center font-serif text-[44px] leading-none tracking-tight">The Five Borough Ledger</h1>

      <div className="mt-7 flex items-center gap-2"><Label>Lead story</Label><Tag kind="real" /></div>
      <h2 className="mt-2 font-serif text-[32px] leading-[1.08] tracking-tight">
        <span className="capitalize">{issue.toLowerCase()}</span> complaints pile up in {lead.name}
      </h2>
      <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-soft">
        Residents filed {count.toLocaleString("en-US")} reports in a month and say nobody at City Hall is listening. Both leading campaigns were asked what they would do about it.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={close}>Respond today</Button>
        <Button size="sm" variant="ghost" onClick={close}>Let it pass</Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6">
        <article>
          <Label>The opposition</Label>
          <h3 className="mt-1.5 font-serif text-[21px] leading-tight">Hale promises 2,000 new officers</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">The front-runner drew applause from homeowners in southern Brooklyn. Seniors are paying attention.</p>
        </article>
        <article>
          <Label>Your campaign</Label>
          <h3 className="mt-1.5 font-serif text-[21px] leading-tight">Cole canvass reaches 1,400 doors</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">Volunteers in western Queens credited the field team. The results of what you did yesterday are reported here.</p>
        </article>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-line pt-6">
        <div>
          <Label>The poll</Label>
          <div className="mt-3 space-y-2.5">
            {rows.map(([n, v, c]) => (
              <div key={n} className="flex items-center gap-3 text-[13px]">
                <span className="w-12 text-soft">{n}</span><Meter value={v * 2} color={c} className="flex-1" /><span className="tnum w-8 text-right font-mono text-[12px]">{v}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label>Who likes Cole</Label>
          <div className="mt-3 space-y-2 text-[13px]">
            <div className="flex gap-2.5"><ArrowUp className="mt-0.5 size-3.5 shrink-0 text-warm" /><span className="text-soft">{up.map((f) => f.name).join(", ")}</span></div>
            <div className="flex gap-2.5"><ArrowDown className="mt-0.5 size-3.5 shrink-0 text-cool" /><span className="text-soft">{down.map((f) => f.name).join(", ")}</span></div>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-end"><Button variant="primary" onClick={close}>Start the day</Button></div>
    </div>
  );
}

// Policy lives in one document. Planks are suggested or reshaped from what the player types, and they are permanent.
function Manifesto() {
  const planks = useGame((s) => s.manifesto);
  const factions = useGame((s) => s.factions);
  const commit = useGame((s) => s.commitPlank);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const name = (id: string) => factions.find((f) => f.id === id)!.name;

  // model: stand-in for the real call that turns a rough idea into workable policy and scores who it helps and hurts.
  const shape = () => {
    const t = text.trim();
    if (!t) return;
    const order = [...factions].sort((a, b) => hash(t.length, a.size) - hash(t.length, b.size));
    setDraft({ text: `${t[0].toUpperCase()}${t.slice(1).replace(/\.$/, "")}, phased in over two years and paid for from a named budget line.`, up: order.slice(0, 2).map((f) => f.id), down: order.slice(-1).map((f) => f.id) });
  };

  return (
    <>
      <div className="border-b border-line px-7 pt-8 pb-6">
        <Label>Manifesto</Label>
        <h2 className="mt-2 font-serif text-[34px] leading-none tracking-tight">What Cole stands for</h2>
        <p className="mt-3 text-[13px] text-muted">Once a plank goes in, it cannot be removed. Speeches, ads and door scripts are written from this.</p>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-7 py-3">
        {planks.map((p, i) => (
          <motion.li key={p} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 border-b border-line py-4 last:border-b-0">
            <span className="tnum font-mono text-[11px] leading-[22px] text-faint">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1 text-[14px] leading-[22px]">{p}</span>
            <Lock className="mt-1 size-3.5 shrink-0 text-faint" />
          </motion.li>
        ))}
      </ol>
      <div className="border-t border-line p-5">
        <AnimatePresence mode="wait" initial={false}>
          {draft ? (
            <motion.div key="draft" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-line-strong bg-raised p-4">
              <div className="flex items-center justify-between"><Label>Suggested version</Label><span className="text-[10.5px] text-faint">Placeholder, not a model yet</span></div>
              <p className="mt-2 text-[14px] leading-relaxed">{draft.text}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {draft.up.map((id) => <span key={id} className="rounded-full border border-pos/25 px-2 py-0.5 text-[11.5px] text-pos">Pleases {name(id).toLowerCase()}</span>)}
                {draft.down.map((id) => <span key={id} className="rounded-full border border-neg/25 px-2 py-0.5 text-[11.5px] text-neg">Angers {name(id).toLowerCase()}</span>)}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="primary" onClick={() => { commit(draft); setDraft(null); setText(""); }}><Lock className="size-3.5" />Add permanently</Button>
                <Button variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Label>Propose a policy</Label>
              <div className="mt-2 rounded-xl border border-line-strong bg-raised p-2 transition-colors focus-within:border-white/30">
                <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Say what you want in your own words, e.g. make buses free" className="w-full resize-none bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-faint" />
                <div className="flex justify-end"><Button size="sm" variant="primary" disabled={!text.trim()} onClick={shape}><Sparkles className="size-3.5" />Shape into policy</Button></div>
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

// A deceptive tactic can pay off. The risk is shown before you commit, and it decides whether it backfires.
function Tactic({ close }: { close: () => void }) {
  const run = useGame((s) => s.runTactic);
  const result = useGame((s) => s.tacticResult);
  if (result)
    return (
      <div className="p-7">
        <Label className={result === "backfired" ? "text-neg" : "text-pos"}>{result === "backfired" ? "It backfired" : "It worked, this time"}</Label>
        <h2 className="mt-2 font-serif text-[30px] leading-tight tracking-tight">{result === "backfired" ? "The Ledger traced the mailer to you" : "Nobody has traced it yet"}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-soft">{result === "backfired" ? "Front-page story tomorrow. Seniors down 6. Jo Park has resigned as Press Secretary." : "Seniors up 3. The risk does not go away: it can still surface before election day."}</p>
        <div className="mt-6 flex justify-end"><Button variant="primary" onClick={close}>Continue</Button></div>
      </div>
    );
  return (
    <div className="p-7">
      <div className="flex items-center gap-2.5"><Avatar name="Leo Santos" size={26} /><span className="text-[12.5px] text-muted">Leo Santos proposes</span></div>
      <h2 className="mt-4 font-serif text-[30px] leading-[1.1] tracking-tight">A misleading mailer on Hale&apos;s tax record</h2>
      <dl className="mt-5 space-y-2 text-[13px]">
        <div className="flex justify-between"><dt className="text-muted">Cost</dt><dd className="tnum font-mono">$8,000</dd></div>
        <div className="flex justify-between"><dt className="text-muted">If it works</dt><dd className="text-pos">+3 with seniors</dd></div>
        <div className="flex justify-between"><dt className="text-muted">If exposed</dt><dd className="text-neg">−6 with seniors, a resignation</dd></div>
      </dl>
      <div className="mt-5 rounded-xl border border-neg/25 bg-neg/[0.06] p-4">
        <div className="flex items-baseline justify-between"><Label className="text-neg">Risk of backfire</Label><span className="tnum font-mono text-[20px] font-medium text-neg">78%</span></div>
        <Meter value={78} color="var(--color-neg)" className="mt-2.5 h-1.5" />
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="primary" onClick={close}>Decline</Button>
        <Button onClick={close}>Ask for an honest version</Button>
        <Button variant="ghost" className="ml-auto text-neg hover:text-neg" onClick={run}>Run it</Button>
      </div>
    </div>
  );
}

function Election() {
  const poll = useGame((s) => s.poll);
  const undecided = 100 - poll.cole - poll.hale - poll.brandt;
  const cole = poll.cole + Math.round(undecided * 0.5), hale = poll.hale + Math.round(undecided * 0.4), brandt = 100 - cole - hale;
  const won = cole > hale;
  const rows: [string, number, string][] = [["Adrian Cole", cole, "var(--color-warm)"], ["Victoria Hale", hale, "rgb(255 255 255 / .45)"], ["Naomi Brandt", brandt, "rgb(255 255 255 / .22)"]];
  return (
    <div className="relative p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 opacity-30 [mask-image:linear-gradient(black,transparent)]"><ShaderBackground /></div>
      <Label className="relative">Election night · polls closed</Label>
      <h2 className="relative mt-3 font-serif text-[56px] leading-none tracking-tight">{won ? "Cole wins." : "Cole concedes."}</h2>
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
      <p className="mt-8 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">Next: the map fills in district by district, then the debrief shows what you did, what it cost, and what the research says about it.</p>
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
          return <ToastCard key={t.id} name={p.name ?? p.role} role={p.role} text={t.text} onClose={() => dismiss(t.id)} onOpen={() => { dismiss(t.id); useGame.setState((s) => ({ view: "war", person: t.staff, unread: { ...s.unread, [t.staff]: false } })); }} />;
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
