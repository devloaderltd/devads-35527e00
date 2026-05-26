import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function RecentNotificationsCard({ userId }: { userId: string | undefined }) {
  const qc = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ["dashboard-notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read_at, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-notifications", userId] }),
  });

  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" /> Recent activity
        </CardTitle>
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
          <Link to="/notifications">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {(items?.length ?? 0) === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
        )}
        {items?.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-2 rounded-xl border p-2.5 transition ${
              n.read_at ? "border-border/40 bg-transparent" : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                <p className="truncate text-sm font-medium">{n.title}</p>
              </div>
              {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
            {!n.read_at && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markRead.mutate(n.id)} title="Mark read">
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
