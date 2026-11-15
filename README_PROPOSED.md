<!-- PROPOSED README (draft). The full, unchanged README is README.md; every detail there still holds.
     Figures: docs/readme/diagrams (rebuild with `node docs/readme/diagrams/build.mjs`). Screens: docs/readme/screens. -->

<h1 align="center">Campaign Academy</h1>

<p align="center"><b>A learning tool for political science students to simulate real campaigns.</b></p>

<p align="center">Students run a real race from the inside, with live LangChain deep agents that play the people in it, grounded in the historical record.</p>

<p align="center">
LangChain deep agents · Claude Opus, Sonnet and Haiku · Gemini · LangSmith · Photon iMessage · Next.js · MapLibre
</p>

<p align="center"><img src="docs/readme/diagrams/architecture.svg" alt="Architecture: the game and the rules engine in the browser; staff, rival and debrief agents on the server; Claude, Gemini and LangSmith behind them." width="100%"></p>

---

## The problem

Political science students learn campaigns from the outside: readings, polls, case write-ups, all written after the result is known. They never have to make the calls themselves: how to spend a limited budget, which voters to go after, what to tell a team, how to answer a rival's move. And once you know how a race ended, every choice in it looks obvious.

## The idea

Put the student inside a **real** race, on its **real** calendar, without telling them how it ends. Give them a staff to direct, rivals who fight back and a press that reports it all. At the end, show them their result beside the real one, so they learn from the gap.

## The solution

Campaign Academy turns a real race into a **case**: a sourced record of the candidates, polls, money, events and voters, plus the moments where the real campaign had to decide.

- **The race is real.** Every fact on screen is cited. The simulation is fitted to the record, so playing the real choices lands on the real result.
- **The people are live agents.** Your staff and your rivals are LangChain deep agents. Directors plan, hand jobs to their own teams, spend simulated money through the game's engine and report back. Rivals plan their own moves.
- **No hindsight.** The agents know only what was known on the game's date, and a filter drops anything that leaks the future.
- **You learn from the gap.** After each decision you see what the real campaign did. How it turned out for them is held back to the end.

**A new race is new data, not new code.** The first case is the 2013 Democratic primary for Mayor of New York, played from inside Bill de Blasio's campaign, which started fourth. We built one case in the time we had; the shortlist already names the next four.

---

## How it works

<p align="center"><img src="docs/readme/diagrams/loop.svg" alt="The student's loop: a decision point, you choose, history revealed, the campaign runs; the record at the centre." width="100%"></p>

1. **The briefing.** The race as it really stood when the campaign began.
2. **A decision point.** On a real date, the clock stops. Two of your own staff each argue for a different option; each option shows its price and which way it moves things.
3. **History revealed.** After you choose, you see what changed and what the real campaign did.
4. **The campaign runs.** Between decisions you direct your staff in plain English, send the candidate out on the map and set a weekly spending plan. Rivals make their own moves, and a morning paper reports it all.
5. **Election night.** The count comes in district by district, then the real result appears beside yours.

<p align="center"><img src="docs/readme/screens/decision-card.jpg" alt="Decision 2: a famous rival enters" width="100%"></p>
<p align="center"><sub><b>A decision point, from the first case.</b> Every line is cited to its source.</sub></p>

## Inside the app

| Screen | What the student does there |
|---|---|
| **Case** | Reads the briefing, makes the six decisions, sees what the real campaign did |
| **War room** | Gives orders to live staff agents, hires and lets people go, approves money asks |
| **Map** | Real New York streets and 59 districts; sends the candidate to knock doors, rally or host a house party |
| **Factions** | 22 voter groups from the 2013 polls, and which groups pull together or apart |
| **Morning paper** | The real headline each morning, cited; answers the story with a stance from the comms team |
| **Top bar** | Money left, the polls, the rivals' moves and a weekly spending plan |

<p align="center"><img src="docs/readme/screens/morning-paper.jpg" alt="The Five Borough Ledger" width="100%"></p>
<p align="center"><sub><b>The morning paper.</b> The lead is the real 2013 headline, paraphrased and cited. The rest of the paper is simulated, and you can answer the story.</sub></p>

