import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { createDeepAgent } from "deepagents";
import { z } from "zod";
import { finished, run, tick, waiting } from "../cases/clock";
import { inRace, isRival, useRivals } from "../cases/rivals";
import { currentCase, useCase, worldNow } from "../cases/store";
import { useGame } from "../store";
import { useMemos, watchMemos } from "../staff/memos";
import { instruct, snapshot } from "../staff/run";
import { useStaff } from "../staff/store";
import { PLACES } from "../staff/world";
import { decideLive, decideRules, EVAL_MODEL, optionLines, system, type Trace } from "./decider";
import { factsBefore, PEOPLE } from "./people";
import { caseCard, type Rec } from "./replay";

// The free run (#28): the whole system on its own, briefing to election day, with no student. The campaigner agent
// plays de Blasio: once a week it gives its directors orders in plain language, and at each decision it decides from
// the card as the campaign actually stands. The staff, the rivals and the memos are the game's live agents, reached
// through its own API routes. It keeps going after the first choice that differs from 2013; the report splits
// agreement before and after that point. Vote share is recorded as context, never as the score.

export type FinalRec = { kind: "final"; n: number; poll: Record<string, number>; runoff: boolean; firstDifferent: string | null; orders: number; staffJobs: number; rivalMoves: number };
export type FreeOptions = { runs: number; live: boolean; tag: string; weekly?: number; orders?: number; onRecord: (r: Rec | FinalRec) => void; log?: (s: string) => void };

const STAFF0 = useStaff.getState();
const DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until `done()` or the time is up. The rivals and memos run in the background, as they do in the game. */
async function until(done: () => boolean, ms: number) { for (const t0 = Date.now(); !done() && Date.now() - t0 < ms; ) await sleep(250); }

function weekText(since: string) {
  const { c } = worldNow();
  const w = snapshot();
  const poll = Object.entries(w.poll).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => `${w.names[id]} ${Math.round(v)}`).join(", ");
  const directors = useGame.getState().staff.filter((p) => !p.boss && p.name);
  const reports = useStaff.getState().feed.filter((f) => f.date >= since).map((f) => `${f.date}: ${f.text}`).reverse().slice(-20);
  const rivals = useCase.getState().work.filter((x) => isRival(x.by) && x.date >= since).map((x) => `${x.date}: ${x.note ?? x.label}`);
  return {
    directors,
    body: `The latest poll: ${poll}. Left to spend under the cap: $${Math.round(w.cash).toLocaleString("en-US")}. ${w.daysLeft} days to the primary.
The candidate's calendar: ${w.booked.length ? w.booked.map((b) => `${b.date} ${b.label}`).join("; ") : "nothing booked"}.
Your directors: ${directors.map((p) => `${p.id} (${p.name}, ${p.role})`).join("; ")}.`,
    read: {
      map: PLACES.map((p) => `${p.name} (${p.boro}): ${Math.round(w.sent[p.cd] ?? 0)}% support you`).join("\n"),
      groups: w.factions.map((f) => `${f.name}: ${Math.round(f.feel)}% support you; ${f.size}% of likely voters`).join("\n"),
      paper: c.press.filter((p) => p.date < w.date).sort((a, b) => b.date.localeCompare(a.date)).map((p) => `${p.date}, ${p.outlet}: ${p.summary}`).join("\n"),
      staff: reports.join("\n") || "Nothing reported since last week.",
      rivals: rivals.join("\n") || "No moves seen since last week.",
    },
  };
}

/** The campaigner's week: read what it needs, then give up to `max` orders to its directors, or none. */
async function week(since: string, max: number, trace: Trace): Promise<{ to: string; text: string }[]> {
  const t = weekText(since);
  const me = PEOPLE.deblasio, today = useCase.getState().date;
  const orders: { to: string; text: string }[] = [];
  const reader = (name: string, body: string, about: string) => tool(async () => body, { name, description: about, schema: z.object({}) });
  const order = tool(
    async ({ to, text }) => {
      if (orders.length >= max) return `No more orders this week (limit ${max}).`;
      orders.push({ to, text });
      return "Sent.";
    },
    { name: "order", description: "Give one director an order in plain language: what, where, for whom, and a budget if you want one.", schema: z.object({ to: z.enum(t.directors.map((p) => p.id) as [string, ...string[]]), text: z.string() }) },
  );
  const agent = createDeepAgent({
    model: new ChatAnthropic({ model: EVAL_MODEL, maxTokens: 4000, outputConfig: { effort: "low" } }),
    name: "campaigner",
    tools: [
      reader("read_map", t.read.map, "Support by community district."),
      reader("read_voter_groups", t.read.groups, "Support and size of each voter group."),
      reader("read_paper", t.read.paper, "What the press has reported so far, newest first."),
      reader("read_staff_reports", t.read.staff, "What your staff did and reported since last week."),
      reader("read_rivals", t.read.rivals, "What the rival campaigns did since last week."),
      order,
    ],
    systemPrompt: `You are ${me.name}, ${me.role}.
What you know about yourself:
${factsBefore(me, today).map((f) => `- ${f.text}`).join("\n")}

Today is ${today}. You know only what you are told here and what you knew as of today. Nothing after today has happened.
It is your weekly meeting with your directors. Read what you need, then give up to ${max} orders with the order tool, or none if nothing is worth the money. Run the campaign as you would.`,
  });
  await agent.invoke({ messages: [{ role: "user", content: t.body }] }, { recursionLimit: 30, runName: `eval:week:${today}`, tags: trace.tags, metadata: { ...trace.metadata, date: today } });
  return orders;
}

