# UI text pass: Case and Profile

Branch `ui`. Settled with Devaj on 14 Nov 2026. This is the first of the UI changes: less text on screen, bigger type, easy to scan in a demo. Not minimalist.

## Decisions

1. **Short on screen, original one click away.** Each sentence shows a shorter version that says the same thing. The original wording stays behind a "Read more" control on the same screen. Nothing researched is deleted.
2. **Short versions are written by hand** and stored next to each sentence in the case file. They are not newspaper headlines: plain, concise sentences. Some short paragraphs remain.
3. **Type sizes.** Body 16px. Nothing in scope smaller than 13px. Key figures 32 to 48px. Section headings about 22px.
4. **Scope of this pass:** the Case tab's briefing and decision steps, and Profile. Devaj sees screenshots before the same rules go to War room, Map, Factions and the paper.
5. **Left exactly as they are:** the top bar and sidebar, the decision option cards (the whole "What do you do?" block), the Debrief, and the Platform section on Profile (including the collapsed platform panel inside a decision).

## Rules for a short version

- Same facts and same numbers as its sentence. No new claim, no new number, no verdict.
- About 12 words or fewer.
- Keeps the sentence's source markers and its Estimate label.
- A sentence with no short version shows as it does today.

## Data change (shared with Devank)

- `Claim` and `Advice` in `web/src/lib/cases/types.ts` each gain an optional `short?: string`.
- `web/src/lib/cases/mayor2013.ts` gets a `short` for the sentences shown in scope: briefing, candidates' background, what the starting numbers rest on, and each decision's since-notes, situation, advisers and "what the real campaign did". About 75 lines.
- `checkCase()` fails if a `short` contains a number that its sentence does not (reusing `numbersIn` from `lib/paper/edition.ts`).
- Heads-up posted on the Coordination Board (#32) before the change is pushed.

## Screen changes

**Shared pieces**
- `Claims` (in `views/CaseView.tsx`) shows `short` when present, with one "Read more" per block that swaps the block to the original wording. A size option gives 16px; the default is unchanged, so the Debrief renders as today.
- `Section` (in `components/ui.tsx`) gets an optional larger heading. Default unchanged.

**Case: briefing**
- A row of big figures from existing fields: your poll and place, the leader's poll, days to the primary, the share needed to win outright, money to spend.
- The race facts as short lines at 16px.
- Candidates as rows: name, poll figure, standing, one short line each.
- "How this works" cut to the lesson and one short line; the longer explanation and what the numbers rest on go behind "Read more".

**Case: decision step**
- "Your campaign now": your poll figure large, bars and labels at 13px or more.
- Since-notes and situation as short lines; decision title larger.
- Advisers: name, the option they argue for made prominent, a short version of the argument, On the record / Predicted label at 13px.
- "What changed": figures large.
- "What the real campaign did": the call they made as the large line, short lines under it.

**Profile**
- The four figures raised to the figure size; their sub-lines to 13px.
- The simulated/real note cut to one short line.
- Background as short lines at 16px.
- "Your additions to the platform": the intro paragraph cut to one short line, sizes to 13px or more. This is interface wording, not case data, so it is reworded in place.
- Side panel (the race, opponents): names and figures larger, notes at 13px.

## Done when

- At 1440 by 900, the briefing and a decision show no block of more than three lines of running text before "Read more".
- Nothing in scope is smaller than 13px, apart from the superscript source markers and the Real/Simulated tags, which are shared with the screens not yet touched.
- Every short line shows its sources; "Read more" shows the original wording.
- The four left-alone areas are as before. Two things next to them did change: the "What do you do?" heading is the larger size like the other headings (the option cards under it are untouched), and the "Your campaign now" strip is one component, so it is also larger above the Debrief.
- `npx tsc --noEmit -p .`, `npx eslint src` and `npx next build` pass, and `checkCase()` passes.
- Devaj has screenshots of the briefing, a decision before and after deciding, and Profile.
