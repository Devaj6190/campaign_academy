// npm run demo:start — builds the demo start point (src/lib/demo/build.ts) and writes src/lib/demo/weiner.json.
// Runs the game by its rules with no API key, so the same code gives the same moment every time it is rebuilt.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

delete process.env.ANTHROPIC_API_KEY;
const src = fileURLToPath(new URL("../src/", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@/": src } });

// The game calls its own routes (/api/...). Here each call goes straight to that route's handler.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (typeof url === "string" && url.startsWith("/api/")) {
    const { POST } = await jiti.import(`${src}app${url}/route.ts`);
    return POST(new Request(`http://local${url}`, init));
  }
  return realFetch(url, init);
};
// The rules fallbacks note that they are standing in; that is expected here.
console.warn = () => {};

const { buildDemo } = await jiti.import("../src/lib/demo/build.ts");
const { save, problems, report } = await buildDemo();
console.log(report.join("\n"));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
writeFileSync(new URL("../src/lib/demo/weiner.json", import.meta.url), JSON.stringify(save) + "\n");
console.log("\nWrote src/lib/demo/weiner.json.");
process.exit(0);
