# Campaign Academy

**A political science learning tool that lets students run a real historical campaign in a simulation with AI staff.**

The first case is the 2013 Democratic primary for Mayor of New York. You run it from inside Bill de Blasio's campaign, which started in fourth place. The calendar runs. At the six moments where the real campaign had to decide something, the clock stops and you decide instead. Between decisions you direct a staff of live AI agents, the rival campaigns move against you, and a morning paper reports it all. On election night you see your result beside the certified one.

> **About this README (15 Nov 2026).** This is the big rough draft. Everything is in; it gets made beautiful next, and the Devpost is written from it. It is not the final README (that is issue #56).
> - It describes `main` at `881fdc9`, after the evals with held-out results (#75, §9), the end-of-election debrief agent (#73, §5b) and the appearances notice (#74) merged. The image-led version is the main [README](../README.md).
> - It folds in every doc in the repo.
> - Where a doc and the code disagree, the code on `main` wins.
>
> **Live site:** `campaign-academy.vercel.app` is stuck at `bbee564` (#67). Vercel's daily deploy limit blocked the later merges (#65, #68, #69, #70). A fresh deploy from Devank's Vercel account is under way; until then, demo from a local production build (see [Run it](#13-run-it)).

## Contents

1. [The pitch](#1-the-pitch)
2. [What the student does](#2-what-the-student-does)
3. [A tour of the app, screen by screen](#3-a-tour-of-the-app-screen-by-screen)
4. [The two-minute demo](#4-the-two-minute-demo)
5. [The AI: live agents, Gemini, iMessage](#5-the-ai-live-agents-gemini-imessage)
   - 5b. [How the agents work: LangChain deep agents in depth](#5b-how-the-agents-work-langchain-deep-agents-in-depth)
6. [Real and simulated, kept apart](#6-real-and-simulated-kept-apart)
7. [The case: the 2013 race](#7-the-case-the-2013-race)
8. [How accurate the simulation is](#8-how-accurate-the-simulation-is)
9. [Evals: do the agents decide as the real people did?](#9-evals-do-the-agents-decide-as-the-real-people-did)
10. [Testing](#10-testing)
11. [How it is built](#11-how-it-is-built)
12. [Who built what](#12-who-built-what)
13. [Run it](#13-run-it)
14. [Every doc in the repo](#14-every-doc-in-the-repo)
15. [Limits and open questions](#15-limits-and-open-questions)

---

## 1. The pitch

| | |
|---|---|
| **Who it is for** | Political science students who have never worked on a campaign |
| **Role** | Running a real campaign from the inside |
| **Material** | A real race: real candidates, polls, money, events and voters, every fact cited |
| **Setting** | New York City, on a real street map built from the city's open data |
| **Format** | A case: the real calendar, six real decision points, and a staff to direct in between |
| **How it ends** | Your simulated election night, district by district, then the real result beside it |
| **What you learn** | Delegating, budgeting, reading what different voter groups want, and weighing policy trade-offs |

**Flight-simulator version:** a flight simulator for political campaigns. You run a real race with AI staff, without knowing how it ends.

**Why it is different:**
- **The race is real.** The record is sourced and the simulation is fitted to it: the real campaign's choices with a typical staff routine land at 40.7–40.9% against the certified 40.81%.
- **The staff are live agents.** They plan, delegate to their own teams, spend real (simulated) money and report back.
- **No hindsight.** The agents only know what was known on the game's date.
- **You learn from the gap** between your choice and the real campaign's.

---

## 2. What the student does

```mermaid
flowchart LR
    B[Briefing<br/>the race as it really stood] --> D[Decision<br/>a real moment, the clock stops]
    D --> P[You decide<br/>two staff memos argue, options preview what they move]
    P --> Q[The calendar runs<br/>you direct staff, rivals move, the paper reports]
    Q -->|next real decision date| D
    Q -->|primary day| E[Election night<br/>your count, then the real result]
```

1. **Briefing (27 January 2013).** The race on the day de Blasio launched: who is running, the rules (40% to win outright, else a runoff), the money and the polls. You start fourth.
2. **Decision.** A real moment, on its real date. The clock stops and a decision card opens.
   - The card shows what happened since your last decision, the situation, your money and days left.
   - Two of your directors each write a memo for a different option.
   - Each option shows its price and small up/down chips for what it will move.
3. **You decide.** You see **What changed** (poll, money and voter groups before and after), then **What the real campaign did**: "The same call you made" or "A different call". How it turned out for them is held back until the end.
4. **The calendar runs.**
   - Days pass, two seconds each at 1× (2× and 5× are faster).
   - You give orders to staff in plain English, send the candidate out on the map, add planks to the platform and set a weekly spending plan.
   - Rivals make their own moves.
   - Mornings with news pause the clock until you read the paper or put it aside.
5. **Election night (10 September 2013).** The count comes in across 65 Assembly Districts with a 40% line. Then the debrief shows your result, the certified result, and each decision against the record.

---

## 3. A tour of the app, screen by screen

This is a shot list. Everything here is on `main` today.

### The shell
- **Five tabs** across the top: **CASE · PROFILE · WAR ROOM · MAP · FACTIONS**, in black and gold with a sliding gold underline.
- **Top bar, left:**
  - **Spending** (red arrow), a hanging gold plate **Left to spend**, and **Income** (green arrow).
  - Each opens a panel with the **weekly plan sliders**: "Spend each week" and "Raise each week", each line with a count, a target, a runway warning and the next run date. Below them is a ledger of spending and income so far.
  - Numbers flash ± chips when they change.
- **Top bar, right:**
  - **The poll strip** (top three, "You" highlighted). It glows when a rival has done something you haven't seen.
  - Hover or click it for **The race so far** (a poll chart with decision markers) and **What your rivals are doing** (each move tagged Real data or Simulated).
  - **Clock:** play/pause, **Skip** ("to the next news or decision") and speed 1×/2×/5×. These are replaced by **Decision waiting** or **Paper waiting** when one is due.
  - Days left, the date and a progress bar.
- **Sidebar:**
  - **Tasks:** an editable checklist.
  - **Desk → Morning paper.**
  - A collapsible **Case outline**: titles stay hidden until you reach them.
  - The **⋯ Desk menu**: **Load demo start** (22 May 2013, Weiner enters), **Reset campaign**, and **Texts on my phone** (iMessage, see §5).
  - The campaign **saves itself** in the browser. Reload and it resumes with the clock paused; there is no save button.
- **Notifications** pop up bottom-left: staff speaking up on their own, results of orders and rival moves. Clicking a staff remark opens that person in the War room with their suggested order ready.

### Case
- Step pills (**Briefing, Decision 1–6, Debrief**), each locked until the clock reaches it. A **Your campaign now** strip shows poll, place, money and voter-group bars.
- **Briefing:** "The race on [date]" with four figures (you, the leader, days left, the 40% line), the candidates, and "How this works".
- **Decision:**
  - Date and skill, the title, "Since your last decision", the situation (cited, with Estimate tags), and "Platform on record".
  - **Your advisers:** two memo cards from your own staff, written live. The footer says they are simulated, not what anyone said in 2013. Clicking a card picks its option.
  - **What do you do?:** option cards with a price or "Free", what you'd have left, up/down chips, and "X recommends" badges. You can't choose an option you can no longer afford.
  - The sticky **Decide** bar.
  - Then **What changed** (animated before → after bars, with "See it on the map"), **What the real campaign did**, and "Carry on with the campaign" or "Give your staff work first".
  - The same card opens over any screen when the clock reaches a decision.
- **Debrief:** "Your election night", "What really happened" (certified shares and votes), "Your decisions against the record" (what followed, what was said afterwards), "Play it again", and the sources.
  - **Your debrief** (PR #73, on `feat/debrief`): below "Your election night", a read-only deep agent writes a cited analysis of all six decisions and a review of how you ran your staff and handled the rivals. It takes 25–35 s. With no key, or if the run fails, the existing debrief stands.

### Profile
- A photo card of de Blasio. **Platform** shows the cited record, your choices so far and the rivals' platforms.
- **Your additions** is the plank desk:
  - Type an idea and click **Shape it into a plank**. The Policy Director, or a staffer while that post is empty, drafts it with the voter groups it **serves** and **costs**.
  - Then **Adopt it** or **Discard**. You can add one plank between decisions.

### War room
- **A 3D stone chamber:**
  - "You" sit gilded on the dais, the directors on the step, their teams on the floor. The camera tilts slightly with the mouse.
  - **Click a figure** and the camera zooms onto that person and their team; **Whole room** or Esc resets it.
  - Lines glow and sparks run along them when work moves. Pops like "+$12k raised" or "−$25,000" appear on the figures.
- **Badge:** **Live agents**, or **Simulated staff · no API key**. Before the first order it reads "Staff are agents. Give an order to start."
- **Staff:**
  - Three posts are held by the real 2013 staff the record names, cited: Bill Hyers (Campaign Manager), Phil Walzak (Communications Director) and Jessica Singleton (Digital Director).
  - Invented staff fill out the team: Marcus Bell (Field Director), Dana Whitfield, Priya Nair, Rosa Delgado, Andre Baptiste, Ruth Feldman, Vincent Moretti, Carlos Vega, Hannah Brooks.
  - Three posts start empty: Policy Director, Data Director and Organizer, Bronx.
- **A person's panel:**
  - Good at, Weak at, Working on, Morale, and a live **Plan** checklist.
  - **Conversation**, with a collapsible **Thinking** timeline of the agent's reasoning, the report (spent, raised, actions), and asks for more money (Approve / Not now).
  - **Proposals:** priced option cards with **Do this**.
  - Delegation coaching: Strong/Workable/Weak, clarity out of 4, % right people.
  - The order box: "Tell X what you need…".
- **Dock:** Instruct, Reassign, Let go, Hire. The hiring panel shows candidates from the bench or **sourced by your agents**, with impact and spend-discipline meters.
- **Overview:** staff, vacancies, spent on jobs, the **Candidate's calendar**, direct reports and an activity feed.

### Map
- MapLibre with real streets, the 59 community districts, and 3D buildings when you fly in (right-drag to tilt).
- **Colour by:** Your support, Last decision (arrows and point labels), or a census group.
- **Click a district** for support, voter groups, "Who lives here" (census) and 311 requests.
- **Dock:** **Knock doors**, **Hold a rally**, **House party** (the candidate, two appearances a day, priced) and **Send staff**. Once the day's two are used the buttons dim, and pressing one says "Today's two appearances are done." (PR #74). Districts glow when work lands.
- **Election night:** the app switches to the Map by itself.
  - Districts count in one by one ("N of 65 reporting") with the 40% line, then the verdict.
  - Toggle **Your campaign / Your election night / Real result 2013** (Assembly Districts).

### Factions
- **22 voter groups** from the 2013 polls, drawn as circles sized by share of the electorate, under nine kinds (race, borough, ideology, religion, age, gender, income, education, labor).
- A circle is warm where you run ahead of your citywide figure, cool where you run behind.
- **22 links:** gold solid lines for "Agree", red dashed for "Opposed".
- **Click a group:** its linked groups arc around it with their reasons. The card shows the real Feb and Sep 2013 poll lines, what the group likely wants and doesn't want (inferred), and which of your planks serve or cost it.

### The morning paper, *The Five Borough Ledger*
- An old broadsheet in newsprint colours. The masthead has a countdown to the primary, the edition number and an **Archive** of past editions.
- **Simulated stories written by Gemini** (or Claude) under the masthead.
- **The lead story is from the record:** it's the real 2013 headline, paraphrased and cited, and its words ink in one by one beside a moving picture.
- **Answer the story:** three stances drafted by your communications staff, each showing which groups it wins (▲) and loses (▼), then **Put it out**. You can also **Hand it to Comms** or **Let it pass**, and a rubber stamp lands.
- Simulated **Your campaign** and **Your rivals** stories, a weekly **poll** box, "The stories moving the race" with illustrations (captioned as illustrations, no real people), and **letters to the editor** from voter groups.
- A corner notice ("Press to read. The clock waits.") pauses the clock.

---

## 4. The two-minute demo

The full click-by-click script, rehearsed on `main` with #64 and #65, is in [`docs/demo/judges-walkthrough.md`](demo/judges-walkthrough.md).

**Setup:**
- Run a production build (`npm run build && npm run start` in `web/`) with `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`, on a screen at least 1440 px wide.
- **Tab A:** `localhost:3000`, then **⋯ → Load demo start**. The War room badge must say **Live agents**.
- **Tab B:** `127.0.0.1:3000`, so it keeps its own save. Play it to election night and leave it on the Map.

| Time | What happens |
|---|---|
| 0:00 | Tab A, Case tab, 22 May 2013. The pitch: a real race, real record, AI staff. |
| 0:15 | Top bar: Weiner has entered with $4.8M; we're fourth at 9%. |
| 0:25 | War room: click **Marcus Bell** (Field Director); the camera zooms in. |
| 0:30 | Type `Canvass Black voters in Crown Heights and Flatbush this week, $25,000`, then Enter. |
| 0:35 | His reasoning streams under **Thinking**. He hands jobs to his team and a ring spins. |
| 0:50 | The report lands in about 15 s: money spent, Crown Heights +3, a notification. |
| 0:55 | **Morning paper**: the lead is the real 2013 headline; our stories are "written by Gemini". |
| 1:05 | Close it with ×. Click **Decision waiting**: what do we do about Weiner? |
| 1:10 | **Your advisers**: two directors argue opposite options, written live from our numbers. |
| 1:20 | Pick the Campaign Manager's card ("Spend early on name recognition"), then **Decide**. |
| 1:25 | **What changed**: poll 9% → 12%, money $4.3M → $3.6M. |
| 1:30 | **What the real campaign did**: *A different call: Leave him alone and stay on plan.* |
| 1:40 | Tab B, election night: the result card, then **Real result 2013** (de Blasio 40.8%, no runoff). |
| 1:55 | Close: "Run a real campaign with an AI staff, and see how your choices compare with history." |

**Tips:**
- Don't press Run or Skip in Tab A.
- Close the paper with ×: Esc both closes it and zooms the War room out.
- If an agent is slow, keep talking, or use **Do this** on a priced proposal (a few seconds).
- With no key, everything falls back to rules (about 3 s per order).
- Reset between judges with **⋯ → Load demo start** (10 s).

**The six real choices** (to play Tab B to the end): *break with Bloomberg*, *leave Weiner alone*, *join the hospital protest and accept arrest*, *hold everything for television*, *a family member introduces you* (the ad with his son), *make stop-and-frisk the second ad*. They usually land near 39–41%: a narrow win or a runoff against Thompson.

---

## 5. The AI: live agents, Gemini, iMessage

Every live part has a rules fallback, so the app always runs. With no key the War room says "Simulated staff · no API key".

### Staff: LangChain `deepagents` (LangChain track)
*The technical version, with every deep agent, its features, guards and limits, is §5b.*
- **Each director is a `createDeepAgent`** (`web/src/lib/staff/agents.ts`) with its own team as subagents.
  - It plans with `write_todos` and hands work down with the `task` tool. The **Thinking** panel shows this live.
  - It keeps a memory file of what worked in this campaign (`/memory/AGENTS.md`), capped at 12 dated lines per post and cleared on restart.
  - **Models:** directors run on `claude-opus-5-5` (`DIRECTOR_MODEL`); the people under them are subagents on `claude-haiku-5-5` (`STAFF_MODEL`).
  - The deepagents file tools and general-purpose subagent are switched off. The custom tools are `take_action` (one engine action, with a `why` first), `send_report` and `propose` (2–3 priced options).
  - Each agent sees the campaign as the browser has it: date, cash under the cap, poll, weekly plan, calendar, platform, voter groups and every district's support, plus the action catalog with prices.
- **Actions are real engine actions.** An agent's tools call the same engine as everything else (`lib/engine/catalog.ts`, `resolve.ts`): canvass, rally, press pitch, mail, digital ads, call time, donor dinner, and so on. Each has a real cost and a simulated effect on districts and voter groups.
- **Order budgets:**
  - Each order gets its own budget, read from your order text, $80,000 by default.
  - One order can spend at most **$250,000** (#63, after the full test found one order spending $816,150), and never more than the campaign has.
  - A report can ask for more money ($5,000–$250,000), and you approve or refuse it.
- **No invented numbers.** A report quoting a figure nobody gave it is sent back once. After that, the offending sentence is dropped (`numbers.ts`).
- **No hindsight.** Every prompt says it's that date in 2013 and the agent knows nothing after it. A filter (`memo.ts`) drops any sentence from reports, thinking, remarks or memos that reaches past the date, such as "won the primary", "Mayor de Blasio", "September 10" or a year after 2013 (#63).
- **Follow-ups:** three campaign days after a report, the director comes back on their own with new proposals.
- **Unprompted remarks** (`lib/staff/speak.ts`):
  - Staff speak up when something needs your call: rival moves, money or the weekly plan running out, the weakest voter group or district, empty posts, idle staff, low morale.
  - They also speak up after each decision (with an order that carries it out) and on each new lead story.
  - Each remark comes with a suggested order. At most one every 3 days, and the same worry at most every 14.
- **Decision memos:**
  - Three days before each decision, two directors write live memos (on `claude-opus-5-5`) for two different options.
  - **Which option each argues for is assigned by fixed rotation, not by the model.** Left to choose, the model picked the real 2013 option at all six decisions.
  - A memo with hindsight or an invented figure is sent back once.
- **Questions vs orders:** asking a question spends nothing; an order spends money.
- **Hiring:** agents write a shortlist of three candidates for an empty post. Morale and "wrong person for the job" affect the work.
- **Rules fallback** (`offline.ts`): used with no key, when a live run fails before spending anything, or when the server can't be reached. It emits the same events, so the screens look the same.

### Rivals
- Quinn, Thompson, Liu and Weiner are agents too: a `createDeepAgent` each, with one tool, `make_move`, scored by the same engine (`lib/engine/rivalAgent.ts`, `lib/cases/rivals.ts`).
- After each of your decisions, every rival still in the race plans two moves on $150,000.
- A rival's gains fade as they near 4 points, and you lose half of what a rival gains.
- Real events still happen to them on their real dates.

### Platform planks
- `lib/manifesto/`: a staff agent turns your idea into a plank, naming the groups it serves and offends. That's the Policy Director when the post is filled (it starts empty), otherwise a staffer.
- Code sizes the effect: +1.5 in groups served, −2 in groups offended, at most ±0.4 citywide.
- With no key, a keyword match does it.

### The morning paper: Gemini (MLH Best Use of Gemini API, #52, #64)
- The simulated stories, the letters and the three **Answer the story** stances are written by **Gemini** (`gemini-3.8-flash`, `@google/genai`) through `lib/paper/model.ts`.
- If Gemini fails, Claude writes them. With neither key, the template stands.
- **Every story passes the same number check (`honest()`).** A story using a number that isn't in the facts is rejected, and its template stays.
- The masthead line names the writer. Checked on production: a live stances call came back `by: "gemini"` in 3.3 s.
- The lead story is always the real 2013 headline, cited. The model never writes it.

### Texts on your phone: Photon iMessage (#53, #68)
- **⋯ → Texts on my phone:** you text a code ("JOIN 4821") to the project's iMessage line, which links your phone.
- Then staff remarks arrive as iMessages, signed by the post, with "Reply YES to: …". Reply YES, or reply with your own order, and the report comes back as a threaded reply.
- iMessage touches: a 👍 tapback when an order lands, and a typing bubble while the staff work.
- Your number stays in your browser and never goes into the save.
- **Limits:** the reply inbox lives in one server's memory, so it suits the local demo, not Vercel. The routes don't check who's calling, so the Photon keys should not go on a public host yet (board note, 15 Nov).

### The weekly spending plan (#33, #70)
- Sliders in the top bar set how many of eight actions the campaign buys each week, and where each is aimed:
  - spending: doors, rallies, press, mail, digital ads;
  - income: call time, small donors, donor dinners.
- Every seventh day the clock spends the plan through the same engine path as a staff job, so it moves districts, groups and the poll, and the agents, rivals and paper all see it.
- **Side effects:**
  - Plan work spills a quarter into linked voter groups (the opposite way for opposed ones).
  - Donor pools asked every week give 20% less, compounding.
  - Each call-time session uses one of the candidate's two appearances that day.
- **Warnings:** a runway warning, and the Finance Director speaks up if the plan will run the money out.
- A new campaign starts on the default plan (one Brooklyn canvass, one call-time session and one press pitch a week), which is the routine the engine is fitted with.

---

## 5b. How the agents work: LangChain deep agents in depth

Campaign Academy runs on LangChain's `deepagents` harness (`deepagents` 1.16.5, the latest release; `langchain` 1.6.6, `@langchain/langgraph` 1.7.4, `@langchain/anthropic` 1.6.5). A deep agent is a model in a tool-calling loop (LangChain's `createAgent`, compiled to a LangGraph graph) with a stack of middleware around it: planning, a virtual filesystem, subagents through a `task` tool, memory files, summarization and prompt caching. Since deepagents v0.7 the harness is a kit you configure; planning, for one, is opt-in. Below is every place the app builds a deep agent, what each one uses, and where it stops.

### Where deep agents run

| Agent | File | Model | deepagents features used |
|---|---|---|---|
| Staff director (one per post) | `web/src/lib/staff/agents.ts` | `claude-opus-5-5`, effort low | `createDeepAgent`, subagents via `task` (in parallel), `memory` (`/memory/AGENTS.md`), a harness profile, custom tools |
| Staff under a director | same | `claude-haiku-5-5`, effort low | `SubAgent` specs in isolated mode, each with its own model, prompt and one tool |
| Rival campaigns (Quinn, Thompson, Liu, Weiner) | `web/src/lib/engine/rivalAgent.ts` | `claude-haiku-5-5`, effort low | `createDeepAgent` with one custom tool |
| End-of-election debrief (PR #73) | `web/src/lib/debrief/` | `claude-sonnet-5-5`, effort low | `createDeepAgent`, `write_todos` (`todoListMiddleware`), virtual filesystem, filesystem permissions, subagents via `task` in parallel, custom tools |
| Evals campaigner (#28, `feat/evals`) | `web/src/lib/eval/decider.ts`, `free.ts` | `claude-opus-5-5`, effort medium (decisions) or low (weekly orders) | `createDeepAgent` with read tools and one decision tool, LangSmith tracing |

Everything else that talks to a model is a single LangChain `ChatAnthropic` call, not a deep agent: the decision memos, plank shaping, unprompted remarks, wrap-up lines, hiring shortlists, and the Claude fallback for the paper and the stances. The morning paper itself is written by Gemini.

### Staff: a director and the people under them
- **One deep agent per order.** Each order builds the director fresh from a snapshot the browser sends (`/api/staff/instruct`). The game state lives in the browser, so the server keeps nothing between orders.
- **Delegation through `task`.** The director's team members are `SubAgent` specs: name, description (role, strengths, weaknesses), their own model, their own prompt in their own voice, and one tool. The director hands each job to the right person with `task`, and independent jobs run in parallel. Each subagent sees only its brief, so its context stays isolated from the director's.
- **Acting through the engine only.** Staff act with one custom tool, `take_action`. It calls the same rules engine as the rest of the game (`lib/engine/resolve.ts`), which prices and scores the action. The `why` field comes first in the schema, so the reason is written before the choice; it streams to the War room as the staffer's thought.
- **The director's own tools:**
  - `send_report` ends an order;
  - `propose` answers a question with two or three options, each priced by the engine, not the model;
  - `take_action` only when nobody reports to the director.
- **Memory as a deepagents memory file.** Each post's memory is written into the run's files as `/memory/AGENTS.md` and loaded into the prompt by deepagents' `MemoryMiddleware`. It holds two kinds of line, capped at 12 per post: the exact record of each order, written by code from the run's results, and one lesson per order that the director chooses to keep.
- **A harness profile per model.** `registerHarnessProfile` hides the deepagents file tools and turns off the general-purpose subagent for both staff models. Staff delegate only to real colleagues and act only through the catalog.
- **Proactive staff.** Directors come back three campaign days after their team's work, with what changed and what the rivals did there since. Staff also speak up unprompted (money, weak groups, rival moves, a new front page), at most once every three days and the same worry at most every fourteen.
- **Streaming.** The route streams the agent with `streamMode: "updates"` and turns each step into an NDJSON event: thought, delegate, action, job-done, report or proposals. The War room animates the hand-offs from these events.

### Rival campaigns
- After each of the student's decisions, every rival still in the race plans its next stretch as a deep agent, all four in parallel. Each is told its real standing and its platform on record, what the student's campaign did since, and its own last four moves.
- It acts through one tool, `make_move`: at most two moves on $150,000, scored by the same engine as the student's staff. The rival gains the points its move is worth, and the student loses half of them where it landed.
- It shares the staff's harness profile (no file tools) and runs with `invoke`, not streaming.

### The end-of-election debrief (PR #73)
- **When:** once, after election day, as a section on the debrief screen beside the existing comparison of decisions.
- **A virtual filesystem as context.** The student's whole campaign (orders, staff thinking and reports, coaching, money asks, options picked, memos, rival moves, planks) and the case's sourced 2013 record are laid out as files: `/campaign/...` for what the student did, which is simulated, and `/record/...` for what really happened, with source ids on every line. The record is built on the server from the case file, so the browser cannot change it. The agent reads only what it needs, instead of getting one huge prompt.
- **Planning and parallel subagents.** It plans with `write_todos`, then sends six `decision_analyst` subagents (one per decision) and a `campaign_reviewer` in one turn, so they run in parallel. Each records its part through a tool; the main agent finishes with `submit_debrief`.
- **Read-only by construction.** deepagents filesystem permissions deny every write, edit and delete for the agent and every subagent. Its record tools only fill this run's result, and nothing it returns reaches the campaign.
- **Its own model on purpose.** Harness profiles are global to the server and keyed by model. The staff's profile hides the file tools for Opus and Haiku, so the debrief runs on Sonnet 5.5 to keep its file tools without touching the staff.
- **Checked output.** Every citation must be one of the case's sources, and every figure must appear in the files; anything else is dropped.

### The evals harness (#28, branch `feat/evals`)
- A campaigner deep agent plays de Blasio, and other agents play the real advisers and rivals. Each sees only facts dated on or before the decision. It can read the map, the voter groups and the paper through read tools before it decides through one `decide` tool, which asks it to name the facts its choice rests on.
- In the free run it holds a weekly meeting through an `order` tool, and the game's own live staff and rivals carry the orders out.
- Every run is traced in LangSmith (project `campaign-academy-evals`), with tags and metadata per decision and condition. Section 9 has the method and results.

### Guards around every live agent
- **No invented numbers** (`staff/numbers.ts`). A `Ledger` holds every figure an agent was shown: the case, the order, and its own tool results. A report or answer with any other figure is sent back once; after that the sentence carrying it is dropped. Memos, remarks, wrap-ups and the debrief use the same check.
- **No hindsight** (`staff/memo.ts`). Every staff prompt gives the date and says nothing after it is known. `withoutHindsight` drops any sentence that reaches past the date ("won the primary", "Mayor de Blasio", "in the real race", a year after 2013) from reports, thoughts, remarks and memos.
- **Memos never choose.** Left to choose, the model picked 2013's real option at all six decisions, because it recognises the race. So a fixed rotation assigns each memo writer an option, and the model only writes the case for it.
- **Budgets.** Each order has one budget for the whole team, read from the order text ($80,000 by default, at most $250,000, never more than the campaign has). Every tool reply says what is left of this order's budget, and the prompt says that is not the campaign's cash. The engine refuses anything over budget.
- **The engine moves the numbers.** No model ever sets a poll figure, a cost or an effect. Planks and stances name the groups they serve and offend; code sizes the effect.

### What is live, and what falls back to rules
- **With an Anthropic key,** the staff, rivals, memos, remarks, hiring shortlists, planks and debrief are live.
- **Without a key,** each one has a rules fallback that emits the same events or the same shape of result, so the screens behave the same:
  - staff: a keyword planner (`staff/offline.ts`);
  - rivals: two moves against the student's strongest group and district (`rulePlan`);
  - memos: a fixed reason per post (`rulesMemo`);
  - planks: a keyword shaper (`manifesto/rules.ts`);
  - the debrief: the plain decision-by-decision comparison.
- **Partial failure.** A live staff run that fails before spending anything reruns in the rules simulation. One that fails after spending closes with a partial report. The War room labels which mode is running.

### Limits we found
- **The director has never had `write_todos`.** Since deepagents v0.7 the to-do tool is opt-in through `todoListMiddleware`. The director's prompt still asks for it, and the War room still listens for it, but the staff agents don't add the middleware. So the plan checklist fills in only in the rules simulation. Building the director offline shows it is given `send_report`, `delete` and `task`, plus `propose`. The debrief agent does wire `write_todos`.
- **`delete` is visible to the director.** v0.7 added `delete` to the default file tools, and the staff profile hides the other file tools but not this one. The only file is the memory file, which the browser rebuilds on every order.
- **No checkpointer, store or interrupts.** Each order is a fresh run with the last eight lines of chat resent; memory lives in the browser save. A request for more money ends the run, and approving it starts a new run instead of resuming the old one.
- **Prompt caching helps only within a run.** The day's numbers sit in the system prompt, so it changes every order.
- **The model knows 2013.** Agents can recognise the race from the options alone. That is why memos are assigned an option and the hindsight filter exists, and why the evals score grounding (changed facts followed, agreement where memory is wrong, unrecognised twins) rather than plain agreement.
- **Tracing.** With the LangSmith variables set, every LangChain run is traced. The debrief route flushes its trace before it returns. The staff route streams and does not flush yet, so some staff traces may be dropped when the function stops on Vercel.

---

## 6. Real and simulated, kept apart

| | The record | The simulation |
|---|---|---|
| **What it is** | What was true and what happened | What your choices and your staff's work do to your campaign |
| **Examples** | Polls, filings, results, the press, what staff said afterwards | Poll points gained, money spent, support in a voter group |
| **Where it comes from** | Sources, linked on every statement | Invented sizes, fitted to the record |
| **How it is shown** | Cited, tagged Real data | Tagged Simulated |

**Rules that keep it honest:**
- **Every statement of fact has a source.** Anything estimated is labelled as an estimate.
- **The tool never recommends.** Advice comes from your staff, in their own voices. The tool never says which option was best.
- **Previews show direction, not size.** You choose on judgment, then see what moved.
- **The real choice is shown only after you decide.** How it turned out for them is held to the end.
- **Decisions are never on a timer.**
- **The real choice is not always the right one.** Luck and rivals' mistakes are part of the record.
- **A real name is always sourced.** A real person appears in a post only where the record names them in it, and signs as the post. The rest of the staff are invented.
- **Poll numbers and inferences are kept apart.** Group sizes and poll lines are real. What a group likely values, and so which groups pull together or apart, is inferred and stored separately (`mayor2013-leanings.ts`, `mayor2013-links.ts`).
- **No leaks of the future to the agents.** The real choices (`taken`, `did`, `followed`, `saidAfter`) and the advisers on record (`advice`) never reach an agent prompt. Card lines that state things not yet known on the card's date are dropped for the evals.
- **Advisers on the record:** the three sourced 2013 advisers (John Del Cecato at two decisions, Bill Hyers at one) are kept in the data for the evals only. They're off the screen and never in a prompt; the "Your advisers" on screen are your own simulated staff.

---

## 7. The case: the 2013 race

From [`docs/research/2013-mayoral-primary.md`](research/2013-mayoral-primary.md): 55 numbered sources, each claim marked VERIFIED, SNIPPET or UNVERIFIED.

**The race:**
- **Dates:** briefing 27 Jan 2013 (de Blasio's launch in Park Slope); primary 10 Sep 2013; 226 days apart.
- **Candidates:**
  - Bill de Blasio, Public Advocate.
  - Christine Quinn, Council Speaker, the front-runner at 35–37%.
  - Bill Thompson, former Comptroller and the 2009 nominee.
  - John Liu, Comptroller. He was denied matching funds on 5 Aug.
  - Anthony Weiner, who entered 22 May with $4.8M.
  - Sal Albanese and others.
- **Rules:**
  - 40% or a runoff (the runoff would have been 1 Oct).
  - Spending limit $6,426,000.
  - Public funds up to $3,534,300, matched $6 to $1 on the first $175.
  - Contribution limit $4,950.
- **Polls (Quinnipiac):**
  - 16 Jan: Quinn 35, de Blasio 11.
  - 15 Jul: Weiner 25, Quinn 22, Thompson 11, de Blasio 10.
  - 13 Aug: de Blasio 30.
  - 3 Sep: de Blasio 43, Thompson 20, Quinn 18.

**The six decisions in the game** (`web/src/lib/cases/mayor2013.ts`):

| # | Date | Title | Skill | The real choice |
|---|---|---|---|---|
| 1 | 27 Jan | What do you run as? | voter groups | A sharp break with Bloomberg: "a tale of two cities" |
| 2 | 22 May | A famous rival enters. What do you do about him? | delegating | Leave Weiner alone and stay on plan |
| 3 | 10 Jul | A hospital is closing and there is a protest today | policy | Join the protest and accept arrest (one of 15 arrested at Long Island College Hospital) |
| 4 | 15 Jul | Eight weeks left. How do you split the money? | budgeting | Hold everything for television |
| 5 | 8 Aug | Your first television ad | delegating | A family member introduces you (his 15-year-old son) |
| 6 | 19 Aug | The second ad, and whose voters you go after | voter groups | Make stop-and-frisk the second ad, contesting Thompson's base |

**Other key events:**
- 25 Apr: forum fight over Police Commissioner Kelly.
- 23 Jul: de Blasio calls on Weiner to quit.
- 12 Aug: Judge Scheindlin rules stop-and-frisk unconstitutional.
- 16 Sep: Thompson concedes; no runoff.
- 5 Nov: de Blasio wins the general election.

**Certified result** (Board of Elections, 30 Sep 2013; 691,801 votes):

| Candidate | Votes | Share |
|---|---|---|
| Bill de Blasio | 282,344 | 40.81% |
| William C. Thompson Jr. | 180,841 | 26.14% |
| Christine C. Quinn | 108,893 | 15.74% |
| John C. Liu | 47,286 | 6.84% |
| Anthony D. Weiner | 34,192 | 4.94% |
| Erick J. Salgado | 15,914 | 2.30% |
| Randy Credico | 11,530 | 1.67% |
| Sal F. Albanese | 5,843 | 0.84% |
| Neil V. Grimaldi | 4,677 | 0.68% |

- De Blasio cleared 40% by 0.81 points, about 5,600 votes. Earlier figures of 40.1–40.3% came from counts made before about 78,000 paper ballots were tallied.
- He was first in all five boroughs, best in Brooklyn (46.4%).

**The real staff:** campaign manager Bill Hyers; ad maker John Del Cecato (AKPD); communications director Phil Walzak; pollster GQR.

**The voters:** 22 groups with their February and September 2013 support, from two Marist poll tables, every number checked against the PDFs.

**Weak points the research names:**
- Decisions 2 and 3 rest partly on an NYT reconstruction that couldn't be opened.
- "No mail at all" is contested.
- There is no verified cash-on-hand figure at any decision.
- The split among Black voters in the exit poll is disputed.

**Why this race** ([`docs/research/case-shortlist.md`](research/case-shortlist.md)): it has the best record, all four skills in one arc, and excellent finance data. The next cases on the shortlist are the 2021 mayoral primary (Garcia), the 2013 comptroller primary (Stringer), the 2018 NY-14 primary and the 2009 mayoral general (Thompson).

**Data** ([`docs/research/data-sources.md`](research/data-sources.md)):
- NYC Board of Elections results by Assembly District.
- City Planning district shapes.
- NYC Campaign Finance Board data on NYC Open Data.
- Census ACS by PUMA.
- NYC Open Data for the street map and 311.
- **What can't be had for 2013:** results below Assembly District level, turnout rates, how any group voted, and where campaign money was aimed.

---

## 8. How accurate the simulation is

- **The case file is fitted to the record.** The real campaign's six choices, with the rivals acting (rules mode) and the default weekly plan, land within two points of the certified result for every candidate, with no runoff. Today every candidate lands within 0.2 points, and de Blasio finishes at 40.9 against the certified 40.81. `npm run check:engine` fails if that drifts.
- **You can lose.** The weakest choice at every decision, with no staff work, finishes third (de Blasio at 8.3%) and misses the runoff.
- **The student has to work.** The record alone finishes de Blasio on 39.5 and a runoff; with the rivals and no staff work, 37.1; with staff and no rivals, 43.1.
- **Deterministic:** the same inputs give the same world. The engine check also verifies that four Bronx canvasses a week move the Bronx, and that donor dinners cool liberal voters.
- **What it cannot do:** prove what a different choice would really have produced. It says so.

The tunable numbers (money scale, caps, rival budgets, plank sizes, spill, donor fatigue, speeds) are listed with their current values in [`web/README.md`](../web/README.md#numbers-you-can-tune).

---

## 9. Evals: do the agents decide as the real people did?

Issue #28. The short version comes first, as the evals session wrote it for the README (`feat/evals` at `5afe8c6`). The detail below it is taken from `docs/evals.md` on `feat/evals` (PR #75), through run 7 and the held-out run. Tuning is frozen at `bdd01be`. The code is in `web/src/lib/eval/`, run with `npm run eval` in `web/`. Every run's requests, replies and summary are saved in `web/eval/runs/` and traced in LangSmith (project `campaign-academy-evals`).

### In short

We tested it with no student. A campaigner agent plays Bill de Blasio, and the staff, rivals and memos are the live agents. Each real person is played from verified research, knowing only what was true before each date. Their choices are compared with what the real people chose in 2013.

**The catch: the model already knows this race.** Asked with no card at all what de Blasio's campaign did, it names the real choice at five of the six decisions. So plain agreement (about 90% on the cards) mostly measures memory. Hiding names didn't help: the model recognised the race on all but one masked card, and on every "twin" moved to an invented city, from the shape of the race alone.

**So we measured something memory can't fake: whether the choices follow the facts on the card.**

| Test | Result |
|---|---|
| Card rewritten so the facts point away from the 2013 choice: the agent moved | **78%** (28 of 36) |
| Control, same facts in other words: the agent kept its choice | **94%** (17 of 18) |
| Memory wrong, card given: still chose what really happened | **11 of 11** (all at the last decision, the second ad) |
| The whole campaign on its own, January to September | 6 of 6 real choices, 32 weekly staff meetings, 294 staff jobs |

Simulated vote share, as context only, since the engine is fitted to the real result: 42.4, against a certified 40.81.

What this shows:
- The agent follows evidence, not wording. It changes course when the facts change and holds when only the words change.
- Where its memory is wrong, the card carries it to the real choice. At the budget decision it's the other way round: memory knows the real answer every time, and the card leads the agent elsewhere.
- Memory still wins at the hospital protest. On rewritten cards the agent kept the 2013 choice, citing details the card never gave.

**The held-out test: 11 more real decisions**, five of them rivals' choices, written before any run and run once at the end:

| Held out | Result |
|---|---|
| On the card, chose what the real person chose | 23 of 33 (70%) |
| Memory alone, no card | 22 of 33 (67%) |
| Memory wrong, card given: still chose what really happened | 2 of 11 |

On decisions it was never tuned on, the card adds almost nothing to memory. The misses are moments of personal caution: Liu and Weiner stepping back from arrest at the hospital protest, and Quinn declining to tell Weiner to quit. Played as those people, the agents chose a bolder line.

**The honest summary:** the agents are grounded in the evidence they are given, and the free run behaves like a real campaign. But they do not reproduce what the real people chose beyond what the model already remembers. Two prompt changes aimed at grounding made no measurable difference.
(The 11 of 11 adds up runs 2, 4, 6 and 7: 3 + 2 + 3 + 3.)

### The question
When an agent stands in for a real person, does it decide as that person did? The LangChain judges asked this on 14 November. The case has six real decision points, each with what the campaign really chose (`Decision.taken`).

### Setup
- **No student.** A campaigner agent plays Bill de Blasio. The staff, rivals and memos are the game's own live agents (deepagents on Claude).
- **Real people, as themselves.** Each agent playing a real person gets a profile built only from verified facts in the research doc (`web/src/lib/eval/people.ts`).
- **Only what was known on the day.** Each fact carries the date it became true, and an agent sees only facts dated before its decision. A fact that is itself the answer to a scored decision is left out of every profile.
- **The campaigner sees what a student sees:** the decision card (memos, chips, money, platform), plus the map, voter groups and paper, which it can open before deciding. In the free run it also reads its staff's reports and the rivals' moves.
- **What no agent ever sees:** `taken`, `did`, `followed`, `saidAfter` or `advice`.

### What is scored
- **Agreement:** how often an agent chose what the real person chose. Chance is about 24%.
- **Not the final vote share.** The simulation is fitted to the real result, so vote share measures the fitting, not the agents.
- **The headline is grounding, not agreement.** The model knows this race, and masking can't hide it, so the question is whether its choices follow the facts in front of it. Three scores:
  1. **Changed facts followed**, beside a control. A card rewritten so the facts point away from the 2013 choice should move a grounded agent. The same facts reworded (the control) should not.
  2. **Agreement where memory is wrong.** Where recall with no card picks the wrong option and the card still leads to the real one, that agreement can't be memory.
  3. **Agreement on twins the model doesn't recognise.** A twin moves the decision to an invented city, Halvern, with equivalent specifics.

### What is run

| Kind | What it is |
|---|---|
| **Replay** | Each decision on its own, arriving with the real earlier choices, no staff work and no rival moves |
| **Adviser fidelity** | The three advisers the record names. An agent plays that person and says which option they'd argue for |
| **Held out** | Eleven more real decisions, never used while tuning, run once at the end |
| **Free run** | The whole system from 27 Jan to 10 Sep. The campaigner gives up to two orders a week and decides at each decision; staff, rivals and memos are live |

| Condition | What changes | What it tells us |
|---|---|---|
| `card` | Nothing | Plain agreement |
| `nochips` | Up/down chips removed | How much the chips (fitted to the record) give away |
| `masked` | People, places, dates, outlets and identifying figures replaced, then a recognition probe | Whether masking hides the race |
| `changed` | The situation rewritten so a reasoning agent should move away from the 2013 choice (two versions per decision) | Facts or memory? |
| `reworded` | The same situation in other words | The control: does wording alone move it? |
| `twin` | Moved to Halvern: an ombudsman for the Public Advocate, a luxury property tax for school meals instead of an income tax for pre-K, police sweeps in public housing instead of stop-and-frisk, an expenses scandal | Judgement with memory switched off |
| `recall` | No card: "which of these did the real campaign do?" | Pure memory |

Option order is shuffled per run.

**Held-out set** (`web/src/lib/eval/heldout.ts`): eleven real decisions written from verified facts before any run, five of them rivals' choices. Among them: Quinn keeping Commissioner Kelly; Weiner staying in the race; de Blasio and Quinn pledging to drop any stop-and-frisk appeal; Thompson's ad calling a claim false. The script refuses to run them without `--frozen`, and each report prints the file's hash (`591f8b618429`).

**Keeping it honest:**
- **Card lines from the future are dropped.** Two lines on the cards weren't known on their dates: the 22 May card's mid-July poll, and the 15 July card's teachers' union spending. The eval leaves them out of the cards and the memos.
- Each condition runs N times, with seeded luck, and every request and reply is saved.
- **The rules fallback is a baseline, not a measurement.** Without a key the chips decide, and they land on the real choice at 2 of 6 decisions.

### Results so far

**Run 1, replay, N = 3** (`b28d704`):

| Condition | Real choice | Chance |
|---|---|---|
| card | 18/18 | 24% |
| nochips | 16/18 | 24% |
| masked | 16/18 | 24% |
| recall | 15/15 | 24% |
| changed (stuck to 2013) | 9/18 | |

- **The agreement is memory:** with no card, it named the real choice every time.
- **Masking names wasn't enough:** it recognised 26 of 27 masked cards from the platform (the $500,000 pre-K tax, paid sick days).
- **Changed facts split the decisions:** it followed new facts every time at budget and both ads, and never at positioning, Weiner or the hospital.
- **It reads before deciding:** all 90 card decisions opened the map, groups or paper first.
- **A leak was found and fixed:** a dropped card line reached a staff memo.
- **Adviser fidelity 6/9:** Del Cecato 6/6, Hyers on Weiner 0/3.

**Run 2, after the fixes, N = 3** (`9054c39`):
- card 18/18, nochips 18/18, masked 15/18, recall 15/18, changed followed 9/18.
- All 27 masked cards were recognised: a famous candidate's platform can't be masked.
- **At the second ad, memory is wrong and the card is right.** With no card it misremembered the ad (0/3). Given the card, it chose stop-and-frisk every time. That's the clearest case of the card, not memory, producing the real choice.

**Run 3, tuning 1, N = 3** (`87c97f8`):
- Tuning 1 tells the campaigner the facts it's given are this campaign's facts, even where they differ from memory.
- card 17/18, masked 13/18, changed followed 10/18, which is within noise. Tuning 1 made no clear difference.

**Run 4, the new headline with twins and controls, N = 3** (`75662fe`):

| Grounding score | Result |
|---|---|
| Changed facts followed (moved off the 2013 choice) | **26/36 (72%)**: 11/18 on the first versions, 15/18 on the second |
| Control: same facts reworded, kept the card's choice | **17/18 (94%)** |
| Where memory was wrong, the card got the real choice | **2/2** (both at the second ad) |
| Twins the probe didn't recognise | 0 of 18 (the probe was leading; neutral from run 5) |

Plain agreement in run 4: card 16/18, nochips 15/18, masked 14/18, reworded 17/18, recall 16/18, twin 13/18. Adviser fidelity 6/9.

- **The agent follows the facts, not the wording.** Changed facts moved it 72% of the time; rewording alone left it 94% of the time. That's the strongest grounding result so far.
- **Where memory and the card disagree, the card wins:** 2/2 at the second ad. At budget it went the other way: memory knew the real choice (3/3), and the card mostly didn't take it (1/3).

**Run 5, masked and twin cards with a neutral probe, N = 3** (`b69da82`):
- The probe no longer says names were replaced; it only asks whether the decision comes from a real election.
- masked 14/18 on the real choice, twin 12/18. **Recognised as the real race: 18/18 masked, 18/18 twin.**
- **Nothing hides this race.** The model named the 2013 New York primary on every masked card and every twin, mapping each invented person to the real one ("Ellen Marsh is Christine Quinn").
- So the twins can't give the clean score they were built for. The grounding evidence has to come from changed facts against their control, and from the decisions where memory is wrong.
- **Recognising the race doesn't make the agent replay it.** At Weiner, the agent left the 2013 choice in five of six twin runs (runs 4 and 5), though the probe recognised every twin.

**Run 6, tuning 2, N = 3** (`96fcf73`):
- Tuning 2: the agent's reason must name the facts it rests on and the one fact that would most change its mind.
- Changed facts followed 25/36 (69%), control 16/18 (89%), memory wrong and card right 3/3. **No difference**, like tuning 1.
- **The hospital kept 2013 on all six changed cards, and the reasons showed why: the chips.** "C is the only option expected to raise my poll standing." The changed cards rewrote the facts but kept the chips set for the real situation. From run 7, changed and reworded cards have no chips.

**Run 7, changed and reworded cards without chips, N = 3** (`05c3057`). This is the headline:

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

- **Without the chips, it follows changed facts every time at four of six decisions**, positioning included.
- **Weiner's first changed card and the hospital still hold.** At the hospital it calls it "a hospital closing in my own borough": the changed card names no borough, so that part is memory.
- **At budget the card never takes the real choice** (0/3 without chips), while memory always knows it (3/3). That's the plainest case of the agent not reading its answer from memory.

**Held out, run once, frozen** (`89b03fe`, N = 3): card 23/33 (70%), recall 22/33 (67%), memory wrong and card right 2/11. Full table in `docs/evals.md` and `web/eval/runs/heldout-2026-11-15T12-10-54.md`.

**Free run 1, the whole system** (`b28d704`, before the memo-leak fix and tuning 1):
- The campaigner held 32 weekly meetings and gave 64 orders. The staff carried out 294 jobs and the rivals made 46 moves.
- It made **6 of 6 real choices** (break, hold, arrest, all on TV, family, frisk).
- De Blasio finished at 42.4 with no runoff (certified: 40.81). That's context, not the score.
- **Its orders read like this campaign's:** small-donor fundraising for matching funds, earned media on the pre-K tax and paid sick leave "framing the race as a tale of two cities", and organising with union locals and Black churches.
- **The staff work pushed de Blasio 1.6 points past the certified result.** The engine was fitted with a fixed weekly routine, and 64 live orders do more. That's a finding for the engine fit (#35).

### Decisions log (all 14–15 Nov)
- Score agreement with real choices, not vote share.
- No student: every role is an agent, with profiles from verified research, gated by date.
- Eleven held-out decisions, written before any run.
- Memory is measured three ways: masked, recall and changed.
- The campaigner sees what a student sees, plus a no-chips condition.
- After run 1, the target became grounding, not agreement.
- Memos skip dropped card lines.
- After run 3, the headline became changed-vs-reworded, agreement where memory is wrong, and unrecognised twins. Twins and controls were written before any of them ran.
- Tuning 2 (the reason names its facts) is kept, though it made no measurable difference.
- After run 6, changed and reworded cards drop the chips: the chips, written for the real situation, contradicted the changed facts.
- Tuning frozen at `bdd01be`; the held-out set runs once. No final N = 5 replay and no second free run: out of time for the hackathon.

### Limits
- The model knows this race.
- The held-out set was written by an agent that knows the outcome.
- The chips were fitted to the record.
- Voter groups the case doesn't simulate drift toward their real September figures, which hints at the future a little.
- Adviser fidelity has only three cases from two people.
- In the free run, after a different choice, the cards' text still describes 2013.

### How to run (in `web/`, with `ANTHROPIC_API_KEY`, and `LANGSMITH_API_KEY` for tracing)
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

---

## 10. Testing

**Automated checks** (in `web/`):

| Command | What it checks |
|---|---|
| `npx tsc --noEmit` and `npx eslint src scripts` | Types and lint |
| `npm run check:engine` | The real path lands on the certified result; the same inputs give the same world; every decision has a free option; the weakest play loses; the weekly plan moves the world |
| `npm run check:staff` | Orders and questions are told apart, a question spends nothing, and staff memory is capped |
| `npm run check:save` | A campaign comes back as it was, a bad save is refused, a reset leaves nothing, and loading is quiet (no stale notifications) |
| `npm run check:paper` | The paper's 15 prebuilt pictures: every 2013 story gets one, none repeats, and notes read as copy |
| `npm run check:memos` | Live decision memos (needs an API key): no part of the record leaks, and at most a third of memos land on the real choice |
| `npm run refit:case` | Not a check: refits the case's shifts after changing what staff or rival work is worth (it edits `mayor2013.ts`) |
| `npx next build` | The production build |

**The full test, 15 Nov** ([`docs/testing/2026-11-15-full-test.md`](testing/2026-11-15-full-test.md)): Devank's test of `main` at `ad2089c` on dev, production and production with no key. Nothing crashed.

Scenarios:
- The real choices with light staff use: a runoff at 39.3%.
- A power user: an outright win at 40.0%.
- Hands off: out of the race at 9.3%.
- Chaos testing: all handled.
- No key: a runoff at 36.8%.
- The demo path: a runoff at 38.5%.

| # | Finding | Status |
|---|---|---|
| 1 | A director revealed how the real race ended | Fixed (#63) |
| 2 | "Simulated staff · no API key" after Load demo start on a live server | Fixed (#63) |
| 3 | One order spent $816,150 | Fixed (#63): $250,000 cap per order |
| 4 | "$0" read as no budget | Fixed (#63) |
| 5 | Agents saw two "budget left" figures | Fixed (#63) |
| 6 | Map header wraps one word per line at 1440 px | Open on `main` (a fix is committed on `ui`, not merged) |
| 7 | Real choices with light staff use give a runoff, not the outright win | By design: staff work matters |
| 8 | Rivals pile onto the student's best district | Open |
| 9–11 | With no key: an offensive or nonsense plank is accepted; an adviser's reason can contradict its option | Open (rules fallback only) |
| 12 | Poll chip runs together at 1440 px | Open |
| 13–18 | Small items: vague error for an order to an empty post, "Let go" greyed out with no reason, a new hire remembers the predecessor's work, etc. | Open |

**Fixed since the test:**
- Stale notifications on demo load (#65).
- Live agents failing on Vercel (#67, below).
- The test also recorded fixes from before it: campaigns no longer get stuck (#54), orders after a decision carry it out (#55), and advisers quote the card's numbers (#60).

**Speed:**
- A director order takes 10–24 s (four in parallel about 20 s).
- Memos arrive about 4 s after the demo loads.
- With no key, an order takes about 3 s.

**Not tested:** phone and tablet widths, a whole class at once, a connection dropped mid-order.

---

## 11. How it is built

**Stack:**
- Next.js 16.4.6 (App Router, Turbopack), React 19.3, TypeScript, Tailwind, `motion`, `zustand`.
- MapLibre 6 for the map.
- `deepagents` and `@langchain/anthropic` for the agents.
- `@google/genai` 2.32.0 for the paper, `@spectrum-ts/*` 12.14.0 for iMessage.
- Read [`web/AGENTS.md`](../web/AGENTS.md) first: this Next.js version has breaking changes.

```
case file ──> simulate() ──┐
(lib/cases/mayor2013.ts)   ├──> the live world ──> every screen
work layer ────────────────┘    (worldNow, useCaseNow)
(staff jobs, weekly plan, candidate, planks, rivals)
        ^
        └── clock: one day at a time between decisions
```

1. **The case file is the data.** `lib/cases/mayor2013.ts` holds the race in the shape of `lib/cases/types.ts`. `simulate()` is pure: picks in, world out.
2. **The case store is the campaign** (`lib/cases/store.ts`): step, date, picks, work, bookings and the weekly plan.
3. **The work layer** holds everything done between decisions: staff jobs, plan spending, candidate appearances, planks and rival moves. Each is a `Work` entry folded in before `simulate()`.
4. **The clock** (`lib/cases/clock.ts`) moves one day at a time. It stops at decisions and pauses for the paper. Each day it spends the weekly plan, then the candidate's bookings.

The full map of files, API routes and tunable numbers is in [`web/README.md`](../web/README.md).

**Deploying on Vercel:**
- `@langchain/langgraph-sdk` bundles five ES modules without a `package.json`, which Vercel's runtime loads as CommonJS. That made every agent route fail in production.
- `web/scripts/esm-scopes.mjs` runs on `postinstall` and marks them as modules, and `outputFileTracingIncludes` in `next.config.ts` ships those files (#67).

---

## 12. Who built what

Built by two people, each directing Claude Code agents. They coordinated on a GitHub issue board (#32; see [`docs/AGENT_COORDINATION.md`](AGENT_COORDINATION.md)).

- **Devank Yadav:**
  - the engine and its fit to the record (#35, `check:engine`, headless runner);
  - the staff agents (#41: memory, live memos, number checks, order budgets);
  - the newspaper backend and Gemini (#27, #36, #52);
  - iMessage texting (#53);
  - save and resume, the demo start;
  - the full test and the judges' walkthrough.
- **Devaj Solanki:**
  - the interface (the 3D War room, the broadsheet paper, the map, the text pass);
  - the weekly spending plan (#33);
  - the evals (#28);
  - the case research and design.

**Sponsor tracks touched:**
- **LangChain:** deepagents staff, rivals and evals.
- **MLH Best Use of Gemini API:** the paper.
- **Photon:** iMessage.

---

## 13. Run it

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

**Environment** (`web/.env.example`; all optional, and every missing key falls back to rules):

| Variable | For |
|---|---|
| `ANTHROPIC_API_KEY` | Staff, rivals, planks, memos; the paper's fallback |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | The paper (default `gemini-3.8-flash`) |
| `SPECTRUM_PROJECT_ID`, `SPECTRUM_PROJECT_SECRET`, `SPECTRUM_IMESSAGE_LINE` | iMessage texts (local only for now) |
| `LANGSMITH_API_KEY` | Tracing the evals (on `feat/evals`; not in `.env.example` on `main`) |

**For a demo, use a production build:** `npm run build && npm run start`. It serves on port 3000, faster and with no dev overlay.

In development, the browser console has `window.caseStore` and `window.game`.

---

## 14. Every doc in the repo

| Doc | What it is |
|---|---|
| [`web/README.md`](../web/README.md) | How the code fits together: files, API routes, tunable numbers, the weekly plan, the engine fit |
| [`docs/demo/judges-walkthrough.md`](demo/judges-walkthrough.md) | The rehearsed two-minute demo, click by click, with fallbacks and likely questions |
| [`docs/testing/2026-11-15-full-test.md`](testing/2026-11-15-full-test.md) | The full test before the demo: six scenarios, 18 findings |
| [`docs/research/2013-mayoral-primary.md`](research/2013-mayoral-primary.md) | The sourced research behind the case (55 sources) |
| [`docs/research/case-shortlist.md`](research/case-shortlist.md) | Which races could be cases, and why 2013 first |
| [`docs/research/data-sources.md`](research/data-sources.md) | Public data for real NYC races and what's missing |
| [`docs/plans/staff-agents.md`](plans/staff-agents.md) | The staff agents plan agreed 15 Nov. Mostly built: real scheduling, per-order budgets, priced options, memory, follow-ups, live memos. Ordinary conversation was dropped |
| [`docs/plans/demo-polish.md`](plans/demo-polish.md) | The demo-polish plan: poll chart, "What changed", War room rings, election-night bars, save and resume, demo start, reset. Built |
| [`docs/ui-text-pass.md`](ui-text-pass.md) | The UI text pass: short versions with "Read more", type sizes |
| [`docs/AGENT_COORDINATION.md`](AGENT_COORDINATION.md) | How the agents coordinate through GitHub issues and the board (#32) |
| [`docs/evals.md`](evals.md) | The full evals report, summarised in §9 |

---

## 15. Limits and open questions

- **The record alone isn't the outright win.** With light staff use, the real choices give a narrow runoff, by design.
- **iMessage replies** need one long-running server. They don't work on serverless Vercel yet, and the routes need auth before the keys go public.
- **The rules fallback** (no key) accepts any plank text and can give an adviser a reason that contradicts its option.
- **Open questions:**
  - How strong staff work and rival moves should be next to the decisions (the sizes are first guesses).
  - Whether a student can replay the race from another campaign's side.
  - The intended user: high school or college, in class or solo.
- **More cases:** a case is a data file. Adding one means researching and writing one more file, not building more product.
