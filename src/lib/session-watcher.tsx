import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAuthError } from "@/lib/auth-errors";
import { SessionExpiredDialog } from "@/components/SessionExpiredDialog";

/**
 * Listens for session expiry signals and shows a modal asking the user to
 * sign back in. Pairs with `_authenticated` redirects (navigation case) by
 * handling the "I was already on a page and just got a 401" active case.
 */
export function SessionWatcher() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const hadSession = useRef(false);
  const dismissedAt = useRef(0);

  const trigger = () => {
    // Debounce: don't re-open within 30s of a manual dismiss.
    if (Date.now() - dismissedAt.current < 30_000) return;
    setOpen(true);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      hadSession.current = !!data.session;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hadSession.current = !!session;
      }
      if (event === "SIGNED_OUT" && hadSession.current) {
        hadSession.current = false;
        trigger();
      }
    });

    // Listen for auth errors thrown by any React Query operation.
    const cache = qc.getQueryCache();
    const mCache = qc.getMutationCache();
    const unsubQ = cache.subscribe((evt) => {
      if (evt.type === "updated" && evt.action.type === "error") {
        if (isAuthError(evt.action.error) && hadSession.current) trigger();
      }
    });
    const unsubM = mCache.subscribe((evt) => {
      if (evt.type === "updated" && evt.action.type === "error") {
        if (isAuthError(evt.action.error) && hadSession.current) trigger();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      unsubQ();
      unsubM();
    };
  }, [qc]);

  return (
    <SessionExpiredDialog
      open={open}
      onClose={() => { dismissedAt.current = Date.now(); setOpen(false); }}
    />
  );
}