---

## How it is built

<p align="center"><img src="docs/readme/screens/war-room-live-order.jpg" alt="The War room: a director, a live deep agent, splits an order between two people on the team and reports back." width="100%"></p>
<p align="center"><sub><b>The War room, live.</b> One order in plain English; the director plans it, hands the jobs to two people on the team, spends through the game's engine and reports what moved.</sub></p>

The game lives in the browser: the case file, the clock and a pure rules engine (`simulate()`: picks in, world out). Every live part runs on the server and has a rules fallback, so the app always runs, even with no API key.

<p align="center"><img src="docs/readme/diagrams/one-order.svg" alt="Sequence of one order: student, War room, director deep agent, subagents, engine, guards." width="100%"></p>

No model ever sets a poll figure, a cost or an effect. The agents choose actions; the engine prices and scores them. Before a report reaches you, two guards check it: a figure the agent was never shown is sent back once and then dropped, and anything that reaches past the game's date is removed.

## Honest by design

<p align="center"><img src="docs/readme/diagrams/record-vs-simulation.svg" alt="The record (sourced) and the simulation (fitted) feed the engine and the screens separately; real outcomes never reach an agent prompt." width="100%"></p>

- Every statement of fact has a source; anything estimated says so.
- The tool never recommends. Advice comes only from your staff.
- The real choice is shown only after you decide, and it is not always the right one.
- A real person appears in a post only where the record names them in it. The rest of the staff are invented.

## Does it work?

<p align="center"><img src="docs/readme/diagrams/accuracy.svg" alt="Simulated vs certified vote share for each candidate, all within 0.2 points." width="100%"></p>

**The simulation is fitted (first case).** The real campaign's six choices, with the rivals acting and a typical weekly plan, land every candidate within 0.2 points of the certified result. Play the weakest choices with no staff work and you finish third.

<p align="center"><img src="docs/readme/diagrams/evals.svg" alt="Evals: changed facts followed 78% vs reworded control 94%; held out, card 70% vs memory 67%." width="100%"></p>

**Do the agents decide as the real people did?** We tested it with no student: an agent plays de Blasio, the live agents play everyone else, and each sees only facts dated before the decision. The catch is that the model already knows this race, so plain agreement mostly measures memory. What memory can't fake is whether the choices follow the facts on the card:

- **They follow evidence, not wording.** Rewrite the facts to point away from the 2013 choice and the agent moves 78% of the time; reword the same facts and it holds 94% of the time.
- **On 11 held-out decisions it was never tuned on, the card adds almost nothing to memory** (70% against 67%).

The honest summary: the agents are grounded in the evidence they are given, but they don't reproduce real choices beyond what the model already remembers. The full method and all seven runs are in [README §9](README.md#9-evals-do-the-agents-decide-as-the-real-people-did).

---

## Validation

> **TODO (Devaj):** Devang reached out to about 60 professors and students. Add who tried it, what they said, and the Princeton professor's feedback (what we should be careful about), with the screenshot saved as `docs/readme/screens/validation-princeton.png`.

---

## Tracks

### Education (main track)

> **Draft, to edit.** Campaign Academy is built around how case-method teaching works, with the decision made by the student instead of read about:
> - **Real material, cited.** Every fact links to its source, so a class can check it and argue with it.
> - **Judgment before feedback.** Options preview only the direction of an effect, not its size. You choose, then see what moved, then what the real campaign did.
> - **Four skills a course can assess:** delegating (orders are graded on clarity and on giving the job to the right people), budgeting, reading voter groups and weighing policy trade-offs.
> - **No answer key.** The tool never says which option was best, and the real choice is not always the right one.
> - **More cases are data, not code.** A new race is one researched case file. The shortlist already names the next four.

### LangChain: deep agents and LangSmith

Every live staff member is a LangChain **deep agent** (`deepagents` 1.16.5):

