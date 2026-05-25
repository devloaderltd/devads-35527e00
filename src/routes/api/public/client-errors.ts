import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).nullable().optional(),
  route: z.string().max(500).nullable().optional(),
  user_agent: z.string().max(500).nullable().optional(),
  severity: z.enum(["info", "warn", "error", "fatal"]).default("error"),
  user_id: z.string().uuid().nullable().optional(),
});

// Simple in-memory per-IP rate limit (best-effort, edge worker isolate scope).
const bucket = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = bucket.get(ip);
  if (!b || b.resetAt < now) {
    bucket.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count++;
  return true;
}

export const Route = createFileRoute("/api/public/client-errors")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
        if (!rateLimit(ip)) {
          return new Response("rate_limited", { status: 429 });
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("bad_json", { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return new Response("invalid", { status: 400 });
        }
        const d = parsed.data;
        const { error } = await supabaseAdmin.from("client_error_logs").insert({
          message: d.message,
          stack: d.stack ?? null,
          route: d.route ?? null,
          user_agent: d.user_agent ?? null,
          severity: d.severity,
          user_id: d.user_id ?? null,
        });
        if (error) {
          return new Response("db_error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
