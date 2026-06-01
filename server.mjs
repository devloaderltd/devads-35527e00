// Node HTTP launcher for VPS deployment.
// Wraps the bundled Web-fetch handler (dist/server/server.js) in a real
// node:http server so PM2 has something to keep alive on PORT.
//
// Usage:
//   bun run build           # produces dist/server/server.js
//   node server.mjs         # or: pm2 start ecosystem.config.cjs
import { createServer } from "node:http";
import { Readable } from "node:stream";
import handlerMod from "./dist/server/server.js";

const handler = handlerMod.default ?? handlerMod;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function nodeReqToWebRequest(req) {
  const host = req.headers.host || `${HOST}:${PORT}`;
  const proto = req.headers["x-forwarded-proto"] || "http";
  const url = `${proto}://${host}${req.url}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
    else if (v != null) headers.set(k, String(v));
  }

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function writeWebResponseToNode(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
}

const server = createServer(async (req, res) => {
  try {
    const request = nodeReqToWebRequest(req);
    const response = await handler.fetch(request, process.env, {});
    await writeWebResponseToNode(response, res);
  } catch (err) {
    console.error("Request handler error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain");
    }
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
