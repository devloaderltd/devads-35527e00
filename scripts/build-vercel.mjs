#!/usr/bin/env node
/**
 * Builds the project for Vercel using the Build Output API (v3).
 *
 * 1. Runs `vite build` with BUILD_TARGET=vercel (Cloudflare plugin disabled).
 * 2. Copies dist/client/* -> .vercel/output/static/
 * 3. Copies dist/server/* -> .vercel/output/functions/_ssr.func/
 * 4. Writes the Edge function config and the output routing config.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const outDir = resolve(root, ".vercel/output");
const staticDir = resolve(outDir, "static");
const fnDir = resolve(outDir, "functions/_ssr.func");

console.log("[vercel] cleaning previous output");
rmSync(outDir, { recursive: true, force: true });
rmSync(dist, { recursive: true, force: true });

console.log("[vercel] running vite build (BUILD_TARGET=vercel)");
const build = spawnSync("bunx", ["vite", "build"], {
  stdio: "inherit",
  env: { ...process.env, BUILD_TARGET: "vercel" },
});
if (build.status !== 0) {
  console.error("[vercel] vite build failed");
  process.exit(build.status ?? 1);
}

if (!existsSync(resolve(dist, "client")) || !existsSync(resolve(dist, "server"))) {
  console.error("[vercel] expected dist/client and dist/server to exist after build");
  process.exit(1);
}

console.log("[vercel] assembling .vercel/output/");
mkdirSync(staticDir, { recursive: true });
mkdirSync(fnDir, { recursive: true });

// Static client assets
cpSync(resolve(dist, "client"), staticDir, { recursive: true });

// Server bundle as an Edge Function
cpSync(resolve(dist, "server"), fnDir, { recursive: true });

// Edge function config (Vercel Build Output API)
writeFileSync(
  resolve(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "edge",
      entrypoint: "server.js",
    },
    null,
    2,
  ),
);

// Minimal package.json so Vercel recognises the function bundle
writeFileSync(
  resolve(fnDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

// Top-level routing config: serve static files first, then SSR everything else
writeFileSync(
  resolve(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/_ssr" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel] build output ready at .vercel/output/");
