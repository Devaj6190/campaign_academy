"use client";

import { useState } from "react";
import { FACTIONS_2013 } from "@/lib/cases/mayor2013-factions";
import { longDate, useCase } from "@/lib/cases/store";
import { contradictions, type Reach, type Shaped } from "@/lib/manifesto/rules";
import { blocked, commit, shapeIdea, usePlanks } from "@/lib/manifesto/run";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/util";
import { Button, Label, Tag } from "./ui";

// The student's own planks, under the platform on record. They describe an idea; the Policy Director (or a staffer,
// while that post is vacant) turns it into a plank and says who it serves and who it costs; the student adopts it or not.

const groupName = (id: string) => FACTIONS_2013.find((f) => f.id === id)?.name ?? id;

function Reaches({ title, items, tone }: { title: string; items: Reach[]; tone: "pos" | "neg" }) {
  if (!items.length) return null;
  return (
    <div className="mt-2.5">
      <div className="text-[14px] text-muted">{title}</div>
      <ul className="mt-1 space-y-1">
        {items.map((r) => (
          <li key={r.faction} className="text-[14px] leading-relaxed text-soft"><span className={cn("mr-1.5 font-medium", tone === "pos" ? "text-pos" : "text-neg")}>{groupName(r.faction)}</span>{r.why}</li>
        ))}
      </ul>
    </div>
  );
}

export function PlankDesk() {
  const planks = usePlanks((s) => s.planks);
  useCase((s) => s.at);
  const hasDirector = useGame((s) => !!s.staff.find((p) => p.id === "pol")?.name);
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Shaped | null>(null);
  const [error, setError] = useState<string | null>(null);
  const no = blocked();
  const clash = contradictions(planks);

  const shape = async () => {
    if (!idea.trim() || busy) return;
    setBusy(true);
    setError(null);
    setDraft(await shapeIdea(idea.trim()));
    setBusy(false);
  };
  const adopt = () => {
    if (!draft) return;
    const why = commit(draft);
    if (why) return setError(why);
    setDraft(null);
    setIdea("");
  };

  return (
    <section>
      <div className="flex items-center gap-2"><Label className="text-[20px] leading-tight font-semibold text-gold-bright">Your additions to the platform</Label><Tag kind="sim" /></div>
      <p className="mt-2 max-w-[62ch] text-[16px] leading-relaxed text-soft">
        Describe a policy idea. {hasDirector ? "Your Policy Director" : "A staffer (the Policy Director post is vacant)"} shapes it into a plank and shows who it serves and who it costs. One plank between decisions.
      </p>

      {!!planks.length && (
        <ul className="mt-4 space-y-3">
          {planks.map((p) => (
            <li key={p.text} className="rounded-lg border border-line bg-raised p-3">
              <p className="text-[16px] leading-relaxed text-fg">{p.text}</p>
              <div className="mt-1 text-[14px] text-muted">Adopted {longDate(p.date)}</div>
              <Reaches title="Serves" items={p.serves} tone="pos" />
              <Reaches title="Costs" items={p.offends} tone="neg" />
            </li>
          ))}
        </ul>
      )}
      {!!clash.length && <p className="mt-3 text-[14px] text-warm">Your planks both serve and cost {clash.map(groupName).join(", ")}. An opponent will point that out.</p>}

      {no && !draft ? (
        <p className="mt-4 text-[14px] text-muted">{no}</p>
      ) : (
        <div className="mt-4">
          <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} placeholder="For example: paid sick leave for every worker in the city" aria-label="Your policy idea" className="w-full resize-none rounded-lg border border-line-strong bg-raised p-3 text-[16px] outline-none placeholder:text-faint focus:border-gold" />
          <Button className="mt-2" disabled={!idea.trim() || busy} onClick={shape}>{busy ? "Shaping it…" : draft ? "Shape it again" : "Shape it into a plank"}</Button>
        </div>
      )}

      {draft && (
        <div className="mt-4 rounded-lg border border-gold/50 bg-hover p-4">
          <div className="text-[14px] text-muted">Draft plank · {draft.mode === "live" ? (draft.by === "pol" ? "shaped by your Policy Director" : "shaped by a staffer") : "rough draft, matched on keywords"}</div>
          <p className="mt-1.5 text-[16px] leading-relaxed text-fg">{draft.text}</p>
          <Reaches title="Serves" items={draft.serves} tone="pos" />
          <Reaches title="Costs" items={draft.offends} tone="neg" />
          {!draft.serves.length && !draft.offends.length && <p className="mt-2 text-[14px] text-muted">No voter group is clearly served or cost by this as written. Adopting it changes nothing.</p>}
          {draft.tradeoff && <p className="mt-2.5 text-[14px] leading-relaxed text-muted">Trade-off: {draft.tradeoff}</p>}
          <p className="mt-2.5 text-[14px] text-faint">Who a plank serves is a judgment, not a poll result. It rests on what each group is likely to value, and on 2013 poll figures where those exist.</p>
          {error && <p className="mt-2 text-[14px] text-neg">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={adopt}>Adopt it</Button>
            <Button onClick={() => { setDraft(null); setError(null); }}>Discard</Button>
          </div>
        </div>
      )}
    </section>
  );
}
