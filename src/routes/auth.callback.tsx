import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => {
    const r = search.redirect;
    const error = search.error;
    const error_description = search.error_description;
    return {
      redirect: typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : "/",
      error: typeof error === "string" ? error : undefined,
      error_description: typeof error_description === "string" ? error_description : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Signing you in…" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { redirect, error, error_description } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      toast.error(error_description || error);
      navigate({ to: "/login", replace: true });
      return;
    }

    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) {
        toast.success("Signed in!");
        navigate({ to: redirect, replace: true });
      }
    });

    // Also check immediately in case session is already set
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        navigate({ to: redirect, replace: true });
      }
    });

    // Safety fallback
    const timeout = setTimeout(() => {
      if (cancelled) return;
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          toast.error("Sign-in did not complete. Please try again.");
          navigate({ to: "/login", replace: true });
        }
      });
    }, 6000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [error, error_description, redirect, navigate]);

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}
