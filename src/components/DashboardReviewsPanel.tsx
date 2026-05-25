import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquare, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  listMyReceivedReviews,
  listMyAuthoredReviews,
  respondToReview,
  deleteMyReview,
} from "@/lib/extras.functions";

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= value ? "fill-current" : "opacity-30"} />
      ))}
    </span>
  );
}

export function DashboardReviewsPanel() {
  const qc = useQueryClient();
  const recvFn = useServerFn(listMyReceivedReviews);
  const authFn = useServerFn(listMyAuthoredReviews);
  const respFn = useServerFn(respondToReview);
  const delFn = useServerFn(deleteMyReview);

  const received = useQuery({ queryKey: ["my-received-reviews"], queryFn: () => recvFn({ data: {} as never }) });
  const authored = useQuery({ queryKey: ["my-authored-reviews"], queryFn: () => authFn({ data: {} as never }) });

  const items = received.data?.items ?? [];
  const avg = received.data?.avg ?? 0;
  const count = received.data?.count ?? 0;
  const breakdown = received.data?.breakdown ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-received-reviews"] });
    qc.invalidateQueries({ queryKey: ["my-authored-reviews"] });
  };

  const respondMut = useMutation({
    mutationFn: (v: { reviewId: string; response: string }) => respFn({ data: v }),
    onSuccess: () => { toast.success("Response saved"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (reviewId: string) => delFn({ data: { reviewId } }),
    onSuccess: () => { toast.success("Review deleted"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Your rating</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <div className="text-center">
              <div className="font-display text-5xl font-bold">{avg.toFixed(1)}</div>
              <Stars value={Math.round(avg)} size={18} />
              <div className="mt-1 text-xs text-muted-foreground">{count} review{count === 1 ? "" : "s"}</div>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const n = breakdown[star] ?? 0;
                const pct = count ? (n / count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-muted-foreground">{star}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Received reviews */}
      <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Reviews you received</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {received.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!received.isLoading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">No reviews yet. As buyers interact with your listings they'll be able to rate you.</p>
          )}
          {items.map((r) => <ReceivedReviewCard key={r.id} review={r} onSave={(resp) => respondMut.mutate({ reviewId: r.id, response: resp })} />)}
        </CardContent>
      </Card>

      {/* Authored reviews */}
      <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Reviews you wrote</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {authored.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!authored.isLoading && (authored.data?.items.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">You haven't written any reviews yet.</p>
          )}
          {(authored.data?.items ?? []).map((r: any) => (
            <div key={r.id} className="flex items-start gap-3 rounded-xl border bg-white/40 p-3 dark:bg-white/5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={r.seller?.avatar_url ?? undefined} />
                <AvatarFallback>{(r.seller?.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/sellers/$id" params={{ id: r.seller_id }} className="text-sm font-medium hover:underline">
                    {r.seller?.display_name ?? "Seller"}
                  </Link>
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                </div>
                {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this review?")) deleteMut.mutate(r.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ReceivedReviewCard({ review, onSave }: { review: any; onSave: (response: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.response ?? "");
  const hasResponse = !!review.response;

  return (
    <div className="rounded-xl border bg-white/40 p-3 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={review.reviewer?.avatar_url ?? undefined} />
          <AvatarFallback>{(review.reviewer?.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{review.reviewer?.display_name ?? "Buyer"}</span>
            <Stars value={review.rating} />
            <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), "MMM d, yyyy")}</span>
          </div>
          {review.body && <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>}
          {Array.isArray(review.photo_urls) && review.photo_urls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {review.photo_urls.map((u: string, i: number) => (
                <img key={i} src={u} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Response */}
      <div className="mt-3 border-t border-border/40 pt-3">
        {hasResponse && !editing ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <MessageSquare className="h-3.5 w-3.5" /> Your response
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 gap-1 text-xs">
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{review.response}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Reply publicly to this review…"
              className="bg-white/70"
            />
            <div className="flex justify-end gap-2">
              {editing && (
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setText(review.response ?? ""); }}>
                  Cancel
                </Button>
              )}
              <Button size="sm" onClick={() => { onSave(text.trim()); setEditing(false); }} disabled={!text.trim()}>
                {hasResponse ? "Save response" : "Post response"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
