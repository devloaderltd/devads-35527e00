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
      <header
        className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:px-4">
          <Link to="/admin" className="flex min-w-0 items-center gap-2 font-display text-base font-bold tracking-tight sm:text-lg">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-inner">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="truncate">Marketly <span className="text-slate-400">Admin</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {email && <span className="hidden max-w-[14rem] truncate text-xs text-slate-400 md:inline">{email}</span>}
            <Button
              onClick={signOut}
              variant="outline"
              size="sm"
              className="rounded-full border-white/20 bg-white/5 px-2.5 text-slate-100 hover:bg-white/10 hover:text-white sm:px-3"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        {email && (
          <div className="border-t border-white/5 px-3 py-1.5 text-[11px] text-slate-500 md:hidden">
            <span className="truncate">{email}</span>
          </div>
        )}
      </header>
      <div
        className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>
  );
}
