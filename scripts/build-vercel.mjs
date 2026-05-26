#!/usr/bin/env node
/**
 * Builds the project for Vercel using the Build Output API (v3) as a
 * Node.js serverless function with a Web-standard fetch handler.
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

// Server bundle as a Node serverless function
cpSync(resolve(dist, "server"), fnDir, { recursive: true });

// Web-standard entry: Vercel's Node runtime (nodejs20.x+) accepts a default
// export of `(request: Request) => Response | Promise<Response>`.
writeFileSync(
  resolve(fnDir, "index.mjs"),
  `import handler from "./server.js";\nexport default (request) => handler.fetch(request, {}, {});\n`,
);

writeFileSync(
  resolve(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

writeFileSync(
  resolve(fnDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

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
