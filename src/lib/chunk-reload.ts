/**
 * Detect stale-chunk errors (after a redeploy the old hashed chunk no longer
 * exists on the CDN) and recover with a single guarded reload.
 */

const STORAGE_KEY = "chunk-reload-attempted";

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    (typeof error === "string" ? error : (error as { message?: string })?.message) || "";
  const name = (error as { name?: string })?.name || "";
  if (name === "ChunkLoadError") return true;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk \S+ failed/i.test(msg) ||
    /Loading CSS chunk \S+ failed/i.test(msg)
  );
}

export function reloadOnceForChunkError(): boolean {
  if (typeof window === "undefined") return false;
  // Tell the overlay we're attempting recovery so the user sees feedback
  // even though location.replace is queued.
  try { window.dispatchEvent(new CustomEvent("chunk-reload")); } catch { /* ignore */ }
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) {
      // Already tried once — surface the failed-recovery UI instead of looping.
      try { window.dispatchEvent(new CustomEvent("chunk-reload-failed")); } catch { /* ignore */ }
      return false;
    }
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    try { window.dispatchEvent(new CustomEvent("chunk-reload-failed")); } catch { /* ignore */ }
    return false;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

/** Call on successful app boot to clear the guard for the next deploy. */
export function clearChunkReloadGuard() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
