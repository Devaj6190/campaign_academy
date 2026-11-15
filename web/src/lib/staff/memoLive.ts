import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { DIRECTOR_MODEL } from "./agents";
import { HINDSIGHT, type Memo, type MemoRequest } from "./memo";
import { Ledger } from "./numbers";

// One director writes one memo on one decision: the case for the option it was assigned (memo.ts assign), from the
// decision card and its own campaign. It never picks the option, because the model recognises 2013's real choice.
// It is told to stop at the decision's date; a memo with hindsight or a figure it was not given is sent back once.

const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b as { text?: string }).text ?? "").join("") : "").trim();

export async function liveMemo(r: MemoRequest): Promise<Memo> {
  const mine = r.decision.options.find((o) => o.id === r.option) ?? r.decision.options[0];
  const Out = z.object({ headline: z.string(), case: z.string() });
  const who = r.director.onRecord
    ? `the ${r.director.role} (the post ${r.director.name} held in the real campaign; write as a professional in that post, never as that person)`
    : r.director.name && r.director.name !== r.director.role ? `${r.director.name}, ${r.director.role}` : `the ${r.director.role}`;
  const ledger = new Ledger().add(r.campaign, r.decision.situation.join(" "), r.decision.constraints, ...r.decision.options.map((o) => o.detail), ...r.memory);
  const messages: { role: string; content: string }[] = [
    {
      role: "system",
      content: `You are ${who} on the campaign. This is a nonpartisan teaching simulation built on the real 2013 race. Voice: ${r.voice}. Good at: ${r.director.good ?? "your post"}. Weak at: ${r.director.weak ?? "nothing noted"}.
The campaigner faces a decision and wants your advice before making it, in two short parts. You are recommending "${mine.label}": it is the option your side of the campaign favours. Make the best honest case for it, in your own voice, from where this campaign stands and what you remember of it.
Rules:
- It is ${r.decision.date}. You know nothing after that date. Never mention later events, how the race turned out, or what any real campaign chose. Argue only from the situation below and this campaign's numbers.
- headline: your recommendation in at most 10 words, in your voice ("Stay on plan and let him burn out").
- case: one or two sentences, at most 45 words, on why, built on this campaign's own figures (the poll, a voter group, the money, the days left, what the staff have done). Use only figures given here. No dollar amounts of your own.
Reply with JSON only: {"headline": "<text>", "case": "<text>"}.`,
    },
    {
      role: "user",
      content: `Decision: ${r.decision.title}
Situation: ${r.decision.situation.join(" ")}
Constraints: ${r.decision.constraints}
Options:
${r.decision.options.map((o) => `- ${o.id}: ${o.label}. ${o.detail} Likely up: ${o.up.join(", ") || "nothing"}. Likely down: ${o.down.join(", ") || "nothing"}.`).join("\n")}

This campaign today:
${r.campaign}

What you remember of it:
${r.memory.length ? r.memory.map((l) => `- ${l}`).join("\n") : "- Nothing yet."}`,
    },
  ];
  const model = new ChatAnthropic({ model: DIRECTOR_MODEL, maxTokens: 800, outputConfig: { effort: "low" } });
  const ask = async (extra: { role: string; content: string }[] = []) => {
    const raw = text((await model.invoke([...messages, ...extra])).content);
    return Out.parse(JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)));
  };
  let out = await ask();
  const both = (o: typeof out) => `${o.headline} ${o.case}`;
  const bad = ledger.unknown(both(out)), late = both(out).match(HINDSIGHT)?.[0];
  if (bad.length || late) {
    console.log(`[memo] ${r.director.id} on ${r.decision.id} sent back: ${[...bad, late].filter(Boolean).join(", ")}`);
    out = await ask([{ role: "assistant", content: JSON.stringify(out) }, { role: "user", content: `${bad.length ? `You stated figures you were not given: ${bad.join(", ")}. ` : ""}${late ? `"${late}" reaches past ${r.decision.date}: you cannot know that. ` : ""}Write it again. Same JSON.` }]);
  }
  // Still hindsight after a rewrite: that sentence goes.
  const keep = (t: string) => ledger.clean(t).split(/(?<=[.!?])\s+/).filter((s) => !HINDSIGHT.test(s)).join(" ");
  const headline = keep(out.headline).replace(/[.]$/, "");
  return { director: r.director.id, option: mine.id, headline: headline || `Go with "${mine.label}"`, text: keep(out.case) || `I would go with "${mine.label}".`, mode: "live" };
}
