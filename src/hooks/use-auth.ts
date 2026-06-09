import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const finish = (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      // Resolve loading on ANY auth event, including INITIAL_SESSION.
      // Some browsers (iOS Safari, in-app webviews) can hang getSession()
      // due to storage access; relying on it alone leaves the UI stuck.
      finish(s);
    });

    supabase.auth.getSession()
      .then(({ data }) => finish(data.session))
      .catch(() => finish(null));

    // Safety net: if neither path resolves (network stalled, storage blocked),
    // unblock the UI so it can render its unauthenticated state / redirect.
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
