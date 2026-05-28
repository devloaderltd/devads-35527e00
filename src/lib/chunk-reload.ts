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
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return false;
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — bail rather than risk a loop
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
