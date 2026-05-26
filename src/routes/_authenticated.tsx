import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BrandLoader } from "@/components/BrandLoader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const redirectTarget = location.pathname.startsWith("/login") ? "/" : location.href;

  useEffect(() => {
    if (!loading && !session && !location.pathname.startsWith("/login")) {
      navigate({ to: "/login", search: { redirect: redirectTarget }, replace: true });
    }
  }, [loading, session, navigate, redirectTarget, location.pathname]);

  if (loading) {
    return <BrandLoader variant="page" label="Loading your account" />;
  }

  if (!session) {
    return <BrandLoader variant="page" label="Redirecting to sign in" />;
  }

  return <Outlet />;
}
