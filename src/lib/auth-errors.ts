/**
 * Helpers for detecting auth-related errors thrown by server functions.
 *
 * `requireSupabaseAuth` throws `Error('Unauthorized: ...')` and `requireAdmin`
 * throws `Error('Forbidden: ...')`. TanStack's serverFn RPC envelope can wrap
 * these, so we also peek at common nested shapes.
 */

function extractMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message ?? "";
  if (typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    if (typeof anyErr.message === "string") return anyErr.message;
    // TanStack serverFn error envelope
    const nested = anyErr.error as Record<string, unknown> | undefined;
    if (nested && typeof nested.message === "string") return nested.message;
  }
  return "";
}

export function isUnauthorizedError(err: unknown): boolean {
  return /^unauthorized\b/i.test(extractMessage(err));
}

export function isForbiddenError(err: unknown): boolean {
  return /^forbidden\b/i.test(extractMessage(err));
}

export function isAuthError(err: unknown): boolean {
  return isUnauthorizedError(err) || isForbiddenError(err);
}
