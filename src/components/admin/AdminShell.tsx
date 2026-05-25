import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminShell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/admin/login", replace: true });
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-inner">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>Marketly <span className="text-slate-400">Admin</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {email && <span className="hidden text-xs text-slate-400 sm:inline">{email}</span>}
            <Button onClick={signOut} variant="outline" size="sm" className="rounded-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
