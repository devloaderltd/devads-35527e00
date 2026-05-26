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
import { Star, Trash2, MessageSquare } from "lucide-react";
import { listReviewsAdmin, deleteReviewAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/reviews")({ component: ReviewsPage });

type Review = { id: string; rating: number; body: string | null; created_at: string; reviewer_name: string; seller_name: string };

function ReviewsPage() {
  const list = useServerFn(listReviewsAdmin);
  const remove = useServerFn(deleteReviewAdmin);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "low" | "high">("all");
  const [text, setText] = useState("");

  const params = filter === "low" ? { maxRating: 2 } : filter === "high" ? { minRating: 4 } : {};
  const q = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: () => list({ data: { ...params, limit: 200 } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Review deleted"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = (q.data?.reviews ?? []) as Review[];
  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    if (!needle) return reviews;
    return reviews.filter(r => [r.body, r.reviewer_name, r.seller_name].filter(Boolean).some(v => String(v).toLowerCase().includes(needle)));
  }, [reviews, text]);

  const exportCsv = () => {
    const rows = filtered.map(r => ({
      id: r.id, rating: r.rating, reviewer: r.reviewer_name, seller: r.seller_name,
      body: r.body ?? "", created_at: r.created_at,
    }));
    downloadCsv(`reviews-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <div>
      <AdminPageHeader title="Reviews" subtitle="Moderate seller reviews" />
      <AdminTableToolbar
        q={text}
        onQ={setText}
        placeholder="Search reviewer, seller, body…"
        filters={[{
          value: filter, onChange: (v) => setFilter(v as typeof filter), label: "Rating",
          options: [
            { value: "all", label: "All ratings" },
            { value: "low", label: "Low (≤2)" },
            { value: "high", label: "High (≥4)" },
          ],
        }]}
        total={filtered.length}
        onExportCsv={exportCsv}
      />
      <Panel>
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="gap-1"><Star className="h-3 w-3" />{r.rating}</Badge>
                  <span className="text-sm text-slate-300"><span className="text-slate-400">by</span> {r.reviewer_name} <span className="text-slate-400">→</span> {r.seller_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => { if (confirm("Delete this review?")) delMut.mutate(r.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {r.body && <p className="mt-2 text-sm text-slate-200">{r.body}</p>}
            </div>
          ))}
          {!filtered.length && (
            <EmptyState
              icon={MessageSquare}
              title={text || filter !== "all" ? "No reviews match" : "No reviews yet"}
              description={text || filter !== "all" ? "Try clearing filters." : "Buyer reviews will appear here as sellers receive ratings."}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
