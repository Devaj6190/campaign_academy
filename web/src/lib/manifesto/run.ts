"use client";

import { effectOf } from "../engine/resolve";
import { ACTIVE, FRAMING, ME } from "../scenario";
import { profileFor } from "../staff/roster";
import { feed } from "../staff/run";
import { useStaff } from "../staff/store";
import { useGame } from "../store";
import { canAdd, effectsOf, rulesShape, type ShapeRequest, type Shaped } from "./rules";

// The manifesto in the browser: ask the Policy Director (or a staffer) to shape an idea, then commit it.

const director = () => {
  const p = useGame.getState().staff.find((x) => x.id === "pol" && x.name);
  if (!p) return null;
  const prof = useStaff.getState().hires.pol ?? profileFor("pol", p.role);
  return { name: p.name!, voice: prof.voice, effect: prof.effect };
};

export async function shapeIdea(idea: string, focus?: string): Promise<Shaped> {
  const g = useGame.getState();
  const d = director();
  const req: ShapeRequest = {
    idea,
    focus,
    factions: g.factions.map((f) => ({ id: f.id, name: f.name, values: f.values, dislikes: f.dislikes })),
    record: ACTIVE.story.record.map((r) => r.text),
    planks: g.manifesto,
    candidate: ME.name,
    framing: FRAMING,
    director: d ? { name: d.name, voice: d.voice } : null,
  };
  try {
    const res = await fetch("/api/manifesto/shape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Shaped;
  } catch {
    return rulesShape(req, d ? "pol" : "staff");
  }
}

/** Put a shaped plank in the platform for good. Returns why it can't, or null. */
export function commit(s: Shaped): string | null {
  const g = useGame.getState();
  const gate = canAdd(g.planks, g.day);
  if (!gate.ok) return `The next plank can go in on day ${gate.next}. A platform that changes every day reads as a weathervane.`;
  // A Policy Director's draft lands better than a generic one; a live draft better than a rough rules match.
  const d = director();
  const quality = (s.by === "pol" && d ? Math.min(1.3, 1 + (d.effect - 1) + 0.1) : 0.8) * (s.mode === "live" ? 1 : 0.85);
  const { factions, sent } = effectsOf(s, quality);
  useGame.setState((x) => ({ planks: [...x.planks, { text: s.text, day: x.day, by: s.by, serves: s.serves, offends: s.offends, tradeoff: s.tradeoff }], manifesto: [...x.manifesto, s.text] }));
  g.applyEffect(effectOf({ by: "manifesto", action: "plank", label: "Platform plank", summary: s.text, factions, sent }), "manifesto");
  if (s.by === "pol" && d) feed("pol", `${d.name.split(" ")[0]} shaped a new plank: ${s.text}`, "pos");
  return null;
}
