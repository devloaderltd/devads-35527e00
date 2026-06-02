// Default config = Cloudflare (used by Lovable preview + devads.lovable.app).
// For VPS / Node deployment, build with:
//   BUILD_TARGET=node bun run build
// then run: node .output/server/index.mjs
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isNode = process.env.BUILD_TARGET === "node";

// Force h3-v2 (npm alias for h3@2) to be bundled into the SSR/Worker output.
// Otherwise the Cloudflare worker bundle emits a reference to "assets/h3-v2"
// that doesn't exist at runtime and every SSR request fails with 500.
const sharedVite = { ssr: { noExternal: ["h3-v2"] as string[] } };

export default defineConfig(
  isNode
    ? {
        cloudflare: false,
        tanstackStart: { server: { preset: "node-server" } },
        vite: sharedVite,
      }
    : {
        vite: sharedVite,
      },
);
