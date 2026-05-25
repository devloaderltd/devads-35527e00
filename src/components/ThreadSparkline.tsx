import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ListingSparkline({ listingId }: { listingId: string }) {
  const { data } = useQuery({
    queryKey: ["sparkline", listingId],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data } = await supabase
        .from("listing_events")
        .select("created_at")
        .eq("listing_id", listingId)
        .eq("type", "view")
        .gte("created_at", since);
      const buckets = new Array(14).fill(0);
      const startDay = Math.floor((Date.now() - 14 * 86400000) / 86400000);
      (data ?? []).forEach((e: any) => {
        const day = Math.floor(new Date(e.created_at).getTime() / 86400000);
        const idx = day - startDay;
        if (idx >= 0 && idx < 14) buckets[idx]++;
      });
      return buckets;
    },
  });

  if (!data) return <div className="h-6 w-full" />;
  const max = Math.max(1, ...data);
  const W = 100, H = 24;
  const step = W / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`).join(" ");
  const total = data.reduce((s, v) => s + v, 0);
  return (
    <div className="flex items-center gap-2 px-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-6 flex-1 overflow-visible">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <span className="text-[10px] text-muted-foreground">{total} views · 14d</span>
    </div>
  );
}
