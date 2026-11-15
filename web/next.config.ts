import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The staff agents (deepagents/LangChain) run as plain Node packages, not bundled: they pull optional deps like ws.
  serverExternalPackages: ["deepagents", "langsmith", "langchain", "@langchain/core", "@langchain/langgraph", "@langchain/anthropic", "@spectrum-ts/core", "@spectrum-ts/imessage"],
  // The package.json files scripts/esm-scopes.mjs writes, so the deployed functions load those modules as ES modules.
  outputFileTracingIncludes: { "/api/**/*": ["./node_modules/@langchain/langgraph-sdk/dist/node_modules/.pnpm/*/node_modules/*/package.json"] },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