| Agent | What it uses |
|---|---|
| **Staff director**, one per post | `createDeepAgent` with its team as subagents through the `task` tool, run in parallel; a `/memory/AGENTS.md` memory file per post; custom tools `take_action`, `send_report`, `propose` |
| **Staff under a director** | `SubAgent` specs, each with its own model (Haiku 5.5), its own voice and one tool |
| **Rival campaigns** ×4 | `createDeepAgent` with one tool, `make_move`, scored by the same engine |
| **End-of-election debrief** | `write_todos`, a read-only virtual filesystem of the whole campaign and the sourced record, seven subagents in parallel |
| **Evals campaigner** | Read tools and one `decide` tool; every run traced in **LangSmith** (project `campaign-academy-evals`) |

The War room's **Thinking** panel streams the agents' reasoning and hand-offs as they happen. We say plainly what isn't built: the staff director doesn't have `write_todos` yet, there is no checkpointer, and staff traces aren't flushed on Vercel. The full account, with every limit we found, is in [README §5b](README.md#5b-how-the-agents-work-langchain-deep-agents-in-depth).

### Amazon

> **TODO (Devaj):** how it's practical. Not drafted yet.

### Perry

> **TODO (Devaj):** to come.

### Gemini (MLH Best Use of Gemini API)

> **TODO, later.** Gemini (`gemini-3.8-flash`) writes the morning paper's simulated stories, the letters and the three stances you can answer a story with. Every story passes the same number check as the agents, and the masthead names the writer. The lead story is always the real 2013 headline; the model never writes it. *We need a screenshot of a Gemini-written edition: the local key on this machine produced a Claude edition.*

### Photon iMessage

Text a code to the project's iMessage line and your staff text you: remarks arrive signed by the post, you reply YES or with your own order, and the report comes back in the thread. Local demo only for now ([README §5](README.md#texts-on-your-phone-photon-imessage-53-68)).

---

## The technical detail

Everything below lives in [README.md](README.md), unchanged:

<details><summary><b>The case: the 2013 race</b>: candidates, rules, polls, the six decisions, the certified result, why this race</summary>

See [README §7](README.md#7-the-case-the-2013-race) and the sourced research in [`docs/research/2013-mayoral-primary.md`](docs/research/2013-mayoral-primary.md).
</details>

<details><summary><b>Every screen, in detail</b></summary>

See [README §3](README.md#3-a-tour-of-the-app-screen-by-screen).
</details>

<details><summary><b>Evals: setup, conditions, all runs, decisions log, limits, how to run</b></summary>

See [README §9](README.md#9-evals-do-the-agents-decide-as-the-real-people-did).
</details>

<details><summary><b>Testing</b>: automated checks, the full test of 15 Nov, speed</summary>

See [README §10](README.md#10-testing) and [`docs/testing/2026-11-15-full-test.md`](docs/testing/2026-11-15-full-test.md).
</details>

<details><summary><b>The two-minute demo</b></summary>

See [README §4](README.md#4-the-two-minute-demo) and [`docs/demo/judges-walkthrough.md`](docs/demo/judges-walkthrough.md).
</details>

## Built with

| | |
|---|---|
| **App** | Next.js 16, React 19, TypeScript, Tailwind, `motion`, `zustand`, `zod`, `lucide-react` |
| **Map** | MapLibre GL, NYC Open Data, NYC City Planning district shapes, Census ACS |
| **Agents** | LangChain `deepagents`, `langchain`, `@langchain/langgraph`, `@langchain/anthropic`, Claude (Opus 5.5, Sonnet 5.5, Haiku 5.5), LangSmith |
| **Paper** | Google Gemini via `@google/genai` |
| **Texts** | Photon Spectrum (`@spectrum-ts/*`) for iMessage |
| **Data** | NYC Board of Elections, NYC Campaign Finance Board, Quinnipiac and Marist polls, press coverage (55 sources) |

Our own work is the case research, the engine and its fit, the agents' design and guards, the evals and the interface. Built by **Devank Yadav** and **Devaj Solanki**, each directing Claude Code agents ([who built what](README.md#12-who-built-what)).

## Run it

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Every key is optional; without one, each live part falls back to rules. For a rich mid-campaign state, open **⋯ → Load demo start**. Details in [README §13](README.md#13-run-it).
