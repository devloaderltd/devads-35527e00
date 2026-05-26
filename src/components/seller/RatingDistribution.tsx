import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

export function RatingDistribution({ sellerId }: { sellerId: string }) {
  const { data } = useQuery({
    queryKey: ["seller-rating-dist", sellerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_reviews")
        .select("rating")
        .eq("seller_id", sellerId);
      const ratings = (data ?? []).map((r) => r.rating as number);
      const total = ratings.length;
      const avg = total ? ratings.reduce((s, r) => s + r, 0) / total : 0;
      const counts = [5, 4, 3, 2, 1].map((star) => ({
        star,
        n: ratings.filter((r) => Math.round(r) === star).length,
      }));
      return { total, avg, counts };
    },
  });

  if (!data || data.total === 0) return null;

  return (
    <div className="rounded-2xl glass p-4">
      <div className="flex items-end gap-4">
        <div>
          <div className="font-display text-3xl font-bold">{data.avg.toFixed(1)}</div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${s <= Math.round(data.avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{data.total} review{data.total === 1 ? "" : "s"}</div>
        </div>
        <div className="flex-1 space-y-1">
          {data.counts.map(({ star, n }) => {
            const pct = data.total ? Math.round((n / data.total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 tabular-nums text-muted-foreground">{star}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right tabular-nums text-muted-foreground">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
