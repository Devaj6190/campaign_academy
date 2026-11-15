"use client";

import { create } from "zustand";
import { FACTIONS_2013 } from "../cases/mayor2013-factions";
import { factionWork, useCase, worldNow } from "../cases/store";
import { resolve } from "../engine/resolve";
import { apply, appearancesToday, DAILY, feed, snapshot } from "../staff/run";
import { useStaff } from "../staff/store";
import { useGame } from "../store";
import { buildEdition, factsOf, surnameOf, type Edition, type Story } from "./edition";
import type { WriteResult } from "./newsroom";
import { rulesStances, STANCE, type Stance, type StanceResult } from "./stances";

// Puts each morning's edition out and keeps every one in the archive. The template goes out at once; the newsroom's
// copy of the simulated stories replaces it when it arrives.

type PaperState = {
  open: boolean;
  /** This morning's edition is out and the student has neither opened it nor put it aside. The notice glows and the clock waits. */
  unread: boolean;
  editions: Edition[];
  /** The edition on screen, by id; null is the latest. */
  showing: number | null;
  set: (open: boolean) => void;
  show: (id: number | null) => void;
};

let uid = 1;

export const usePaper = create<PaperState>((set) => ({
  open: false,
  unread: false,
  editions: [],
  showing: null,
  set: (open) => {
    if (open) publish();
    set({ open, showing: null, ...(open ? { unread: false } : {}) });
  },
  show: (showing) => set({ showing }),
}));

// Restarting the case rewinds the clock and empties the work layer: the old archive belongs to another campaign.
useCase.subscribe((s, p) => {
  if (s.at < p.at || s.work.length < p.work.length || s.date < p.date) usePaper.setState({ editions: [], showing: null, unread: false });
});

const patch = (id: number, fn: (e: Edition) => Edition) => usePaper.setState((s) => ({ editions: s.editions.map((e) => (e.id === id ? fn(e) : e)) }));

/** A morning with news: the edition goes out and waits to be read. It does not open by itself. */
export function announce() {
  publish();
  // With the paper already open the new edition is on screen: there is nothing to announce.
  usePaper.setState({ unread: !usePaper.getState().open });
}

/** Put out this morning's edition, once per day. */
export function publish() {
  const { editions } = usePaper.getState();
  const s = useCase.getState();
  if (editions.some((e) => e.date === s.date)) return;
  const { c, w } = worldNow();
  const ed = buildEdition({ c, w, today: s.date, step: s.at, work: s.work, since: editions.at(-1)?.date ?? null, groupWork: factionWork(), id: uid++, lastPoll: editions.findLast((e) => e.polled)?.date ?? null });
  usePaper.setState({ editions: [...editions, ed] });
  void rewrite(ed);
}

async function rewrite(ed: Edition) {
  try {
    const { c } = worldNow();
    const res = await fetch("/api/paper/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: factsOf(ed, c) }) });
    const out = (await res.json()) as WriteResult;
    if (out.mode !== "live") return;
    const pick = <T extends Story>(mine: T, theirs?: Story | null): T => (theirs ? { ...mine, headline: theirs.headline, body: theirs.body } : mine);
    patch(ed.id, (e) => ({ ...e, mode: "live", campaign: pick(e.campaign, out.stories.campaign), rivals: pick(e.rivals, out.stories.rivals), voices: e.voices.map((v, i) => pick(v, out.stories.voices?.[i])) }));
  } catch (err) {
    console.warn("[paper] newsroom unavailable, template stands:", err);
  }
}

/** Ask the comms shop for three ways to answer this edition's lead, once. The rules answer when there is no key. */
export async function draftStances(e: Edition) {
  if (!e.lead || e.stances) return;
  const { c } = worldNow();
  const me = c.candidates.find((x) => x.id === c.follow);
  try {
    const res = await fetch("/api/paper/stances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ story: e.lead.text, candidate: me?.name ?? "the candidate", record: me?.about.map((x) => x.text) ?? [] }) });
    const out = (await res.json()) as StanceResult;
    if (!out.stances?.length) throw new Error("no stances");
    patch(e.id, (x) => ({ ...x, stances: out.stances }));
  } catch (err) {
    console.warn("[paper] stances unavailable, rules instead:", err);
    patch(e.id, (x) => ({ ...x, stances: rulesStances({ story: e.lead!.text, candidate: me?.name ?? "the candidate", record: [] }).stances }));
  }
}

/** A group's name mid-sentence: boroughs, races and religions keep their capitals ("Queens", "Black voters"); the rest do not. */
const groupName = (id: string, name: string) => (["Borough", "Race", "Religion"].includes(FACTIONS_2013.find((f) => f.id === id)?.kind ?? "") ? name : name.toLowerCase());

/** The Communications Director's post: the hand-off target. */
const COMMS = "com";

/** The front page can be answered once: the candidate speaks, Comms handles it, or the campaign lets it pass. */
export function respond(e: Edition, choice: "respond" | "staff" | "pass", pick?: { stance: Stance }): string {
  if (!e.lead || e.decision) return "";
  const { c } = worldNow();
  const you = c.candidates.find((x) => x.id === c.follow)?.name ?? "The candidate";
  const story = e.lead.text.split(/(?<=\.) /)[0].replace(/\.$/, "");
  const target = e.weak[0];
  let answer: string;

  if (choice === "respond") {
    if (appearancesToday() >= DAILY) return `${you} has no time left today. Hand it to Comms instead.`;
    if (!pick) return "Choose how to answer first.";
    // The stance decides who it reaches: its first group takes the main effect.
    const { stance } = pick;
    const group = stance.helps[0];
    const fx = resolve(snapshot(), "candidate", "rapid_response", { faction: group }, { quality: 1, seed: e.id * 977 + appearancesToday(), load: 1 });
    if (fx.cost > worldNow().w.budget) return "The campaign does not have the money for that.";
    // The engine sizes the answer in that group; the stance spreads a share of it to the other groups it reaches and
    // takes a larger share from the groups it puts off.
    const main = fx.factions[group] ?? 0;
    const factions = { ...fx.factions };
    for (const h of stance.helps) if (h !== group) factions[h] = (factions[h] ?? 0) + Math.round(main * STANCE.helps * 10) / 10;
    for (const a of stance.annoys) if (a !== group) factions[a] = (factions[a] ?? 0) - Math.round(main * STANCE.annoys * 10) / 10;
    apply({ ...fx, factions, summary: `${you} answered the morning paper's lead ("${story}"): ${stance.says}` }, STANCE.citywide);
    feed("candidate", `The candidate answered the Ledger's front page: ${stance.label}.`);
    answer = `${you} answered it: ${stance.label.charAt(0).toLowerCase()}${stance.label.slice(1)}.`;
  } else if (choice === "staff") {
    const order = `Respond to this morning's front page: "${story}". ${target ? `Make sure ${groupName(target.id, target.name)} hear our side.` : ""}`.trim();
    useStaff.setState((s) => ({ draft: { ...s.draft, [COMMS]: order } }));
    useGame.setState({ view: "war", person: COMMS });
    usePaper.setState({ open: false });
    answer = "Handed to the Communications Director.";
  } else {
    // Silence is a move too: the rival campaigns read the work layer and plan against it.
    useCase.getState().addWork({ by: c.follow, label: "Let the story pass", note: `The ${surnameOf(you)} campaign declined to answer "${story}".`, cost: 0, raised: 0, poll: {}, groups: {}, factions: {}, districts: {} });
    answer = "The campaign let it pass. The rivals will have noticed.";
  }
  patch(e.id, (x) => ({ ...x, decision: choice, answer }));
  return answer;
}
