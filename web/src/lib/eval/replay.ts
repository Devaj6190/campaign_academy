import { platformAt } from "../cases/platform";
import { currentCase, useCase } from "../cases/store";
import { realPath, type Case, type Decision } from "../cases/types";
import { profileOf } from "../engine/resolve";
import { assign, memoDecision, type Memo, type MemoRequest } from "../staff/memo";
import { writers } from "../staff/memos";
import { snapshot } from "../staff/run";
import { describeWorld, PLACES, type Snapshot } from "../staff/world";
import { hash } from "../util";
import { CHANGED, isDropped, mask, recognised, type Condition } from "./conditions";
import { decideLive, decideRules, optionLines, probe, recall, system, type Card, type CardOption, type Choice, type Trace } from "./decider";
import { HELD_OUT } from "./heldout";
import { factsBefore, PEOPLE, personNamed, type Person } from "./people";

// The replay run (#28): each decision on its own, from the real history up to its date. The campaign arrives at the
// decision having made the real campaign's earlier choices, with no staff work and no rival moves, so every run sees
// the same world and only the condition changes. Cards are built one at a time (they read the shared case store),
// then the agents decide in parallel.

export type Kind = "case" | "adviser" | "heldout" | "free";
export type Rec = {
  kind: Kind; cond: Condition; decision: string; person: string; n: number;
  chosen: string | null; taken: string; onReal: boolean | null;
  /** changed only: the 2013 choice a reasoning agent should move away from. */
  away?: string;
  order: string[]; why: string; read: string[]; mode: "live" | "rules"; ms: number;
  memos?: { director: string; option: string }[];
  probe?: string; recognised?: boolean;
  dropped?: string[];
  prompt: { system: string; user: string };
};
export type ReplayOptions = { n: number; conds: Condition[]; kinds: Kind[]; live: boolean; concurrency?: number; only?: string[]; tag: string; onRecord: (r: Rec) => void; log?: (s: string) => void };

