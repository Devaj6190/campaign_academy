// npm run check:save — saving, loading and resetting the campaign (src/lib/saveCheck.ts). No API key needed.
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

delete process.env.ANTHROPIC_API_KEY;
const jiti = createJiti(import.meta.url, { alias: { "@/": fileURLToPath(new URL("../src/", import.meta.url)) } });
// The browser's storage and page events, as far as the save code uses them.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
// The paper asks the newsroom over the network; there is no server here, and the template stands.
console.warn = () => {};

const { checkSave } = await jiti.import("../src/lib/saveCheck.ts");
const { problems, report } = await checkSave();
console.log(report.join("\n"));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nSave checks pass: a campaign comes back as it was, a bad save is refused, and a reset leaves nothing.");
process.exit(0);
