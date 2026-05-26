import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const r = search.redirect;
    const ok =
      typeof r === "string" &&
      r.startsWith("/") &&
      !r.startsWith("//") &&
      !r.startsWith("/login") &&
      !r.startsWith("/admin");
    return { redirect: ok ? (r as string) : "/" };
  },
  head: () => ({ meta: [{ title: "Sign in — CallEscort24" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    await supabase.auth.getSession();
    const target = redirect && !redirect.startsWith("/login") ? redirect : "/";
    navigate({ to: target, replace: true });
  };

  return (
    <div className="container mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="iridescent-border rounded-3xl border border-white/40 bg-white/65 p-8 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
        <h1 className="font-display text-3xl font-bold">
          Welcome <span className="gradient-text">back</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to CallEscort24.</p>
        <div className="mt-6">
          <SocialAuthButtons redirect={redirect} />
        </div>
        <form onSubmit={onSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/70" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/70" />
          </div>
          <Button type="submit" className="btn-gradient w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here? <Link to="/signup" className="text-primary hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}

