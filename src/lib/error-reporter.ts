/**
 * Client-side error reporter. Captures window.onerror and unhandledrejection
 * and posts them to /api/public/client-errors. Batches, dedupes, and rate-limits.
 */
import { supabase } from "@/integrations/supabase/client";
import { isChunkLoadError, reloadOnceForChunkError, clearChunkReloadGuard } from "./chunk-reload";


type Payload = {
  message: string;
  stack?: string;
  route?: string;
  user_agent?: string;
  severity?: "info" | "warn" | "error" | "fatal";
  user_id?: string | null;
};

let installed = false;
const seen = new Map<string, number>(); // hash -> last sent ms
const MIN_INTERVAL_MS = 60_000;
const MAX_PER_MIN = 20;
const window60: number[] = [];

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

async function send(p: Payload) {
  try {
    const now = Date.now();
    while (window60.length && now - window60[0] > 60_000) window60.shift();
    if (window60.length >= MAX_PER_MIN) return;
    const key = hash((p.message || "") + "|" + (p.stack || "").slice(0, 200));
    const last = seen.get(key) ?? 0;
    if (now - last < MIN_INTERVAL_MS) return;
    seen.set(key, now);
    window60.push(now);

    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
    } catch { /* ignore */ }

    await fetch("/api/public/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: (p.message || "Unknown error").slice(0, 2000),
        stack: (p.stack || "").slice(0, 8000) || null,
        route: (p.route || (typeof location !== "undefined" ? location.pathname + location.search : "")).slice(0, 500),
        user_agent: (typeof navigator !== "undefined" ? navigator.userAgent : "").slice(0, 500),
        severity: p.severity || "error",
        user_id: userId,
      }),
      keepalive: true,
    });
  } catch { /* swallow */ }
}

export function installErrorReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    if (!e.message) return;
    send({ message: e.message, stack: e.error?.stack, severity: "error" });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    const message = typeof r === "string" ? r : r?.message || "Unhandled promise rejection";
    const stack = r?.stack;
    send({ message, stack, severity: "error" });
  });
}

export function reportClientError(message: string, options?: { stack?: string; severity?: Payload["severity"] }) {
  send({ message, stack: options?.stack, severity: options?.severity || "error" });
}
