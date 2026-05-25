import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = useRef(location.href);
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login", search: { redirect: redirectTo.current }, replace: true });
    }
  }, [loading, session, navigate]);

  if (loading) {
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;
  }

  if (!session) {
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Redirecting…</div>;
  }

  return <Outlet />;
}
