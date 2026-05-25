const KEY = "recently_viewed_listings";
const MAX = 12;

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(id: string) {
  if (typeof window === "undefined" || !id) return;
  const cur = getRecentlyViewed().filter((x) => x !== id);
  cur.unshift(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(cur.slice(0, MAX)));
  } catch { /* quota */ }
}
