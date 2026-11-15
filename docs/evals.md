# Evals: do the agents decide as the real people did?

Issue #28. The full report: how the evals are built, what was run, what came out, and what was decided along the way. A short version goes in the root README at the end.

Code: `web/src/lib/eval/`. Command: `npm run eval` in `web/` (see "How to run"). Every run's requests, replies and summary are saved in `web/eval/runs/`.

---

## 1. The question

When an agent stands in for a real person, does it decide as that person did? The LangChain judges asked this on 14 November.

The case is the 2013 Democratic primary for Mayor of New York, from inside Bill de Blasio's campaign. It has six real decision points, each with what the campaign really chose (`Decision.taken` in `web/src/lib/cases/mayor2013.ts`).

## 2. How it is set up

- **No student.** A campaigner agent plays Bill de Blasio. The staff, the rival campaigns and the staff memos are the game's own live agents (deepagents on Claude).
- **Real people, as themselves.** Each agent playing a real person gets a profile of facts from `docs/research/2013-mayoral-primary.md`, verified claims only (`web/src/lib/eval/people.ts`).
- **Only what was known on the day.** Each fact carries the date it became true. An agent deciding on a given day is told only the facts dated before it. A fact that is itself the answer to a scored decision is left out of every profile.
- **What the campaigner sees** is what a student sees: the decision card (what happened since the last decision, the situation, days left, money, the platform, the options with their cost and up/down chips, the two staff memos), plus the map, the voter groups and the paper, which it can open before deciding. In the free run it also reads its staff's reports and the rivals' moves.
- **What no agent ever sees:** the record of what was really done (`taken`, `did`, `followed`, `saidAfter`) and the advisers on record (`advice`).

## 3. What is scored, and what is not

- **Agreement:** how often an agent chose what the real person chose. Chance is one over the number of options (about 25%).
- **Not the final vote share.** The simulation is fitted so that the real choices land on the real result, so the vote share measures the fitting, not the agents. It is shown as context only.
- **The scores that matter are grounding scores.** The model knows this race, and masking cannot hide it (runs 1 to 3 recognised it on nearly every masked card), so the question is not whether it remembers 2013 but whether its choices follow the facts in front of it. The headline (decided 15 November, after run 3, section 8):
  1. **How often the agent follows changed facts**, beside a control. A card rewritten so the facts point away from the 2013 choice should move a grounded agent; the same facts in other words (the control) should not. An agent that moves on both is reacting to wording, not facts.
  2. **Agreement where memory is wrong.** Recall (no card) is run in the same run. Where it picks the wrong option and the card still leads to the real one, that agreement cannot be recall.
  3. **Agreement on twins the model does not recognise.** A twin moves the decision to an invented city with equivalent specifics (section 4).

  Plain agreement is reported, but it is not the target: the model's memory alone already reaches it. Agreement on unrecognised masked cards was the first choice of headline; it stays as a reported finding, because for this race there are almost none.

## 4. What is run

### Kinds

| Kind | What it is |
|---|---|
| **Replay** | Each of the six decisions on its own. The campaign arrives at it having made the real campaign's earlier choices, with no staff work and no rival moves, so every run sees the same world. |
| **Adviser fidelity** | The three advisers the record names arguing for an option. An agent plays that person and says which option they would argue for. |
| **Held out** | Eleven more real decisions (section 5), never used while tuning, run once at the end. |
| **Free run** | The whole system on its own from 27 January to 10 September. The campaigner gives its directors up to two orders a week and decides at each decision; staff, rivals and memos are live. It keeps going after its first choice that differs from 2013, and agreement is reported before and after that point. |

### Conditions

