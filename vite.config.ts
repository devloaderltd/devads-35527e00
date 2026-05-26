import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    target: "vercel",
    server: { entry: "server" },
  },
  cloudflare: false,
});
