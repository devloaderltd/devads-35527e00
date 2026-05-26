import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCheck, BellOff } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { listMyNotifications, markNotificationRead, deleteNotification } from "@/lib/extras.functions";
import { PanelShell } from "@/components/PanelShell";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — CallEscort24" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const delFn = useServerFn(deleteNotification);

  const q = useQuery({ queryKey: ["notifs"], queryFn: () => listFn({ data: { limit: 100, offset: 0 } }) });
  const mark = useMutation({ mutationFn: (v: { id?: string; all?: boolean }) => markFn({ data: v }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifs"] }); qc.invalidateQueries({ queryKey: ["notifs-unread"] }); } });
  const del = useMutation({ mutationFn: (id: string) => delFn({ data: { id } }), onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["notifs"] }); } });

  const items = q.data?.items ?? [];
  return (
    <PanelShell
      title="Your"
      highlight="notifications"
      subtitle={`${q.data?.total ?? 0} total`}
      action={
        <Button size="sm" variant="outline" className="rounded-full bg-white/70" onClick={() => mark.mutate({ all: true })}>
          <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
        </Button>
      }
    >
      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 rounded-2xl border-0 p-4 backdrop-blur dark:bg-white/5 ${n.read_at ? "bg-white/50" : "bg-white/80 ring-1 ring-primary/20"}`}>
            <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-muted-foreground/40" : "bg-primary"}`} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>}
              <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
            </div>
            <div className="flex items-center gap-1">
              {n.link && <Button asChild size="sm" variant="outline" className="rounded-full bg-white/70"><Link to={n.link as never}>Open</Link></Button>}
              {!n.read_at && <Button size="sm" variant="ghost" onClick={() => mark.mutate({ id: n.id })}>Mark read</Button>}
              <Button size="sm" variant="ghost" onClick={() => del.mutate(n.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="rounded-2xl border-0 bg-white/70 p-10 text-center text-muted-foreground backdrop-blur dark:bg-white/5">
            <BellOff className="mx-auto mb-2 h-8 w-8 opacity-40" />
            You're all caught up.
          </div>
        )}
      </div>
    </PanelShell>
  );
}
