import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { listSellerReviews, canReviewSeller, submitSellerReview } from "@/lib/extras.functions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function SellerReviews({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listSellerReviews);
  const canFn = useServerFn(canReviewSeller);
  const subFn = useServerFn(submitSellerReview);

  const reviews = useQuery({ queryKey: ["seller-reviews", sellerId], queryFn: () => listFn({ data: { sellerId } }) });
  const can = useQuery({ queryKey: ["can-review", sellerId, user?.id], enabled: !!user, queryFn: () => canFn({ data: { sellerId } }) });

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const submit = useMutation({
    mutationFn: () => subFn({ data: { sellerId, rating, body } }),
    onSuccess: () => { toast.success("Review submitted"); setBody(""); qc.invalidateQueries({ queryKey: ["seller-reviews", sellerId] }); qc.invalidateQueries({ queryKey: ["can-review", sellerId, user?.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = reviews.data?.items ?? [];
  const avg = reviews.data?.avg ?? 0;

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          Reviews <span className="gradient-text">({reviews.data?.count ?? 0})</span>
        </h2>
        {!!items.length && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-bold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">/ 5</span>
          </div>
        )}
      </div>

      {user && can.data?.canReview && (
        <div className="mt-4 rounded-2xl border border-white/40 bg-white/60 p-4 backdrop-blur">
          <div className="mb-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Share your experience…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} className="bg-white/70" />
          <div className="mt-2 flex justify-end">
            <Button size="sm" className="btn-gradient rounded-full border-0" onClick={() => submit.mutate()} disabled={submit.isPending}>Submit review</Button>
          </div>
        </div>
      )}
      {user && can.data && !can.data.canReview && can.data.reason === "no_thread" && (
        <p className="mt-3 text-xs text-muted-foreground">You can review this seller after exchanging a message about one of their listings.</p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/40 bg-white/55 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              {r.reviewer?.avatar_url
                ? <img src={r.reviewer.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                : <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-bold">{(r.reviewer?.display_name ?? "?")[0]}</div>}
              <div className="text-sm font-medium">{r.reviewer?.display_name ?? "Anonymous"}</div>
              <div className="ml-auto flex items-center gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
              </div>
            </div>
            {r.body && <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>}
            <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
          </div>
        ))}
        {!items.length && <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">No reviews yet.</div>}
      </div>
    </section>
  );
}
