# Staff agents: make their work count, then memory and live memos

Plan agreed with Devank on 15 November 2026. Two phases, each its own branch and pull request, so the second can be
undone without touching the first.

## How we can go back

- Every item below is one commit. `git revert <commit>` undoes that item alone.
- Each phase is its own pull request. If a phase goes wrong after merging, reverting its merge commit removes it.
- Work is pushed to GitHub after every item, so nothing lives on one machine.
- Backups on GitHub today: `feat/engine-fit` (dfe5597) and `feat/staff-voice` (e1f66da). `main` is never pushed to
  directly and never force-pushed.
- Before each pull request the branch is rebased on the latest `main` and every check is re-run.

## Step 0: put the ground in order (before any new feature)

1. **Rebase `feat/engine-fit` on `main`.** It conflicts in `mayor2013.ts`, because `main` rewrote that file (the UI
   text pass). Do not merge the fitted numbers by hand: drop them, take `main`'s file, and run the refit again.
2. **Commit the refit scripts** (`refit.py`, `gaps.ts`, now only in a temporary folder) as `web/scripts/refit-case.*`,
   so the fit can be reproduced.
3. **Keep `main`'s new `checkCase()` checks** (short versions may not add numbers); only the fit check moves to
   `check:engine`.
4. **Stack `feat/staff-voice` on the rebased engine branch**, so the agents can use the headless runner.
5. **Close three gaps in what is already built** (e1f66da):
   - run the question path with no API key (never run so far);
   - "Can you canvass Crown Heights this week?" is an order, not a question: tighten `isQuestion`;
   - the "numbers moved" remark never fired in testing, and its baseline is not reset when the case restarts.
6. **Open the pull request for the engine fit** (#35), then one for today's staff-voice work.

## Phase 1: make what the agents do count (items 1 to 4)

Branch `feat/staff-voice`, continuing. One commit per item.

### 1. Scheduling becomes real
- Today the Campaign Manager's "Schedule it" jobs do nothing.
- A scheduled event becomes a candidate appearance on its date: `schedule_event` takes a date, a place and a kind
  (doors, rally, house party, meeting), and is stored on the case as a booked appearance.
- When the clock reaches that date the appearance happens through the existing `appear()`, and counts against the
  candidate's daily limit. A day that is already full pushes the event to the next free day.
- The War room and the morning paper show the calendar: what is booked, what happened.
- **Done when:** a Campaign Manager order for "two weeks of events" produces dated bookings, each one lands on its day
  with its cost and effect, and `check:engine` still passes.

### 2. The order's own budget
- Today every order is given $80,000, whatever it says.
- Read the amount from the order text ("under $15,000", "at most $20k", "$30,000"). Use it as the budget, never more
  than the cash the campaign has. No amount in the order keeps the default.
- An option picked from a director's proposals carries its own cost as the budget.
- **Done when:** the agent's instructions and the order agree on the number, and a run cannot spend past it.

### 3. Options priced by the engine
- Today an option's cost is the model's guess (the Harlem option said about $13,000 and cost $14,200).
- Each option carries its actions in structured form: which action, which district, which voter group.
- The engine prices them before the card is shown, so the card's cost is the real cost.
- Picking the option runs exactly those actions, without planning again.
- **Done when:** the cost on the card equals what is spent, to the dollar, in ten runs.

### 4. No invented numbers
- Staff may only state figures that come from the live case or from a tool result.
- The check runs inside the tools (`send_report`, `propose`, `take_action`'s reason): text with an unknown number is
  sent back to the agent once to rewrite; a second failure drops the sentence.
- Amounts an agent proposes to spend are allowed only inside an option, where the engine prices them (item 3).
  Remarks stop quoting "$4.3M" in every line.
- **Done when:** a seeded test with an invented figure is rejected, and twenty live remarks carry no figure outside the
  case.

### Phase 1 checks
- `tsc`, `eslint src`, `next build`, `npm run check:engine`.
- Live in the browser with the key, and once with no key (the rules fallback), for each item.
- A short scripted set of orders and questions, run through the headless runner, kept in the repo so later prompt
  changes can be re-checked.

## Phase 2: memory and voice in the core decisions (items 5 to 8)

New branch `feat/staff-memory`, from `main` once phase 1 is merged. One commit per item.

How memory has to work here: the whole game lives in the browser and each agent is rebuilt on every request. So a
staffer's memory is stored in the browser with the rest of the campaign, travels with each request (as conversation
history and rival memory already do), and is cleared when the case restarts. deepagents 1.16.5 has a `memory` option
and storage backends; the first task is to confirm from the installed version exactly how they are seeded, and to
check that turning files on for staff does not turn them on for the rival agents, which share the same setup.

### 5. Each staffer remembers
- A short memory per post: past orders, what each achieved, what the campaigner tends to want, what was refused.
- Written by the agent at the end of each run (a few lines, capped), read at the start of the next.
- **Done when:** a director refers correctly to something from two orders ago, and a restart clears it.

### 6. They come back about their own work
- A few days after a job, the director who ran it reports what it did and proposes the next step, through the
  proposal cards already built.
- At most one follow-up per job, and it respects the remark limits.
- **Done when:** a canvass on day N produces one follow-up with its real result by day N+5.

### 7. Ordinary conversation
- "Why did you do that?", "thanks", "what happened in Queens?" get a reply in voice, using memory, with no work
  started and nothing spent.
- Three kinds of message, decided by the agent: talk, question (options), order (work).
- **Done when:** ten scripted messages are each handled as the right kind, live and with no key.

### 8. Live staff memos before each case decision (waits for Devaj)
- Posted on the coordination board first; built only after Devaj agrees.
- The idea: before each of the six decisions, the relevant directors each write a short memo arguing for one option,
  from what has happened in this campaign.
- Safeguards the design must keep:
  - the tool never advises; memos are characters' views, labelled as simulated;
  - posts held by real people (Campaign Manager, Communications, Digital) speak as the post, never as the person;
  - the model knows what the real campaign did in 2013, so memos must not give it away: a test checks that memos do
    not simply land on the real choice, and directors must sometimes disagree.

### Phase 2 checks
- Same commands as phase 1, plus the scripted set extended for memory, follow-ups and conversation.
- `check:engine` must still pass: memory and talk never change the numbers.

## Coordination
- Coordination board (#32): a comment reversing the earlier "not fixing these" note, pointing here.
- A new issue for this work, assigned to Devank; updates go there after each item.
- Shared contracts touched: the `RunEvent` wire format (already extended with `proposals`), `schedule_event` in the
  action catalog, and `Work` (booked appearances). Each gets a line on the board before it changes.

## Not in this plan
- The Campaign Manager as an orchestrator over the other directors (three levels of agents). Considered and set
  aside for now in favour of making scheduling real.
- Character sheets, mood in voice, mid-run approval, agent evals at scale, LangSmith tracing, the ideas inbox.
