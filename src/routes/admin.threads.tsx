import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { AdminTableToolbar, toCsv, downloadCsv } from "@/components/admin/AdminTableToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, MessagesSquare } from "lucide-react";
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
  const q = useQuery({ queryKey: ["admin-threads"], queryFn: () => list({ data: { limit: 300 } }) });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Thread deleted"); qc.invalidateQueries({ queryKey: ["admin-threads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [text, setText] = useState("");
  const [activity, setActivity] = useState("all");

  const threads = (q.data?.threads ?? []) as Thread[];
  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const cutoff = activity === "7d" ? 7 : activity === "30d" ? 30 : null;
    return threads.filter((t) => {
      if (cutoff !== null) {
        const days = (Date.now() - new Date(t.last_message_at).getTime()) / 86400000;
        if (days > cutoff) return false;
      }
      if (!needle) return true;
      return [t.listing_title, t.buyer_name, t.seller_name, t.last_message]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [threads, text, activity]);

  const exportCsv = () => {
    const rows = filtered.map((t) => ({
      id: t.id, listing: t.listing_title, buyer: t.buyer_name, seller: t.seller_name,
      message_count: t.message_count, last_message_at: t.last_message_at, last_message: t.last_message ?? "",
    }));
    downloadCsv(`threads-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <div>
      <AdminPageHeader title="Message threads" subtitle="Investigate or remove abusive conversations" />
      <AdminTableToolbar
        q={text}
        onQ={setText}
        placeholder="Search listing, buyer, seller, message…"
        filters={[{
          value: activity, onChange: setActivity, label: "Activity",
          options: [
            { value: "all", label: "All time" },
            { value: "7d", label: "Active 7d" },
            { value: "30d", label: "Active 30d" },
          ],
        }]}
        total={filtered.length}
        onExportCsv={exportCsv}
      />
      <Panel>
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-white/20">
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
          {!filtered.length && (
            <EmptyState
              icon={MessagesSquare}
              title={text || activity !== "all" ? "No threads match" : "No threads yet"}
              description={text || activity !== "all" ? "Try clearing filters." : "Buyer–seller conversations will appear here."}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
