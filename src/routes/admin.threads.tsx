import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { listThreadsAdmin, deleteThreadAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/threads")({ component: ThreadsPage });

type Thread = {
  id: string; created_at: string; last_message_at: string;
  buyer_name: string; seller_name: string; listing_title: string;
  last_message: string | null; message_count: number;
};

function ThreadsPage() {
  const list = useServerFn(listThreadsAdmin);
  const remove = useServerFn(deleteThreadAdmin);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-threads"], queryFn: () => list({ data: { limit: 150 } }) });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Thread deleted"); qc.invalidateQueries({ queryKey: ["admin-threads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AdminPageHeader title="Message threads" subtitle="Investigate or remove abusive conversations" />
      <Panel>
        <div className="space-y-2">
          {(q.data?.threads ?? []).map((t: Thread) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-100"><span className="text-slate-400">Listing:</span> {t.listing_title}</div>
                  <div className="text-xs text-slate-400">{t.buyer_name} ↔ {t.seller_name} · <Badge variant="secondary" className="text-[10px]">{t.message_count} msgs</Badge></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}</span>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => { if (confirm("Delete this thread and all its messages?")) delMut.mutate(t.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {t.last_message && <div className="mt-2 line-clamp-2 rounded-lg bg-slate-900/40 p-2 text-xs text-slate-300">{t.last_message}</div>}
            </div>
          ))}
          {!q.data?.threads.length && <div className="py-8 text-center text-sm text-slate-400">No threads yet.</div>}
        </div>
      </Panel>
    </div>
  );
}
