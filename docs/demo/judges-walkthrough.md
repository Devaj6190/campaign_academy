# The judges' walkthrough: two minutes, click by click

This is rehearsed on `main` with the Gemini paper (#64) and the quiet demo load (#65). Timings are from live runs. Every judge gets the same start: one click resets it.

## Before the judges arrive (10 minutes, once)

1. **Run the production build** (faster than dev, with no dev overlays):
   ```bash
   cd web && npm run build && npm run start
   ```
   It serves on port 3000. `web/.env.local` needs `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`.
2. **Tab A, the live demo:** open `http://localhost:3000`, then the **Desk menu (⋯)** in the left sidebar, then **Load demo start**.
   - Go to **War room**: the badge at the top right must say **Live agents**. If it says "Simulated staff", the key or the network is down (see "If something goes wrong").
3. **Tab B, election night** (a different address, so it keeps its own campaign): open `http://127.0.0.1:3000`, then **⋯**, then **Load demo start**. Play it to the end:
   - click **Decision waiting** (top right), pick an option, then **Decide** in the bar at the bottom; repeat for all six decisions;
   - between decisions, click the **Skip** button (⏭) in the top bar until the next **Decision waiting** appears;
   - after the sixth, Skip once more. The **Map** opens on election night and counts the districts in.

   The real 2013 choices are: *Leave him alone*, *Join the civil disobedience and accept arrest*, *Hold everything for television*, *A family member introduces you*, *Make stop-and-frisk the second ad*. They land near 39 to 40%: a narrow win or a runoff against Thompson. Either ending works (see 1:45 below). Leave tab B on the Map's **Your election night**.
4. **The screen:** the browser window at least 1440 pixels wide (1920 is best), at 100% zoom, in full screen. Notifications off, other tabs closed.
5. **Tab A on the Case tab.** You start there.

## The two minutes (a judge at the table)

| Time | Click | Say |
|---|---|---|
| **0:00** | Nothing. Tab A, Case tab, May 22, 2013 | "Nobody learns to run a campaign by running one. Campaign Academy puts you inside a real race: New York's 2013 Democratic primary for mayor, as Bill de Blasio's campaign. The record is real and cited; your choices and your AI staff change what happens." |
| **0:15** | Point at the **top bar**: the poll, money left, days left | "May 22, 2013. Anthony Weiner has just entered with $4.8 million. We're fourth, at 9%." |
| **0:25** | **WAR ROOM** tab, then click **Marcus Bell** (the Field Director) in the room. The camera zooms in on him and his team | "This is my staff. Every director is a live AI agent with a personality and a memory of this campaign." |
| **0:30** | In the box at the bottom right, type **`Canvass Black voters in Crown Heights and Flatbush this week, $25,000`** and press **Enter** | "I give orders in plain English, with a budget." |
| **0:35** | Point at the panel: his reasoning streams under **Thinking**, he hands jobs to his team (Andre, Rosa…), and a ring spins around him | "He plans, delegates to his team, and they act. Every number they quote is checked against the simulation, and they can't spend more than I gave them." |
| **0:50** | The report lands in about 15 seconds: the money spent, support in **Crown Heights +3**, and a notification at the bottom left | "Real cost, real effect, and he asks for more money when he thinks it's worth it." |
| **0:55** | **Morning paper** in the left sidebar | "Every morning the paper: the lead story is the real 2013 headline, cited. The stories about our own campaign are written by Gemini from what our simulation did." Point at **Simulated stories written by Gemini** under the masthead |
| **1:05** | Close the paper (**×**). Click **Decision waiting** (top right) | "Now the big call: what do we do about Weiner?" |
| **1:10** | Scroll a little to **Your advisers** | "Two of my directors argue opposite options, written live from our numbers, not from the history books." |
| **1:20** | Click the **Campaign Manager's card** ("Spend early on name recognition"), then **Decide** in the bar at the bottom | "I'll follow my Campaign Manager." |
| **1:25** | Point at **What changed**: the poll goes 9% to 12%, money goes $4.3M to $3.6M | "The engine moves the race." |
| **1:30** | Point at **What the real campaign did**: *A different call: Leave him alone and stay on plan* | "Then it shows what the real campaign did, and why. You learn from the gap." |
| **1:40** | Switch to **tab B** (election night map) | "Play all six decisions and you reach primary night, district by district." |
| **1:45** | Point at the result card (*Outright win* or *Runoff against Bill Thompson*), then click **Real result 2013** | "The real de Blasio got 40.8% and won without a runoff. Did you beat him?" |
| **1:55** | Back to tab A | "Campaign Academy: run a real campaign, with an AI staff, and see how your choices compare with history." |

**After this judge, reset (10 seconds):** in tab A, **⋯**, then **Load demo start**, then **Load demo start** again in the confirm box. Leave tab B as it is.

## Don't
- **Don't press Run (▶) or Skip in tab A.** The days move on and a paper notice can pop up mid-pitch.
- **Don't wait in silence for an agent.** Keep talking; the report lands on its own.

## If something goes wrong
- **An agent is slow (over 20 seconds):** keep going to the paper and the decision. The report comes in behind, as a notification.
  - For a fast, sure demo of the same idea: in Marcus's panel, click **Do this** on one of his priced options. It runs exactly the steps shown, in a few seconds.
- **No network, or the badge says "Simulated staff · no API key":** say "with no key, every agent falls back to a rules version, so the app still runs", and carry on. Orders still work, in about 3 seconds.
- **The decision card closed by mistake:** **Decision waiting** at the top right opens it again.
- **The War room is zoomed in on someone:** **Whole room** (top left of the room), or Esc.

## For sponsor judges (add about 20 seconds)
- **LangChain (`deepagents`):**
  - Each director is a `createDeepAgent` with its team as subagents.
  - It plans with `write_todos` and delegates with the `task` tool. The Thinking panel shows that live.
  - It keeps a memory file (`/memory/AGENTS.md`) of what worked in this campaign.
  - The rivals are agents too, planning their own moves after each decision.
- **Gemini:**
  - The newsroom's stories and letters, and the three ways to answer the lead story (**Answer the story** in the paper), are written by `gemini-3.8-flash`.
  - Every story passes the same number check: a story with a number not in the facts is rejected and the template stays.
  - If Gemini fails, Claude writes it.

## Questions judges may ask
- **Is the data real?**
  - The race, the polls, the money and the events are the real 2013 record, each with a citation (the small numbers).
  - What the student's campaign does is simulated, and every simulated part is labelled.
- **How accurate is the simulation?** Playing the real campaign's choices with a typical staff routine gives 40.7% against the certified 40.8%. `npm run check:engine` holds it there.
- **Can the AI just tell you what happened?** No. The staff only know what was known on that date. Ask them how it ended and they say nobody can know yet. The debrief shows the record at the end.
- **Can you lose?** Yes. Weak choices cost support, and the weakest play finishes third and misses the runoff.
