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
- **The scores that matter are grounding scores** (decided 15 November, after the first run, section 8):
  1. **Agreement on masked cards the model did not recognise.** Where it cannot tell which race this is, it cannot be recalling it.
  2. **How often the agent follows changed facts.** When a card is rewritten so the facts point away from the 2013 choice, a grounded agent moves; an agent recalling 2013 does not.

  Plain agreement is reported, but it is not the target: the model's memory alone already reaches it.

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
| `changed` | The situation is rewritten so a reasoning agent should move away from the 2013 choice (written before the first run, `CHANGED` in `conditions.ts`) | Whether it follows the facts or its memory |
| `recall` | No card: "which of these did the real campaign do?" | The pure-memory score |

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
