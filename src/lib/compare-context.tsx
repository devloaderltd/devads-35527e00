import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

const KEY = "ce24:compare";
const MAX = 4;

type Ctx = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => boolean; // returns true if added
  clear: () => void;
  remove: (id: string) => void;
};

const CompareCtx = createContext<Ctx | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
  }, [ids]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    let added = false;
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      added = true;
      return [...prev, id];
    });
    return added;
  }, []);
  const clear = useCallback(() => setIds([]), []);
  const remove = useCallback((id: string) => setIds((p) => p.filter((x) => x !== id)), []);

  return (
    <CompareCtx.Provider value={{ ids, has, toggle, clear, remove }}>
      {children}
    </CompareCtx.Provider>
  );
}

export function useCompare() {
  const v = useContext(CompareCtx);
  if (!v) throw new Error("useCompare must be used inside CompareProvider");
  return v;
}

export const COMPARE_MAX = MAX;