| Condition | What changes | What it tells us |
|---|---|---|
| `card` | Nothing: the card as a student sees it | Plain agreement |
| `nochips` | The options' up/down chips are removed | How much the chips give away (they were fitted to the record) |
| `masked` | People, places, boroughs, dates, the year, outlets and identifying figures are replaced; afterwards the model is asked which real race it was | Agreement when it cannot tell, and whether the mask held |
| `changed` | The situation is rewritten so a reasoning agent should move away from the 2013 choice. Two versions per decision (`CHANGED` in `conditions.ts`; the first written before run 1, the second before run 4) | Whether it follows the facts or its memory |
| `reworded` | The control: the same situation in other words (`REWORDED`) | Whether it moves on wording alone |
| `twin` | The whole decision moved to an invented city, Halvern, with equivalent specifics: an ombudsman instead of the Public Advocate, a luxury property tax for free school meals instead of an income tax for pre-K, police sweeps in public housing instead of stop-and-frisk, an expenses scandal instead of the real one (`twins.ts`). Same options, costs and chips, so the real choice is still the answer. No map, no paper, no memos. Recognition probe afterwards | Judgement with memory switched off. Weaker evidence than the real cards, because a twin is right only if it kept the real trade-offs |
| `recall` | No card: "which of these did the real campaign do?" | The pure-memory score, and which decisions memory gets wrong |

Option order is shuffled per run (the same order across conditions), so position is not a cue.

## 5. The held-out set

Eleven real decisions by real people, written from verified facts before any run or tuning (`web/src/lib/eval/heldout.ts`). Five are rivals' choices, so the test is not only de Blasio.

| Id | Person | Date | The real choice |
|---|---|---|---|
| quinn-kelly | Quinn | 2013-04-25 | Keep Police Commissioner Kelly |
| deblasio-kelly | de Blasio | 2013-04-25 | Not keep him |
| liu-hospital | Liu | 2013-07-10 | Step back into the crowd |
| weiner-hospital | Weiner | 2013-07-10 | Step back into the crowd |
| deblasio-weiner-call | de Blasio | 2013-07-23 | Call on Weiner to withdraw |
| quinn-weiner-call | Quinn | 2013-07-23 | Say it is for Weiner and the voters |
| weiner-stay | Weiner | 2013-07-23 | Stay in the race |
| deblasio-appeal | de Blasio | 2013-08-12 | Pledge to drop any appeal |
| quinn-appeal | Quinn | 2013-08-12 | Pledge to drop any appeal |
| thompson-appeal | Thompson | 2013-08-12 | Work with the monitor, without the Council's bills |
| thompson-ad | Thompson | 2013-08-25 | Answer with an ad calling the claim false |

The script refuses to run them without `--frozen`. Every report prints the file's hash (`591f8b618429` when written), so a change after the first run would show.

## 6. Keeping it honest

- **Card lines from the future are left out.** Two lines on the case's cards state things not known on the card's date: the 22 May card's mid-July poll, and the 15 July card's teachers' union spending (from a September article). The eval leaves them out of the card and of the memos, and every report lists them.
- **Repeatability.** Each condition runs N times. A staff order's luck is seeded by the eval, not the clock. Every request and reply is saved, and every run is traced in LangSmith (project `campaign-academy-evals`).
- **The rules fallback is not a measurement.** Without an API key the chips decide. That checks the wiring and doubles as the "chips alone" baseline: they land on the real choice at 2 of 6 decisions.

## 7. Results

### Run 1: replay, N = 3 (commit b28d704, 15 November)

Campaigner on the six decisions:

| Condition | On the real choice | Chance |
|---|---|---|
| card | 18/18 (100%) | 24% |
| nochips | 16/18 (89%) | 24% |
| masked | 16/18 (89%) | 24% |
| recall (no card) | 15/15 (100%), 3 replies lost | 24% |
| changed: stuck to 2013 anyway | 9/18 (50%) | |

| Decision | card | nochips | masked | recall | changed (stuck) |
|---|---|---|---|---|---|
| positioning | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| weiner | 3/3 | 3/3 | 2/3 | 3/3 | 3/3 |
| hospital | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| budget | 3/3 | 1/3 | 2/3 | 3/3 | 0/3 |
| firstad | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 |
| base | 3/3 | 3/3 | 3/3 | lost | 0/3 |

