import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export function PriceHistoryChart({ listingId }: { listingId: string }) {
  const { data } = useQuery({
    queryKey: ["price-history", listingId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("listing_price_history")
        .select("price, changed_at")
        .eq("listing_id", listingId)
        .order("changed_at", { ascending: true })
        .limit(50);
      return (data ?? []).map((r) => ({ price: Number(r.price), at: r.changed_at as string }));
    },
  });

  if (!data || data.length < 2) return null;

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(1, max - min);
  const W = 200, H = 48, P = 4;
  const step = (W - P * 2) / (data.length - 1);
  const points = data
    .map((d, i) => `${(P + i * step).toFixed(1)},${(H - P - ((d.price - min) / range) * (H - P * 2)).toFixed(1)}`)
    .join(" ");
  const first = prices[0];
  const last = prices[prices.length - 1];
  const diff = last - first;
  const pct = first ? (diff / first) * 100 : 0;
  const Icon = diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus;
  const tone = diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-600" : "text-muted-foreground";

  return (
    <div className="iridescent-border mt-4 rounded-2xl border border-white/40 bg-white/65 p-4 shadow-[var(--shadow-float)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Price history
        </div>
        <div className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
          {diff > 0 ? "+" : ""}{diff.toFixed(0)} ({pct.toFixed(1)}%)
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full overflow-visible">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={P + i * step}
            cy={H - P - ((d.price - min) / range) * (H - P * 2)}
            r={i === data.length - 1 ? 2.5 : 1.5}
            fill="hsl(var(--primary))"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>${min.toFixed(0)} low</span>
        <span>${max.toFixed(0)} high</span>
      </div>
    </div>
  );
}
