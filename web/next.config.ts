import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The staff agents (deepagents/LangChain) run as plain Node packages, not bundled: they pull optional deps like ws.
  serverExternalPackages: ["deepagents", "langsmith", "langchain", "@langchain/core", "@langchain/langgraph", "@langchain/anthropic", "@spectrum-ts/core", "@spectrum-ts/imessage"],
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
