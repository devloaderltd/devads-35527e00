import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  listSellerReviews,
  canReviewSeller,
  submitSellerReview,
  deleteMyReview,
} from "@/lib/extras.functions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function SellerReviews({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listSellerReviews);
  const canFn = useServerFn(canReviewSeller);
  const subFn = useServerFn(submitSellerReview);
  const delFn = useServerFn(deleteMyReview);

  const reviews = useQuery({
    queryKey: ["seller-reviews", sellerId],
    queryFn: () => listFn({ data: { sellerId } }),
  });
  const can = useQuery({
    queryKey: ["can-review", sellerId, user?.id],
    enabled: !!user,
    queryFn: () => canFn({ data: { sellerId } }),
  });

  const items = reviews.data?.items ?? [];
  const avg = reviews.data?.avg ?? 0;
  const count = reviews.data?.count ?? 0;

  const myReview = user ? items.find((r) => r.reviewer_id === user.id) : null;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(myReview?.rating ?? 5);
  const [body, setBody] = useState(myReview?.body ?? "");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["seller-reviews", sellerId] });
    qc.invalidateQueries({ queryKey: ["can-review", sellerId, user?.id] });
  };

  const submit = useMutation({
    mutationFn: () => subFn({ data: { sellerId, rating, body } }),
    onSuccess: () => {
      toast.success(myReview ? "Review updated" : "Review submitted");
      setEditing(false);
      if (!myReview) setBody("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (reviewId: string) => delFn({ data: { reviewId } }),
    onSuccess: () => {
      toast.success("Review deleted");
      setEditing(false);
      setBody("");
      setRating(5);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: items.filter((r) => r.rating === star).length,
  }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  const showForm = !!user && ((can.data?.canReview && !myReview) || (!!myReview && editing));

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          Reviews <span className="gradient-text">({count})</span>
        </h2>
        {!!items.length && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-bold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">/ 5</span>
          </div>
        )}
      </div>

      {!!items.length && (
        <div className="mt-4 rounded-2xl border border-white/40 bg-white/55 p-4 backdrop-blur">
          <div className="space-y-1.5">
            {dist.map((d) => (
              <div key={d.star} className="flex items-center gap-3 text-xs">
                <span className="w-6 text-right tabular-nums">{d.star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(d.n / maxN) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums text-muted-foreground">{d.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-4 rounded-2xl border border-white/40 bg-white/60 p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  <Star
                    className={`h-6 w-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
            {myReview && editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Textarea
            placeholder="Share your experience…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={1000}
            className="bg-white/70"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              className="btn-gradient rounded-full border-0"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
            >
              {myReview ? "Update review" : "Submit review"}
            </Button>
          </div>
        </div>
      )}
      {user && can.data && !can.data.canReview && can.data.reason === "no_thread" && !myReview && (
        <p className="mt-3 text-xs text-muted-foreground">
          You can review this seller after exchanging a message about one of their listings.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((r) => {
          const isMine = user?.id === r.reviewer_id;
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-white/40 bg-white/55 p-4 backdrop-blur"
            >
              <div className="flex items-center gap-2">
                {r.reviewer?.avatar_url ? (
                  <img src={r.reviewer.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-bold">
                    {(r.reviewer?.display_name ?? "?")[0]}
                  </div>
                )}
                <div className="text-sm font-medium">
                  {r.reviewer?.display_name ?? "Anonymous"}
                  {isMine && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              {r.body && <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>}
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                {isMine && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => {
                        setRating(r.rating);
                        setBody(r.body ?? "");
                        setEditing(true);
                      }}
                    >
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete your review?")) remove.mutate(r.id);
                      }}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!items.length && (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No reviews yet.
          </div>
        )}
      </div>
    </section>
  );
}
