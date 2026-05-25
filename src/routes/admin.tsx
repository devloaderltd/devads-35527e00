import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getMyRoles } from "@/lib/admin.functions";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isUnauthorizedError } from "@/lib/auth-errors";
import { AuthErrorFallback } from "@/components/AuthErrorFallback";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — CallEscort24" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  // Login page renders without the admin shell
  if (path === "/admin/login") return <Outlet />;
  return <Gated />;
}

function Gated() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchRoles = useServerFn(getMyRoles);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/admin/login", search: { redirect: "/admin" }, replace: true });
  }, [loading, user, navigate]);

  const rolesQ = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !loading && !!user,
    staleTime: 0,
    retry: false,
    queryFn: async () => (await fetchRoles()).roles,
  });

  // If the server fn returns Unauthorized (e.g. token expired mid-session),
  // bounce to the admin login so the user doesn't get stuck on a blank screen.
  useEffect(() => {
    if (rolesQ.isError && isUnauthorizedError(rolesQ.error)) {
      navigate({ to: "/admin/login", search: { redirect: "/admin" }, replace: true });
    }
  }, [rolesQ.isError, rolesQ.error, navigate]);

  if (loading || !user || (rolesQ.isLoading && !rolesQ.isError)) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-400">Loading admin…</div>;
  }

  if (rolesQ.isError) {
    if (isUnauthorizedError(rolesQ.error)) {
      // Redirect effect above handles this; show a brief stub.
      return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-400">Redirecting…</div>;
    }
    return <AuthErrorFallback error={rolesQ.error} reset={() => rolesQ.refetch()} variant="admin" />;
  }


  const roles = rolesQ.data ?? [];
  const isMod = roles.includes("admin") || roles.includes("moderator");

  if (!isMod) {
    const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login", replace: true }); };
    return (
      <AdminShell email={user.email}>
        <div className="grid place-items-center py-20 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-slate-400" />
          <h1 className="font-display text-xl font-bold">Not authorized</h1>
          <p className="mt-1 max-w-md text-sm text-slate-400">This account doesn't have admin access.</p>
          <Button onClick={signOut} className="mt-4 rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white">Sign in as admin</Button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell email={user.email}>
      <Outlet />
    </AdminShell>
  );
}
