import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getUnreadCount, listMyNotifications, markNotificationRead } from "@/lib/extras.functions";
import { formatDistanceToNow } from "date-fns";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const unreadFn = useServerFn(getUnreadCount);
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);

  const unread = useQuery({
    queryKey: ["notifs-unread"], enabled: !!user,
    queryFn: () => unreadFn(), staleTime: 30_000,
  });
  const recent = useQuery({
    queryKey: ["notifs-recent"], enabled: !!user,
    queryFn: () => listFn({ data: { limit: 8, offset: 0 } }), staleTime: 15_000,
  });

  const markAll = useMutation({
    mutationFn: () => markFn({ data: { all: true } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifs-unread"] });
      qc.invalidateQueries({ queryKey: ["notifs-recent"] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifs-unread"] });
      qc.invalidateQueries({ queryKey: ["notifs-recent"] });
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notifs-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifs-unread"] });
        qc.invalidateQueries({ queryKey: ["notifs-recent"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  if (!user) return null;
  const count = unread.data?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full bg-white/60 backdrop-blur" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-3 text-xs font-normal">
            {count > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); markAll.mutate(); }}
                disabled={markAll.isPending}
                className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
            <Link to="/notifications" className="text-primary hover:underline">View all</Link>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {(recent.data?.items ?? []).map((n) => (
            <Link
              key={n.id}
              to={(n.link as never) || "/notifications"}
              onClick={() => { if (!n.read_at) markOne.mutate(n.id); }}
              className={`block px-3 py-2 text-sm hover:bg-muted/60 ${n.read_at ? "" : "bg-primary/5"}`}
            >
              <div className="flex items-start gap-2">
                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                </div>
              </div>
            </Link>
          ))}
          {!recent.data?.items.length && <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet.</div>}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