Adviser fidelity: 6 of 9. Playing John Del Cecato it matched the record at both his decisions (6/6). Playing Bill Hyers on Weiner it argued for spending early, 0 of 3; the record has him advising to stay with the plan.

What it showed:
- **The agreement is memory.** With no card at all the model named the real choice every time it answered.
- **Masking names was not enough.** The model named the real race on 26 of 27 masked cards. The facts give it away: the $500,000 pre-K tax, twelve years of Bloomberg, the paid sick days fight.
- **Changed facts split the decisions in two.** At budget, the first ad and the second ad the agent followed the new facts every time. At positioning, Weiner and the hospital it kept the 2013 choice every time, and its reasons skip the new facts. On Weiner it said he "is likely to stumble again", which is hindsight.
- **It reads before deciding:** all 90 live card decisions opened the map, the voter groups or the paper first.
- **The chips matter a little:** without them, budget fell from 3/3 to 1/3.
- **A leak found:** the budget card's dropped line still reached the staff memos, and the agent quoted it ("Thompson's $2.5 million in union money"). Fixed after this run.

### Run 2: replay, N = 3, after the fixes (commit 9054c39, 15 November)

Same agent as run 1. Changed: the memos no longer carry the dropped card lines, masking also hides identifying figures and details, and cut-short recall replies count.

| Condition | On the real choice | Chance |
|---|---|---|
| card | 18/18 (100%) | 24% |
| nochips | 18/18 (100%) | 24% |
| masked | 15/18 (83%) | 24% |
| recall (no card) | 15/18 (83%) | 24% |
| changed: stuck to 2013 anyway | 9/18 (50%) | |

Grounding: no masked card went unrecognised (0 of 18); changed facts were followed 9 of 18 times, the same three decisions as run 1.

| Decision | card | nochips | masked | recall | changed (stuck) |
|---|---|---|---|---|---|
| positioning | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| weiner | 3/3 | 3/3 | 2/3 | 3/3 | 3/3 |
| hospital | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| budget | 3/3 | 3/3 | 2/3 | 3/3 | 0/3 |
| firstad | 3/3 | 3/3 | 3/3 | 3/3 | 0/3 |
| base | 3/3 | 3/3 | 2/3 | 0/3 | 0/3 |

Adviser fidelity: 8 of 9 on the card, 6 of 9 masked (Hyers on Weiner: 2/3, then 0/3 masked).

What it showed:
- **Stronger masking did not help.** The model named the race on all 27 masked cards. Its own explanation: the platform gives it away (a tax on high earners for pre-K, the paid sick leave fight with the Speaker, the divided-city theme, 200,000 affordable homes). Hiding names, places, dates and figures cannot hide a famous candidate's platform.
- **At the last decision, memory is wrong and the card is right.** With no card, the model remembered the second ad as a repeat of the first, or as an attack on Quinn in Manhattan (0 of 3, and it said it was unsure). Given the card, it chose the stop-and-frisk ad every time, with and without the chips. That is the clearest case so far of the card, not memory, producing the real choice.
- **The chips did not matter this time** (18/18 without them, against 16/18 in run 1). The budget decision is the one that moves between runs.

### Run 3: tuning 1, N = 3 (commit 87c97f8, 15 November)

The campaigner is now told the facts it is given are this campaign's facts, even where they differ from what it remembers. Card, masked and changed only.

| Condition | On the real choice | Chance |
|---|---|---|
| card | 17/18 (94%) | 24% |
| masked | 13/18 (72%) | 24% |
| changed: stuck to 2013 anyway | 8/18 (44%) | |

