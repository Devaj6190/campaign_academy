// @langchain/langgraph-sdk ships p-retry, p-queue and others as ES modules under its own dist/node_modules, with no
// package.json beside them. Node only runs them as ES modules by guessing from the syntax, and Vercel's runtime does not
// guess: every route that loads deepagents failed with "Cannot use import statement outside a module". A package.json
// saying "type": "module" next to each one makes that explicit. Runs after every install (package.json postinstall).
// ponytail: remove when the sdk stops bundling its dependencies this way.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "node_modules/@langchain/langgraph-sdk/dist/node_modules/.pnpm";
if (existsSync(root)) {
  for (const version of readdirSync(root)) {
    const mods = join(root, version, "node_modules");
    if (!existsSync(mods)) continue;
    for (const name of readdirSync(mods)) {
      const dirs = name.startsWith("@") ? readdirSync(join(mods, name)).map((n) => join(mods, name, n)) : [join(mods, name)];
      for (const dir of dirs) {
        const pkg = join(dir, "package.json");
        if (!existsSync(pkg)) writeFileSync(pkg, '{ "type": "module" }\n');
      }
    }
  }
}
