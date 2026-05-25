import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const r = search.redirect;
    const redirect =
      typeof r === "string" && r.startsWith("/admin") && !r.startsWith("//") && !r.startsWith("/admin/login")
        ? r
        : "/admin";
    return { redirect };
  },
  head: () => ({
    meta: [
      { title: "Admin sign in — Marketly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const fetchMyRoles = useServerFn(getMyRoles);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setErr(error.message);
      toast.error(error.message);
      return;
    }
    await supabase.auth.getSession();
    try {
      const { roles } = await fetchMyRoles();
      if (!roles.includes("admin")) {
        await supabase.auth.signOut();
        setLoading(false);
        setErr("This account is not an admin.");
        toast.error("This account is not an admin.");
        return;
      }
      toast.success("Welcome, admin");
      navigate({ to: redirect, replace: true });
    } catch (e: any) {
      setLoading(false);
      setErr(e?.message ?? "Could not verify admin role");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Marketly Admin</h1>
            <p className="text-xs text-slate-400">Restricted access. Admin credentials only.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email" type="email" required autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              id="password" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          {err && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">{err}</div>}
          <Button
            type="submit" disabled={loading}
            className="w-full rounded-full border-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-95"
          >
            {loading ? "Signing in…" : "Sign in to admin"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Not an admin? <a href="/login" className="text-slate-300 underline-offset-2 hover:underline">Go to user sign in</a>
        </p>
      </div>
    </div>
  );
}
