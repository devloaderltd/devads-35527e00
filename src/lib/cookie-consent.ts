import { useEffect, useState, useCallback } from "react";

/**
 * Granular cookie consent contract.
 *
 * Optional categories default to OFF. Any optional script (analytics,
 * marketing pixels) MUST check `hasConsent(category)` before loading.
 */

export type CookieCategory = "essential" | "analytics" | "marketing";

export interface ConsentState {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  version: 1;
}

const KEY = "callescort24.cookie-consent.v1";
const LEGACY_KEY = "marketly.cookie-consent.v1";
const EVENT_NAME = "callescort24:consent-change";
const CURRENT_VERSION = 1 as const;

const DEFAULT: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  updatedAt: "",
  version: CURRENT_VERSION,
};

function safeParse(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed && parsed.version === CURRENT_VERSION) {
      return {
        essential: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
        version: CURRENT_VERSION,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function migrateLegacy(): ConsentState | null {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    const state: ConsentState = {
      essential: true,
      analytics: legacy === "accepted",
      marketing: legacy === "accepted",
      updatedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
    };
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_KEY);
    return state;
  } catch {
    return null;
  }
}

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    return safeParse(localStorage.getItem(KEY)) ?? migrateLegacy();
  } catch {
    return null;
  }
}

export function hasConsent(category: CookieCategory): boolean {
  if (category === "essential") return true;
  const c = getConsent();
  return c ? c[category] === true : false;
}

export function setConsent(partial: { analytics: boolean; marketing: boolean }): ConsentState {
  const next: ConsentState = {
    essential: true,
    analytics: partial.analytics,
    marketing: partial.marketing,
    updatedAt: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    localStorage.removeItem(LEGACY_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
  } catch {
    /* ignore */
  }
}

/** React hook that re-renders when consent changes (this tab or others). */
export function useConsent(): {
  consent: ConsentState | null;
  hydrated: boolean;
  save: (partial: { analytics: boolean; marketing: boolean }) => void;
} {
  // Always start with null on SSR and first client render to avoid hydration mismatch.
  const [consent, setState] = useState<ConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setState(getConsent());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync as EventListener);
    sync();
    setHydrated(true);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync as EventListener);
    };
  }, []);

  const save = useCallback((partial: { analytics: boolean; marketing: boolean }) => {
    setState(setConsent(partial));
  }, []);

  return { consent, hydrated, save };
}

export const DEFAULT_CONSENT = DEFAULT;
