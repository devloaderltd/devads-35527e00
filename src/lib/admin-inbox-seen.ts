// Per-kind read tracking for the admin notifications inbox.
// Stored as a JSON map { [kind]: lastSeenISO } in localStorage.

export type InboxKind = "kyc" | "report" | "topup" | "error" | "broadcast" | "payment";

export const INBOX_KINDS: InboxKind[] = ["kyc", "report", "topup", "error", "broadcast", "payment"];

const STORAGE_KEY = "admin.inbox.lastSeenByKind";

type SeenMap = Partial<Record<InboxKind, string>>;

function read(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SeenMap) : {};
  } catch {
    return {};
  }
}

function write(map: SeenMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    // Allow other components in same tab to react
    window.dispatchEvent(new CustomEvent("admin-inbox-seen-changed"));
  } catch {
    /* ignore */
  }
}

export function getAllLastSeen(): SeenMap {
  return read();
}

export function getLastSeen(kind: InboxKind): number {
  const v = read()[kind];
  return v ? new Date(v).getTime() : 0;
}

export function setLastSeen(kind: InboxKind, isoOrMs?: string | number) {
  const map = read();
  const iso =
    typeof isoOrMs === "number"
      ? new Date(isoOrMs).toISOString()
      : typeof isoOrMs === "string"
        ? isoOrMs
        : new Date().toISOString();
  map[kind] = iso;
  write(map);
}

export function markAllSeen(items?: ReadonlyArray<{ kind: InboxKind; at: string }>) {
  const map = read();
  const now = new Date().toISOString();
  if (!items || items.length === 0) {
    INBOX_KINDS.forEach((k) => {
      map[k] = now;
    });
  } else {
    // Per-kind: pick the newest "at" we've actually observed.
    const newest: Partial<Record<InboxKind, number>> = {};
    items.forEach((it) => {
      const t = new Date(it.at).getTime();
      if (!newest[it.kind] || t > (newest[it.kind] ?? 0)) newest[it.kind] = t;
    });
    INBOX_KINDS.forEach((k) => {
      const t = newest[k];
      if (t) map[k] = new Date(t).toISOString();
    });
  }
  write(map);
}

export function countUnseen<T extends { kind: InboxKind; at: string }>(
  items: ReadonlyArray<T>,
  kind?: InboxKind,
): number {
  const seen = read();
  return items.reduce((acc, it) => {
    if (kind && it.kind !== kind) return acc;
    const last = seen[it.kind] ? new Date(seen[it.kind] as string).getTime() : 0;
    return new Date(it.at).getTime() > last ? acc + 1 : acc;
  }, 0);
}

export function isUnseen(item: { kind: InboxKind; at: string }): boolean {
  const seen = read();
  const last = seen[item.kind] ? new Date(seen[item.kind] as string).getTime() : 0;
  return new Date(item.at).getTime() > last;
}

// Hook helper: subscribe to cross-component changes
export function subscribeInboxSeen(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener("admin-inbox-seen-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("admin-inbox-seen-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
