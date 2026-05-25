import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { getRecentlyViewed } from "@/lib/recently-viewed";

export function RecentlyViewedRail() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => { setIds(getRecentlyViewed()); }, []);

  const { data: listings } = useQuery({
    queryKey: ["recently-viewed", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select(`id, title, bumped_at, condition,
          categories(name, slug),
          cities(name, region, country),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)`)
        .in("id", ids)
        .eq("status", "active");
      const byId = new Map((data ?? []).map((l: any) => [l.id, l]));
      return ids.map((i) => byId.get(i)).filter(Boolean);
    },
  });

  if (!listings || listings.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Recently viewed
        </h2>
        <Link to="/search" className="text-sm font-medium text-primary hover:underline">Keep browsing →</Link>
      </div>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar snap-x snap-mandatory">
        {listings.map((l: any) => (
          <div key={l.id} className="w-44 flex-shrink-0 snap-start sm:w-56">
            <ListingCard listing={l} />
          </div>
        ))}
      </div>
    </section>
  );
}
