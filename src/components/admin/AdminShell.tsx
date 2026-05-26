import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Command as CommandIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBreadcrumbs } from "./Breadcrumbs";
import { NotificationsBell } from "./NotificationsBell";
import { AdminCommandPalette } from "./AdminCommandPalette";

function readSidebarCookie(): boolean {
  if (typeof document === "undefined") return true;
  const m = document.cookie.match(/(?:^|;\s*)sidebar:state=([^;]+)/);
  return m ? m[1] !== "false" : true;
}

export function AdminShell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(readSidebarCookie);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/admin/login", replace: true });
  };

  const env = typeof window !== "undefined" && window.location.host.includes("lovable") ? "Preview" : "Live";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-950 text-slate-100">
        <AdminSidebar />
        <SidebarInset className="bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
          <header
            className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-white/10 bg-slate-950/80 px-3 backdrop-blur sm:px-5"
            style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
          >
            <SidebarTrigger className="text-slate-300 hover:bg-white/5" />
            <AdminBreadcrumbs />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="ml-2 hidden h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200 sm:inline-flex"
            >
              <CommandIcon className="h-3.5 w-3.5" />
              <span>Jump to…</span>
              <kbd className="ml-1 rounded border border-white/10 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline ${env === "Live" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                {env}
              </span>
              <NotificationsBell />
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
          </header>
          <main
            className="flex-1 px-3 py-5 sm:px-6 sm:py-6"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          >
            {children}
          </main>
        </SidebarInset>
      </div>
      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  );
}