export async function freeRun(o: FreeOptions) {
  const c = currentCase(useCase.getState().caseId);
  const log = o.log ?? (() => {});
  const me = PEOPLE[c.follow];
  for (let n = 0; n < o.runs; n++) {
    useCase.getState().restart();
    useStaff.setState(STAFF0, true);
    useMemos.setState({ byDecision: {} });
    const off = watchMemos();
    let lastWeek = c.briefingDate, firstDifferent: string | null = null, orders = 0;
    const trace = (extra: Record<string, unknown> = {}): Trace => ({ tags: ["eval", o.tag, "free"], metadata: { run: n, ...extra } });
    try {
      run();
      for (let guard = 0; guard < 400 && !finished(); guard++) {
        const d = waiting();
        if (d) {
          const i = c.decisions.indexOf(d);
          await until(() => useMemos.getState().byDecision[d.id]?.status === "ready", 120_000);
          const memos = useMemos.getState().byDecision[d.id]?.memos ?? [];
          const { card, dropped } = caseCard(c, d, i, n, memos, me, "decide", true);
          let ch = o.live ? await decideLive(card, trace({ decision: d.id })) : decideRules(card);
          // The card will not take an option the campaign cannot pay for: ask once more, then take the cheapest.
          const cash = worldNow().w.budget;
          const cost = (key: string | null) => card.options.find((x) => x.key === key)?.cost ?? 0;
          if (ch.key && cost(ch.key) > cash && o.live) ch = await decideLive({ ...card, body: `${card.body}\n\nYou cannot afford option ${ch.key}. Choose one you can pay for.` }, trace({ decision: d.id }));
          if (!ch.key || cost(ch.key) > cash) ch = { ...ch, key: [...card.options].sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0].key };
          const chosen = card.options.find((x) => x.key === ch.key)!.id;
          if (chosen !== d.taken && !firstDifferent) firstDifferent = d.id;
          useCase.getState().decide(d.id, { option: chosen });
          const r: Rec = { kind: "free", cond: "card", decision: d.id, person: me.id, n, chosen, taken: d.taken ?? "", onReal: chosen === d.taken, order: card.options.map((x) => x.id), why: ch.why, read: ch.read, mode: ch.mode, ms: ch.ms, memos: memos.map((m) => ({ director: m.director, option: m.option })), dropped, prompt: { system: system(card), user: `${card.title}\n\n${card.body}\n\nOptions:\n${optionLines(card)}` } };
          o.onRecord(r);
          log(`run ${n + 1} ${d.date} ${d.id} → ${chosen}${chosen === d.taken ? " (real)" : ""}`);
          // The rivals plan for the stretch that starts now; wait for them, as the game's days would.
          const before = Object.values(useRivals.getState().memory).flat().length, rivals = inRace().length;
          tick();
          await until(() => Object.values(useRivals.getState().memory).flat().length >= before + rivals, o.live ? 180_000 : 2_000);
          continue;
        }
        const today = useCase.getState().date;
        if (days(lastWeek, today) >= (o.weekly ?? 7)) {
          const since = lastWeek;
          lastWeek = today;
          // Without a key a fixed order goes out, so the staff path is still exercised.
          const sent = o.live ? await week(since, o.orders ?? 2, trace({ date: today })) : [{ to: "fd", text: "Canvass Crown Heights this week" }];
          for (const x of sent) { orders++; log(`run ${n + 1} ${today} order to ${x.to}: ${x.text}`); await instruct(x.to, x.text); }
        }
        tick();
      }
      const w = worldNow().w;
      const top = Object.entries(w.poll).sort((a, b) => b[1] - a[1]);
      const work = useCase.getState().work;
      const fin: FinalRec = { kind: "final", n, poll: Object.fromEntries(top.map(([k, v]) => [k, Math.round(v * 10) / 10])), runoff: (top[0]?.[1] ?? 0) < c.threshold, firstDifferent, orders, staffJobs: work.filter((x) => !isRival(x.by)).length, rivalMoves: work.filter((x) => isRival(x.by)).length };
      o.onRecord(fin);
      log(`run ${n + 1} done: ${top.slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", ")}${fin.runoff ? ", runoff" : ""}`);
    } finally {
      off();
    }
  }
  useCase.getState().restart();
}
