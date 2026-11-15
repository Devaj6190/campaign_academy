# Devpost draft (from README_PROPOSED.md)

## Project name
Campaign Academy

## Elevator pitch (200 characters max)
A learning tool for political science students: run a real campaign from the inside, with live LangChain deep agents playing the people in it, grounded in the historical record.

## Thumbnail / gallery (in this order)
1. `docs/readme/screens/war-room-live-order.jpg`: The War room during a live order: the director splits it between two organizers, and each agent's reasoning streams on the right.
2. `docs/readme/diagrams/architecture.svg` (export to PNG): System architecture.
3. `docs/readme/diagrams/one-order.svg` (PNG): Processing of one staff order.
4. `docs/readme/diagrams/loop.svg` (PNG): The learning cycle.
5. `docs/readme/screens/decision-card.jpg`: A decision point. Every line is cited to its source.
6. `docs/readme/diagrams/record-vs-simulation.svg` (PNG): Record and simulation, kept separate.
7. `docs/readme/diagrams/accuracy.svg` (PNG): Simulated and certified vote share.
8. `docs/readme/diagrams/evals.svg` (PNG): Evals: agent decisions against the record.
9. `docs/readme/screens/morning-paper.jpg`: The morning paper. The lead is the real headline, cited.

---

## About the project (story)

### Inspiration
Political science students learn campaigns from the outside: readings, polls and case write-ups, all written after the result is known. They never have to make the calls themselves: how to spend a limited budget, which voters to go after, what to tell a team, how to answer a rival's move. And once you know how a race ended, every choice in it looks obvious. We wanted students to make those calls on a real race without knowing the ending.

### What it does
Campaign Academy turns a real race into a **case**: a sourced record of the candidates, polls, money, events and voters, plus the moments where the real campaign had to decide. We built one case: the 2013 Democratic primary for Mayor of New York, run from inside Bill de Blasio's campaign.

- **The briefing** shows the race as it really stood when the campaign began.
- **At each decision point** the clock stops. Two of the student's own staff argue for different options; each option shows its price and which way it moves things.
- **After the student chooses,** they see what changed and what the real campaign did. How it turned out is held back to the end.
- **Between decisions the campaign runs.** The student directs a staff of live agents in plain language, sends the candidate out on a real map of the city, sets a weekly spending plan and adds planks to the platform. Rival campaigns make their own moves, and a morning paper reports it all.
- **On election night** the count comes in district by district, and the real result appears beside the student's.

Every fact on screen is cited, every number is labelled real or simulated, and the tool never says which option was best.

### How we built it
- **Live staff as LangChain deep agents.** Each order builds a director with `createDeepAgent` (Claude Opus 5.5) whose team are subagents (Claude Haiku 5.5). The director plans, hands each job to the right person with the `task` tool (independent jobs run in parallel) and closes with `send_report`. Each team member acts through one tool, `take_action`, writing its reason before its choice. Each post keeps a memory file (`/memory/AGENTS.md`). Every step streams to the War room as NDJSON events, so the student watches each agent's reasoning live.
- **Rival campaigns** are deep agents too, one per rival, run in parallel after each decision with one tool, `make_move`.
- **An end-of-election debrief** is a read-only deep agent (Claude Sonnet 5.5) with `write_todos`, a virtual filesystem of the whole campaign and the sourced record, and seven subagents in parallel.
- **The simulation engine** is pure TypeScript: decisions and work in, campaign state out. No model ever sets a poll figure, a cost or an effect; the agents choose actions and the engine prices and scores them. It is fitted to the record: the real choices land every candidate within 0.2 points of the certified result, and an automated check fails if it drifts.
- **Guards on every model output:** a figure the agent was never shown is sent back once, then cut; any sentence that reaches past the campaign's date is removed.
- **The morning paper** is written by Gemini (`gemini-3.8-flash`), with the same number check. The lead story is always the real headline, cited.
- **Texts on your phone** through Photon iMessage: staff remarks arrive as texts, and you can reply with an order.
- **Evals** traced in LangSmith test whether agents playing real people decide as those people did.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind, zustand, MapLibre with NYC Open Data, deployed on Vercel.

### Challenges we ran into
- **The model already knows this race.** Asked with no card, it names the real 2013 choice at five of six decisions, and masking names didn't hide it. So we measured grounding instead: rewrite the facts to point elsewhere and the agent moves 78% of the time; reword the same facts and it holds 94% of the time. On 11 held-out decisions, the card adds little over memory (70% against 67%), and we report that.
- **Keeping the future out.** Agents kept leaking how the race ended. We added a hindsight filter on every output and assigned memo writers their option by rotation, because left to choose, the model picked the real option every time.
- **Agents inventing numbers.** A number ledger now holds every figure an agent was shown; anything else is sent back.
- **Deploying agents on Vercel.** A LangGraph dependency shipped ES modules without a package.json, which broke every agent route in production until we patched it on install.

### Accomplishments that we're proud of
- Live deep agents a student can direct in plain language, with their reasoning and hand-offs visible as they work.
- A simulation that lands on the real result when you play the real choices, and lets you lose when you don't.
- Every fact cited, with the record and the simulation kept apart.
- Honest evals that show where the agents follow evidence and where memory still does the work.
- Feedback from a Princeton professor, Prof. Samuel S.-H. Wang, which we built into how spending works.

### What we learned
- Grounding is measurable even when a model knows the answer: change the evidence, keep the wording, and see what moves.
- Agents should choose and explain; deterministic code should hold the numbers.
- Making the agents' work visible is what makes them teachable.

### What's next for Campaign Academy
- More cases: each new race is one researched case file, not new code.
- Class mode: a teacher assigns a case and compares how students decided.
- Playing the same race from a rival campaign's side.

---

## Built with (tags)
langchain, deepagents, langgraph, langsmith, claude, anthropic, gemini, photon, next.js, react, typescript, tailwindcss, zustand, maplibre, vercel, nyc-open-data

## Try it out links
- GitHub: https://github.com/Devaj6190/campaign_academy
- Live site: https://campaign-academy.vercel.app (only if the fresh deploy is live; it was stuck on an old build)

## Video demo link
(paste when ready)

## Hackathon questions (fill from your answers)
- Main track (one only): Best Education Hack
- Sponsor tracks: Best use of deepagents (LangChain); Best Practical AI Innovation (Amazon); Forward Deployed Challenge (Peri); MLH Best Use of Gemini API; Photon messaging agent
- Peri requirements: organization Princeton University; person Prof. Samuel S.-H. Wang, Princeton Neuroscience Institute; evidence: a direct quote from his email reply
- Discord usernames: (need from you)
- Team members on Devpost: Devaj Solanki, Devank Yadav