| Decision | card | masked | changed (stuck) |
|---|---|---|---|
| positioning | 3/3 | 3/3 | 2/3 |
| weiner | 3/3 | 2/3 | 3/3 |
| hospital | 3/3 | 3/3 | 3/3 |
| budget | 2/3 | 0/3 | 0/3 |
| firstad | 3/3 | 3/3 | 0/3 |
| base | 3/3 | 2/3 | 0/3 |

Grounding: changed facts followed 10 of 18, against 9 of 18 before. All 18 masked cards were recognised.

What it showed:
- **Tuning 1 made no clear difference.** One more changed-facts card was followed (positioning, once), which is within run-to-run noise at N = 3. Weiner and the hospital still kept the 2013 choice every time.
- **Masked agreement fell** (13/18, against 15 and 16 in runs 1 and 2), mostly at budget. With every masked card recognised, this is not a memory effect; budget is the decision that moves most between runs.

### Run 4: the new headline, with twins and controls, N = 3 (commit 75662fe, 15 November)

Tuned agent (tuning 1). All seven conditions; two changed versions per decision.

**Headline:**

| Grounding score | Result |
|---|---|
| Changed facts followed (moved off the 2013 choice) | **26/36 (72%)**: 11/18 on the first versions, 15/18 on the second |
| Control: same facts reworded, kept the card's choice | **17/18 (94%)** |
| Where memory was wrong, the card got the real choice | **2/2** (both at the second ad) |
| Twins the probe did not recognise | 0 of 18 |

Plain agreement, for reference:

| Decision | card | nochips | masked | changed (stuck) | reworded | recall | twin |
|---|---|---|---|---|---|---|---|
| positioning | 3/3 | 3/3 | 3/3 | 3/6 | 3/3 | 3/3 | 3/3 |
| weiner | 3/3 | 3/3 | 2/3 | 1/6 | 3/3 | 3/3 | 1/3 |
| hospital | 3/3 | 3/3 | 3/3 | 4/6 | 3/3 | 3/3 | 3/3 |
| budget | 1/3 | 0/3 | 0/3 | 0/6 | 2/3 | 3/3 | 0/3 |
| firstad | 3/3 | 3/3 | 3/3 | 2/6 | 3/3 | 3/3 | 3/3 |
| base | 3/3 | 3/3 | 3/3 | 0/6 | 3/3 | 1/3 | 3/3 |
| **all** | 16/18 | 15/18 | 14/18 | 10/36 | 17/18 | 16/18 | 13/18 |

Adviser fidelity: 6 of 9 on the card and masked (Del Cecato 6/6, Hyers 0/3).

What it showed:
- **The agent follows the facts, not the wording.** Changed facts moved it off the 2013 choice 72% of the time, while the same facts in other words left its choice alone 94% of the time. That is the strongest grounding result so far. Positioning and the hospital are where memory holds on longest: they kept the 2013 choice on half or more of their changed cards.
- **Where memory and the card disagree, the card wins.** At the second ad, memory picked the wrong option twice; the card picked the real one both times. At budget the reverse: memory knows the real choice (3/3), and the card mostly did not take it (1/3). Either way the agent is not just reading its memory.
- **The twins were recognised too: 18 of 18.** The probe named the race from its shape: a fourth-place progressive citywide official, a council-leader front-runner, a late entrant with a scandal, a hospital protest. But that probe was leading: it told the model names had been replaced. It is neutral from run 5. Recognising the race when asked is not the same as deciding from memory: on twins the agent chose differently from the card at Weiner (1/3) and budget (0/3).
### Run 5: masked and twin cards with a neutral probe, N = 3 (commit b69da82, 15 November)

The probe no longer says that names were replaced; it asks only whether the decision is taken from a real election.

| Condition | On the real choice | Recognised as the real race |
|---|---|---|
| masked | 14/18 | 18/18 |
| twin | 12/18 | 18/18 |

| Decision | masked | twin |
|---|---|---|
| positioning | 3/3 | 3/3 |
| weiner | 2/3 | 0/3 |
| hospital | 3/3 | 3/3 |
| budget | 0/3 | 0/3 |
| firstad | 3/3 | 3/3 |
| base | 3/3 | 3/3 |

