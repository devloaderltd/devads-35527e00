// Default config = Cloudflare (used by Lovable preview + devads.lovable.app).
// For VPS / Node deployment, build with:
//   BUILD_TARGET=node bun run build
// then run: node .output/server/index.mjs
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isNode = process.env.BUILD_TARGET === "node";

export default defineConfig(
  isNode
    ? {
        cloudflare: false,
        tanstackStart: { server: { preset: "node-server" } },
        ssr: { noExternal: ["h3-v2"] },
      }
    : {
        ssr: { noExternal: ["h3-v2"] },
      },
);
