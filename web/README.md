# Campaign Academy: web app

The app described in the repo's root `README.md`. Next.js, one page, five tabs. Read `AGENTS.md` first: this Next.js version has breaking changes.

```bash
npm install
npm run dev
```

The staff, the rivals and plank shaping are live agents (`deepagents`, `@langchain/anthropic`). They need `ANTHROPIC_API_KEY` in `web/.env.local` (copy `web/.env.example`). Without a key every agent route falls back to a rules version, and the War room says so.

## How it fits together

```
case file ──> simulate() ──┐
(lib/cases/mayor2013.ts)   ├──> the live world ──> every screen
work layer ────────────────┘    (worldNow, useCaseNow)
(staff jobs, candidate, planks, rivals)
        ^
        └── clock: one day at a time between decisions
```

1. **The case file is the data.** `lib/cases/mayor2013.ts` holds one real race in the shape defined by `lib/cases/types.ts`. Nothing writes to it. `simulate()` in `types.ts` is pure: the student's picks in, a world (budget, poll, voter groups) out. `checkCase()` in `lib/cases/index.ts` fails loudly if the real campaign's own choices stop landing within two points of the certified result.
2. **The case store is the campaign.** `lib/cases/store.ts` holds where the student is and what they chose: `step` (what the Case tab shows), `at` (the furthest step reached, which is the live one), `date`, `picks`, and `work`.
3. **The work layer sits on top of the picks.** Everything done between decisions is a `Work` entry: a staff job, a candidate appearance, a platform plank, a rival's move. `withWork()` folds the entries into the case's starting point before `simulate()` runs, so `simulate()` never changes. Read the live world with `worldNow()` or the `useCaseNow()` hook, never by calling `simulate()` yourself.
4. **The clock moves the date.** `lib/cases/clock.ts` advances one day at a time. It stops at each decision date and opens the decision card (`components/Clock.tsx`), and it cannot run while a decision is waiting. Mornings after a press item or a rival's move pause it for the paper.

## Where things are

| Area | Files |
|---|---|
| Case data and rules | `lib/cases/types.ts`, `mayor2013.ts`, `index.ts`, `platform.ts` |
| Live state | `lib/cases/store.ts` (world, work layer), `lib/cases/clock.ts` |
| Voter groups | `lib/cases/mayor2013-factions.ts` (22 groups, real poll numbers), `mayor2013-leanings.ts` (inferred, see below) |
| Staff agents | `lib/staff/agents.ts` (the agents), `run.ts` (snapshot of the case, landing a job, candidate appearances), `offline.ts` (rules fallback), `speak.ts` (unprompted remarks), `roster.ts`, `protocol.ts`, `world.ts` |
| What an action does | `lib/engine/catalog.ts` (the actions), `lib/engine/resolve.ts` (cost and effect of one action) |
| Rivals | `lib/cases/rivals.ts` (when they plan, how a move lands), `lib/engine/rivalAgent.ts` (the agent and its rules fallback) |
| Platform planks | `lib/manifesto/` (shape, rules, run), `components/PlankDesk.tsx` |
| Election night | `lib/cases/night.ts`, `lib/cases/mayor2013-ad.json` (certified result by Assembly District) |
| API routes | `app/api/staff/instruct`, `staff/candidates`, `staff/speak`, `rivals/plan`, `manifesto/shape` |
| Screens | `views/CaseView.tsx`, `Profile.tsx`, `WarRoom.tsx`, `MapView.tsx`, `VoterGroups.tsx` (the Factions tab) |
| Shell | `app/page.tsx`, `components/TopBar.tsx`, `Sidebar.tsx`, `Paper.tsx`, `Toasts.tsx` |
| Map data | `lib/nyc.json` (real NYC Open Data; refresh with `node scripts/build-data.mjs`), `lib/geo.ts` |

`lib/store.ts` (`useGame`) is interface state only for the screens above: which tab is open, what is selected, the staff roster and who is busy. The campaign's money, poll and voter groups are not in it.

## Real and simulated

**Real, with sources:** everything in the case file's record (candidates, dates, press, what the real campaign did), the starting poll, the 22 voter groups' sizes and February and September 2013 support (two Marist poll tables, every number checked against the PDFs), the certified result by Assembly District, the street map and census figures.

**Simulated, and labelled so on screen:** what each decision option moves, what staff jobs, appearances, planks and rival moves achieve, and the election-night swing.

**Inferred, kept apart:** `mayor2013-leanings.ts` says what each voter group is likely to value. That is not poll data. Groups defined only by race, religion or gender are left empty unless a 2013 poll line supports a view. The poll lines in that file came from one research pass and should be rechecked against the PDFs before publishing.

## Numbers you can tune

Each is a first guess, in one place.

| What | Where | Now |
|---|---|---|
| Staff money scale; points per unit of district and group work | `SCALE` in `lib/staff/run.ts` | 1:10, 0.5, 0.15 |
| All staff and candidate work fades as it nears this many citywide points | `STAFF_CAP` in `lib/staff/run.ts` | 5 |
| Each rival's own moves fade as they near this many points | `RIVAL_CAP` in `lib/cases/rivals.ts` | 4 |
| What a rival can spend per round, and how much of its gain the student loses | `BUDGET`, `CONTEST` in `lib/cases/rivals.ts` | $150,000, half |
| Points a plank moves in a group it serves or costs; the most one plank moves citywide | `PLANK`, `PLANK_CITYWIDE` in `lib/manifesto/rules.ts` | 1.5, 2, 0.4 |
| Candidate appearances per day | `DAILY` in `lib/staff/run.ts` | 2 |
| Length of a day; speeds | `DAY_MS`, `SPEEDS` in `lib/cases/clock.ts` | 2 seconds; 1, 2, 5 |
| Poll points a rival's move must cost you before the top bar's poll strip glows | `RIVAL_HIT` in `components/TopBar.tsx` | 0.1 |
| Days between polls in the morning paper | `POLL_EVERY` in `lib/paper/edition.ts` | 7 |
| Days between unprompted staff remarks | `GAP`, `REPEAT` in `lib/staff/speak.ts` | 8, 30 |

Money the staff raise pays for staff work but never lifts the campaign above the spending cap (`staffMoney` in `lib/cases/store.ts`).

With the rivals acting and no staff work, the real campaign's six choices finish on about 38.5 percent and a runoff. Without rivals the same choices finish on 41.0 against the certified 40.81.

## The first version

The first version simulated a fictional race. Its code is no longer in the tree. It can be read at the tag `first-version-code` (`git show first-version-code:web/src/lib/relations.ts`, for example).

Two of its features are to be rebuilt on the case and have issues: standing budgets the student can allocate (#33) and the links between voter groups that move together (#34). Its map filter by voter group is already rebuilt (`views/MapView.tsx`, for the groups the census can place). Its calendar, tactics and debates were dropped.

Three of Devank's branches that were built on the first version's engine are kept the same way, as the tags `archive/feat-combined`, `archive/feat-money` and `archive/feat-newspaper`.

## Checks

```bash
npx tsc --noEmit -p .
npx eslint src
npx next build
```

In development the browser console has two handles: `window.caseStore` (the case store) and `window.game` (interface state).
