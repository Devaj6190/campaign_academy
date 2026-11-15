// npm run check:paper — the paper's picture desk and its newspaper wording. No API key needed.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@/": fileURLToPath(new URL("../src/", import.meta.url)) } });
const { pictureFor, DESK_IDS } = await jiti.import("../src/lib/paper/pictures.ts");
const { headlineOf, prose } = await jiti.import("../src/lib/paper/edition.ts");
const { mayor2013 } = await jiti.import("../src/lib/cases/mayor2013.ts");

const problems = [];
const expect = (ok, what) => ok || problems.push(what);

// Every picture on the desk is prebuilt.
for (const id of DESK_IDS) expect(existsSync(new URL(`../public/art/paper/${id}.webp`, import.meta.url)), `missing public/art/paper/${id}.webp`);

// Every story in the 2013 record gets a picture of its own topic.
const want = { "spending limit": "fundraising", forum: "debate", "war chest": "fundraising", arrested: "court", "first television ad": "ads", "ruled stop-and-frisk": "policing", "Brooklyn church": "policing" };
for (const p of mayor2013.press) {
  const pic = pictureFor(p.summary, new Set());
  expect(pic, `no picture for: ${p.summary.slice(0, 60)}`);
  for (const [k, id] of Object.entries(want)) if (p.summary.includes(k)) expect(pic?.id === id, `"${k}" got ${pic?.id}, wanted ${id}`);
}
// A page never repeats a picture.
const used = new Set();
const ids = ["stop-and-frisk", "a police commissioner", "stop-and-frisk again"].map((t) => pictureFor(t, used)?.id ?? null);
expect(ids[0] === "policing" && ids[1] === null && ids[2] === null, `repeat on one page: ${ids}`);

// Newspaper wording from the simulation's notes.
expect(headlineOf(`Bill de Blasio answered the morning paper's lead ("Mayoral hopefuls reported six months of fundraising"): The campaign ties the story to twelve years.`) === "Bill de Blasio answered the morning paper's lead", "headline keeps the aside or the clause");
expect(headlineOf("Field: knocked 300 doors in Astoria.") === "knocked 300 doors in Astoria", "headline keeps a one-word label");
expect(prose("Knocked 1,448 doors in Jackson Heights. Support +3.5. Two outlets picked up the story. Women +0.6.") === "Knocked 1,448 doors in Jackson Heights. Two outlets picked up the story.", "prose keeps the tallies");

if (problems.length) {
  console.error(`${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Paper checks pass: ${DESK_IDS.length} prebuilt pictures, every 2013 story gets one, none repeats, and the notes read as copy.`);
