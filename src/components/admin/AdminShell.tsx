import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/admin/login", replace: true });
  };
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-950 text-slate-100">
        <AdminSidebar />
        <SidebarInset className="bg-slate-950">
          <header
            className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur sm:px-4"
            style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
          >
            <SidebarTrigger className="text-slate-300 hover:bg-white/5" />
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
          </header>
          <main
            className="flex-1 px-3 py-5 sm:px-6 sm:py-6"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          >
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