What it showed:
- **Nothing hides this race.** Even asked neutrally, the model named the 2013 New York primary on every masked card and every twin, mapping each invented person to the real one ("Ellen Marsh is Christine Quinn"). The shape of the race is as identifying as the names.
- **So the twins cannot give the clean score they were built for.** The grounding evidence for this case has to come from the changed facts against their control, and from the decisions where memory is wrong.
- **Recognising the race does not make the agent replay it.** At Weiner, where the twin's late entrant has an expenses scandal instead of the real one, the agent left the 2013 choice in five of the six twin runs across runs 4 and 5, although the probe recognised every twin. Which twin detail moved it is not known.

### Run 6: tuning 2, N = 3 (commit 96fcf73, 15 November)

Tuning 2: the agent's reason must name the facts it rests on and the one fact that would most change its mind.

| Grounding score | Run 4 | Run 6 |
|---|---|---|
| Changed facts followed | 26/36 (72%) | 25/36 (69%) |
| Control kept its choice | 17/18 (94%) | 16/18 (89%) |
| Where memory was wrong, the card got the real choice | 2/2 | 3/3 |

What it showed:
- **Tuning 2 made no difference**, like tuning 1. Two prompt changes aimed at grounding have not moved the score beyond run-to-run noise.
- **The hospital kept the 2013 choice on all six changed cards, and the reasons showed why: the chips.** "C is the only option expected to raise my poll standing." The changed cards rewrote the facts but kept the chips, which were set for the real situation, so the card said the union had turned on the candidate while the chips still said arrest wins union votes. Part of what looked like memory was the agent following leftover chips. From run 7, changed and reworded cards have no chips and are compared with the card without chips.

### Run 7: changed and reworded cards without chips, N = 3 (commit 05c3057, 15 November)

| Grounding score | Result |
|---|---|
| Changed facts followed | **28/36 (78%)** |
| Of the runs where the same decision's card (no chips) chose 2013, changed facts moved it | **22/30 (73%)** |
| Control kept its choice | **17/18 (94%)** |
| Where memory was wrong, the card got the real choice | **3/3** (all at the second ad) |

| Decision | nochips | reworded | changed (stuck) | recall |
|---|---|---|---|---|
| positioning | 3/3 | 3/3 | 0/6 | 3/3 |
| weiner | 3/3 | 3/3 | 3/6 | 3/3 |
| hospital | 3/3 | 3/3 | 5/6 | 3/3 |
| budget | 0/3 | 0/3 | 0/6 | 3/3 |
| firstad | 3/3 | 3/3 | 0/6 | 3/3 |
| base | 3/3 | 3/3 | 0/6 | 0/3 |

What it showed:
- **Without the chips, the agent follows changed facts at four of six decisions every time**, positioning included (it had kept 2013 there in runs 1 to 3).
- **Weiner's first changed card and the hospital still hold.** At the hospital the agent argues that a fourth-place candidate needs the attention, and calls it "a hospital closing in my own borough": the changed card names no borough, so that part is memory. Whether a reasoning agent should move away from arrest on that card is itself a judgement made in writing it.
- **At budget the card never takes the real choice** (0/3 without chips), while memory always knows it (3/3). That is the plainest case of the agent not reading its answer from memory.

### Free run 1: the whole system, one run (commit b28d704, 15 November)

Run before the memo-leak fix and before tuning 1. The campaigner held 32 weekly meetings and gave 64 orders; the staff carried out 294 jobs; the rivals made 46 moves.

| Decision | Chose | The real choice? |
|---|---|---|
| positioning | break | yes |
| weiner | hold | yes |
| hospital | arrest | yes |
| budget | alltv | yes |
| firstad | family | yes |
| base | frisk | yes |

