import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2 } from "lucide-react";
import { listReviewsAdmin, deleteReviewAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/reviews")({ component: ReviewsPage });

type Review = { id: string; rating: number; body: string | null; created_at: string; reviewer_name: string; seller_name: string };

function ReviewsPage() {
  const list = useServerFn(listReviewsAdmin);
  const remove = useServerFn(deleteReviewAdmin);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "low" | "high">("all");

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

  return (
    <div>
      <AdminPageHeader title="Reviews" subtitle="Moderate seller reviews" actions={
        <div className="flex gap-2">
          {(["all", "low", "high"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="rounded-full">
              {f === "all" ? "All" : f === "low" ? "Low (≤2)" : "High (≥4)"}
            </Button>
          ))}
        </div>
      } />
      <Panel>
        <div className="space-y-2">
          {(q.data?.reviews ?? []).map((r: Review) => (
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
          {!q.data?.reviews.length && <div className="py-8 text-center text-sm text-slate-400">No reviews match.</div>}
        </div>
      </Panel>
    </div>
  );
}
