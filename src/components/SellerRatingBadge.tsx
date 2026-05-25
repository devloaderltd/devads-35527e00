import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { listSellerReviews } from "@/lib/extras.functions";

export function SellerRatingBadge({
  sellerId,
  size = "sm",
}: {
  sellerId: string;
  size?: "sm" | "md";
}) {
  const fn = useServerFn(listSellerReviews);
  const { data } = useQuery({
    queryKey: ["seller-reviews", sellerId],
    queryFn: () => fn({ data: { sellerId } }),
    staleTime: 60_000,
  });

  if (!data || data.count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3.5 w-3.5" /> No reviews yet
      </span>
    );
  }
  const cls = size === "md" ? "text-sm" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold">{data.avg.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({data.count} review{data.count === 1 ? "" : "s"})
      </span>
    </span>
  );
}
