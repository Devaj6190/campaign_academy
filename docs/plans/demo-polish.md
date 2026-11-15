# Demo polish: see things happen, and a demo that cannot break

Plan agreed with Devank on 15 November 2026. Display and demo tooling only: no game rule, engine number or case data
changes, so `check:engine` is unaffected. One commit per item, pushed after each, so any item can be reverted alone.

Kept to the existing black-and-gold design: no new colour palette, and effects only in a few important places.

## Branch A: `feat/demo-polish`, from `main` now

These do not depend on the open PRs (#42, #43, #45, #46).

### A1. Live poll chart
- A helper computes every candidate's poll on each day so far from the game's own state, so nothing new is stored.
- The chart opens from the top bar's poll strip: one line per candidate, the student's in gold and the rivals in the
  existing neutral greys, each labelled at its end. It is drawn up to today and grows as the clock runs.
- Markers on the student's decisions and the case's big moments (Weiner entering, the stop-and-frisk ruling). Hovering
  a marker says what happened.
- Drawn in SVG to match the look; no chart library.
- **Done when:** after a few weeks of play the chart shows each candidate's path, and a decision's marker sits where
  the line moved.

### A2. "What your decision did"
- After Decide, a short card shows the change: the student's poll and each voter group moving from before to after,
  and the money spent. Bars animate once.
- It closes on its own or with a click. The same numbers stay in the decision's record.
- **Done when:** each of the six decisions shows its card once, with figures that match the case screen afterwards.

### A3. War room in motion
- A progress ring on a staffer while their job runs.
- When a result lands, its money shows on the node for a moment ("−$18,000", "+$114k"), in the existing red and green.
- **Done when:** an order with two jobs shows both rings filling and each amount as it lands.

### A4. Answers that type out, in two places only
- The director's final report and the answer above option cards reveal word by word the first time they appear.
- Everything else (thoughts, memos, notifications, old messages, anything after a reload) appears at once. A click
  skips the effect; reduced-motion settings turn it off.
- It is a presentation effect: the answer has already arrived and is revealed, not streamed from the model.
- **Done when:** a new report types out once, and scrolling back to it does not replay it.

### A5. Election night results
- Beside the map while districts report: a bar per candidate counting up with votes and percentage, the 40% line
  marked, and "23 of 65 districts reporting".
- When the count ends, one line in the existing style: an outright win, a runoff and against whom, or a loss, with a
  link to the debrief.
- **Done when:** a finished campaign counts through to the right line for a win, a runoff and a loss.

## Branch B: after Devaj merges #42, #43 and #45

These must save and restore state that only exists in those PRs (the calendar, staff memory, follow-ups, memos). Built
now, they would stack a fifth branch on three unmerged ones.

### B1. Save and resume
- Every part of the campaign is saved in the browser as it changes: decisions, date, work, calendar, staff chats and
  memory, follow-ups, rival state, the paper's archive, planks and memos.
- A reload or a crash resumes where it was, with the clock paused. An agent run that was in flight shows as
  interrupted in its chat, with nothing half-applied.
- Saves carry a version; one from an older version is discarded, never loaded broken.
- **Done when:** a reload mid-campaign restores every screen, and an old-version save starts fresh.

### B2. Demo start point
- One click loads a prepared moment: the day Weiner enters, the first decision made, staff jobs done, events on the
  calendar, staff memories, rival moves on the map, the paper's archive filled.
- Built by a script from the game's own rules and saved in B1's format, so it stays valid and can be regenerated.
- **Done when:** the demo moment loads the same every time.

### B3. Reset campaign
- Asks to confirm, then clears every store and the save. "Play it again" today restarts the case but leaves staff
  chats and other state behind; this fixes that.
- Demo start and reset sit in a small menu in the sidebar's Desk section.
- **Done when:** after a reset no trace of the old campaign is on any screen.

## Checks for every item
- `tsc`, `eslint src scripts`, `next build`.
- In the browser, with a screenshot of each.
- A heads-up on the coordination board (#32) before touching Devaj's screens (top bar, Case tab, Map).

## Not in this plan
- One colour per candidate (removed by Devank).
- The live map markers, debates, endorsements, commissioned polling, campaign journal, ad studio, keyboard shortcuts,
  the live-agents counter, the paper's arrival.