Result (context, not the score): de Blasio 42.4, first, no runoff. Certified: 40.81, no runoff.

What it showed:
- **The whole system runs on its own for the full calendar** and stays on the real path: 6 of 6, so there was no first different choice and nothing to score after one.
- **Its orders read like a real campaign's, and like this campaign's.** Its first orders were small-donor fundraising for matching funds, earned media on the pre-K tax and paid sick leave "framing the race as a tale of two cities", and organising with union locals and Black churches. That is the platform it was given, but also how 2013 went, so the free run on its own says nothing about memory against judgement. The replay's grounding scores carry that.
- **The staff work pushed de Blasio 1.6 points past the certified result.** The engine was fitted with a fixed weekly staff routine; 64 orders from a live campaigner do more. That is a finding for the engine fit (#35), not for the agents.

## 8. Decisions log

| Date | Decision | Why |
|---|---|---|
| 14 Nov | Score agreement with real choices, not vote share | The simulation is fitted to the real result |
| 15 Nov | No student; every role an agent; profiles from verified research, gated by date | Devaj, Step 0 on #28 |
| 15 Nov | Held out: 11 new real decisions, written before any run, run once after tuning | Tuning and reporting on the same six proves nothing |
| 15 Nov | Memory measured three ways: masked cards with a recognition probe, recall with no card, changed facts | Agreement alone could be recall |
| 15 Nov | The campaigner sees what a student sees, memos and chips included, plus a no-chips condition | Devaj |
| 15 Nov | After run 1: the target is grounding, not agreement. Report agreement on unrecognised masked cards and how often changed facts are followed | Memory alone gives 100% agreement |
| 15 Nov | Memos skip the lines the card leaves out; masking also hides identifying figures and details; recall replies that are cut short still count | Found in run 1's transcripts |
| 15 Nov | After run 3, the headline changes to: changed facts followed (with a reworded control), agreement where memory is wrong, and agreement on unrecognised twins. Twins, controls and a second changed version per decision are written before any of them runs | Masking cannot hide this race (27 of 27 recognised in run 2); tuning 1 did not move the changed-facts score. Devaj |
| 15 Nov | Tuning 2: the reason must name the facts it rests on. Kept, though it made no measurable difference | Run 5 |
| 15 Nov | Changed and reworded cards drop the chips and are compared with the card without chips | Run 6: the chips, written for the real situation, contradicted the changed facts |
| 15 Nov | Tuning 1: the campaigner is told the facts it is given are this campaign's facts, even where they differ from what it remembers (`GROUNDED` in `decider.ts`). It names no option and no outcome | Run 1: at three changed-facts cards it argued from memory, not the card |

## 9. Limits

- **The model knows this race.** Masking hides names but not every fact, and the recognition probe reports how often it fails.
- **The held-out set was written by an agent that knows the outcome.** The options were written to be plausible and the real one is not signalled, but that cannot be proven.
- **The chips were fitted to the record**, and the `nochips` condition measures how much that matters.
- **Voter groups the case does not simulate drift toward their real September poll figures** as de Blasio rises (`factionSupport` in `mayor2013-factions.ts`). That hints at the future a little. It is shared game code, so it is reported, not changed.
- **Adviser fidelity has three cases from two people.** It cannot stand alone.
- **In the free run, after the first different choice,** the cards' text still describes 2013, while the numbers describe the agent's own race.

## 10. How to run

In `web/`, with `ANTHROPIC_API_KEY` (and `LANGSMITH_API_KEY` for tracing) in `.env.local`:

```bash
npm run eval -- replay --n 3
```
```bash
npm run eval -- free --runs 1
```
```bash
npm run eval -- heldout --frozen --n 3
```
```bash
npm run eval -- score eval/runs/<file>.jsonl
```

Options: `--cond card,nochips,masked,changed,recall`, `--kinds case,adviser`, `--only weiner,base`, `--concurrency 4`, `--dry` (rules only, no key needed).
