import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;
  }

  if (!session) {
    return <Navigate to="/login" search={{ redirect: location.href }} replace />;
  }

  return <Outlet />;
}