const KEYS = "ABCDEFG";
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const seedOf = (id: string) => [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** The same shuffle for every condition of one run of one decision, so conditions differ only in what they change. */
function shuffle<T>(xs: T[], n: number, id: string): T[] {
  return xs.map((x, i) => ({ x, r: hash(n * 7919 + i, seedOf(id)) })).sort((a, b) => a.r - b.r).map((e) => e.x);
}

/** Put the case store where the real campaign stood on arriving at decision `i`. */
function arriveAt(c: Case, i: number) {
  const real = realPath(c);
  const picks = Object.fromEntries(c.decisions.slice(0, i).map((d) => [d.id, { option: real[d.id] ?? d.options[0].id }]));
  useCase.getState().restart();
  useCase.setState({ picks, at: i + 1, step: i + 1, date: c.decisions[i].date });
}

/** The two staff memos on a decision, built the way the game builds them (lib/staff/memos.ts writeMemos), through the
 *  game's own memo route. Duplicated here rather than changed there, so a changed-facts card gets memos about its own
 *  situation. */
async function memosFor(d: Decision, i: number): Promise<Memo[]> {
  const w = snapshot({ at: i + 1, date: d.date });
  const campaign = describeWorld(w);
  const decision = memoDecision(d);
  decision.situation = decision.situation.filter((t) => !isDropped(d.id, t)); // the memo must not repeat a line the card leaves out
  const out: Memo[] = [];
  for (const p of writers(d)) {
    const req: MemoRequest = {
      decision,
      option: assign(d.id, p.id, decision.options, out[0]?.option),
      director: { id: p.id, role: p.role, name: p.name, onRecord: p.onRecord, good: p.good, weak: p.weak },
      voice: profileOf(w, p.id).voice,
      campaign,
      memory: [],
    };
    const res = await fetch("/api/staff/memo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    out.push((await res.json()) as Memo);
  }
  return out;
}

function worldText(w: Snapshot) {
  const poll = Object.entries(w.poll).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${w.names[id] ?? id} ${Math.round(v)}`).join(", ");
  return {
    summary: `The latest poll: ${poll}. Left to spend under the cap: ${usd(w.cash)}.`,
    groups: w.factions.map((f) => `${f.name}: ${Math.round(f.feel)}% support you; ${f.size}% of likely voters`).join("\n"),
    map: PLACES.map((p) => `${p.name} (${p.boro}): ${Math.round(w.sent[p.cd] ?? 0)}% support you`).join("\n"),
  };
}

const paperBefore = (c: Case, date: string) => c.press.filter((p) => p.date < date).sort((a, b) => b.date.localeCompare(a.date)).map((p) => `${p.date}, ${p.outlet}: ${p.summary}`).join("\n");

const personOf = (p: Person, date: string) => ({ name: p.name, role: p.role, facts: factsBefore(p, date).map((x) => x.text) });

function masked(card: Card, p: Person): Card {
  const m = (s?: string) => (s === undefined ? s : mask(s));
  return {
    ...card,
    today: mask(card.today),
    title: mask(card.title),
    person: { name: p.masked.name, role: p.masked.role, facts: card.person.facts.map(mask) },
    body: mask(card.body),
    options: card.options.map((o) => ({ ...o, label: mask(o.label), detail: mask(o.detail), up: o.up?.map(mask), down: o.down?.map(mask) })),
    read: { map: m(card.read.map), groups: m(card.read.groups), paper: m(card.read.paper) },
  };
}

/** A case decision's card for one run, as the student sees it on the day. */
export function caseCard(c: Case, d: Decision, i: number, n: number, memos: Memo[], who: Person, ask: Card["ask"], chips: boolean): { card: Card; dropped: string[] } {
  const w = snapshot({ at: i + 1, date: d.date });
  const t = worldText(w);
  const keep = (x: { text: string }) => !isDropped(d.id, x.text);
  const dropped = [...(d.since?.notes ?? []), ...d.situation].filter((x) => !keep(x)).map((x) => x.text);
  const order = shuffle(d.options, n, d.id);
  const options: CardOption[] = order.map((o, k) => {
    const cost = -(o.effect.budget ?? 0);
    return { key: KEYS[k], id: o.id, label: o.label, detail: o.detail + (cost > w.cash ? " (More than you have left.)" : ""), cost: cost > 0 ? cost : undefined, up: chips ? o.preview.up : undefined, down: chips ? o.preview.down : undefined };
  });
  const key = (id: string) => options.find((o) => o.id === id)?.key ?? "?";
  const platform = platformAt(c, i + 1, useCase.getState().picks).map((p) => `- ${p.text}`);
  const staff = (id: string) => w.staff.find((p) => p.id === id);
  const body = [
    d.since?.notes.filter(keep).length ? `Since your last decision:\n${d.since.notes.filter(keep).map((x) => `- ${x.text}`).join("\n")}` : "",
    `The situation:\n${d.situation.filter(keep).map((x) => `- ${x.text}`).join("\n")}`,
    [`${d.constraints.daysLeft} days to the primary.`, ...(d.constraints.notes ?? [])].join(" "),
    t.summary,
    platform.length ? `Your platform so far:\n${platform.join("\n")}` : "",
    memos.length ? `Memos from your staff (each was asked to argue for one option):\n${memos.map((m) => { const p = staff(m.director); return `- ${p ? `${p.name}, ${p.role}` : m.director}, for ${key(m.option)}: ${m.headline ? `${m.headline}. ` : ""}${m.text}`; }).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  return { card: { decision: d.id, today: d.date, title: d.title, person: personOf(who, d.date), ask, body, options, read: { map: t.map, groups: t.groups, paper: paperBefore(c, d.date) } }, dropped };
}

type Job = { rec: Omit<Rec, "chosen" | "onReal" | "why" | "read" | "mode" | "ms" | "prompt" | "order">; card: Card; who: Person; recallAs?: { who: string; date: string } };

export async function replay(o: ReplayOptions): Promise<Rec[]> {
  const c = currentCase(useCase.getState().caseId);
  const log = o.log ?? (() => {});
  const jobs: Job[] = [];
  const want = (id: string) => !o.only?.length || o.only.includes(id);
  const me = PEOPLE[c.follow];

  for (let n = 0; n < o.n; n++) {
    for (const [i, d] of c.decisions.entries()) {
      if (!want(d.id) || !(o.kinds.includes("case") || o.kinds.includes("adviser"))) continue;
      arriveAt(c, i);
      const needsMemos = o.conds.some((x) => x !== "recall" && x !== "changed");
      const memos = needsMemos ? await memosFor(d, i) : [];
      const memoRecs = memos.map((m) => ({ director: m.director, option: m.option }));
      log(`built ${d.id} run ${n + 1}`);
      for (const cond of o.conds) {
        if (o.kinds.includes("case")) {
          let d2 = d, mm = memos;
          if (cond === "changed") {
            d2 = { ...d, since: undefined, situation: CHANGED[d.id].situation.map((text) => ({ text, sources: [] })) };
            arriveAt(c, i);
            mm = await memosFor(d2, i);
          }
          const { card, dropped } = caseCard(c, d2, i, n, cond === "recall" ? [] : mm, me, "decide", cond !== "nochips");
          jobs.push({ rec: { kind: "case", cond, decision: d.id, person: me.id, n, taken: d.taken ?? "", away: cond === "changed" ? CHANGED[d.id].away : undefined, memos: cond === "recall" ? undefined : mm.map((m) => ({ director: m.director, option: m.option })), dropped }, card: cond === "masked" ? masked(card, me) : card, who: me, recallAs: cond === "recall" ? { who: `${me.name}'s campaign`, date: d.date } : undefined });
        }
        // Advisers: the record names who argued for what. Only the card and masked conditions apply.
        if (o.kinds.includes("adviser") && (cond === "card" || cond === "masked")) {
          for (const a of d.advice ?? []) {
            const who = personNamed(a.name);
            if (!who) continue;
            const { card, dropped } = caseCard(c, d, i, n, memos, who, "advise", true);
            jobs.push({ rec: { kind: "adviser", cond, decision: d.id, person: who.id, n, taken: a.argues, memos: memoRecs, dropped }, card: cond === "masked" ? masked(card, who) : card, who });
          }
        }
      }
    }
    // Held out: scored once, after tuning is frozen (the script refuses this kind without --frozen).
    if (o.kinds.includes("heldout")) {
      for (const h of HELD_OUT) {
        if (!want(h.id)) continue;
        const who = PEOPLE[h.person];
        const order = shuffle(h.options, n, h.id);
        const options = order.map((x, k) => ({ key: KEYS[k], id: x.id, label: x.label, detail: x.detail }));
        const card: Card = { decision: h.id, today: h.date, title: h.title, person: personOf(who, h.date), ask: "decide", body: `The situation:\n${h.situation.map((x) => `- ${x.text}`).join("\n")}`, options, read: { paper: paperBefore(c, h.date) } };
        for (const cond of o.conds) {
          if (cond === "nochips" || cond === "changed") continue; // held-out cards have no chips, and no changed version
          jobs.push({ rec: { kind: "heldout", cond, decision: h.id, person: who.id, n, taken: h.taken }, card: cond === "masked" ? masked(card, who) : card, who, recallAs: cond === "recall" ? { who: who.name, date: h.date } : undefined });
        }
      }
    }
  }
  useCase.getState().restart();
  log(`${jobs.length} decisions to make`);

  const out: Rec[] = [];
  let next = 0, done = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      const trace: Trace = { tags: ["eval", o.tag, j.rec.kind, j.rec.cond], metadata: { decision: j.rec.decision, person: j.rec.person, run: j.rec.n, condition: j.rec.cond, kind: j.rec.kind } };
      let ch: Choice;
      let answer: string | undefined;
      try {
        ch = j.recallAs ? (o.live ? await recall(j.card, j.recallAs.who, j.recallAs.date, trace) : { key: null, why: "No key: recall needs the model.", read: [], mode: "rules", ms: 0 })
          : o.live ? await decideLive(j.card, trace) : decideRules(j.card, j.rec.cond !== "nochips");
        if (j.rec.cond === "masked") answer = o.live ? await probe(j.card, trace) : undefined;
      } catch (err) {
        ch = { key: null, why: `Error: ${(err as Error).message}`, read: [], mode: o.live ? "live" : "rules", ms: 0 };
      }
      const chosen = j.card.options.find((x) => x.key === ch.key)?.id ?? null;
      const r: Rec = {
        ...j.rec, chosen, onReal: chosen === null ? null : chosen === j.rec.taken, order: j.card.options.map((x) => x.id),
        why: ch.why, read: ch.read, mode: ch.mode, ms: ch.ms,
        ...(answer !== undefined ? { probe: answer, recognised: recognised(answer) } : {}),
        prompt: { system: j.recallAs ? "" : system(j.card), user: `${j.card.title}\n\n${j.card.body}\n\nOptions:\n${optionLines(j.card, j.rec.cond !== "nochips")}` },
      };
      out.push(r);
      o.onRecord(r);
      log(`${++done}/${jobs.length} ${r.kind} ${r.cond} ${r.decision} → ${r.chosen ?? "none"}${r.onReal ? " (real)" : ""}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, o.concurrency ?? 4) }, worker));
  return out;
}
