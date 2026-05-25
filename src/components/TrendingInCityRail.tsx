import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";

export function TrendingInCityRail({ cityId, cityName }: { cityId: string | null; cityName?: string | null }) {
  const { data: listings } = useQuery({
    queryKey: ["trending-in-city", cityId],
    enabled: !!cityId,
    queryFn: async () => {
      const sinceIso = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("listings")
        .select(`id, title, view_count, bumped_at, condition,
          categories(name, slug),
          cities(name, region, country),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)`)
        .eq("status", "active")
        .eq("city_id", cityId!)
        .gte("created_at", sinceIso)
        .order("view_count", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  if (!listings || listings.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trending {cityName ? <>in <span className="gradient-text">{cityName}</span></> : "now"}
        </h2>
        <Link to="/search" className="text-sm font-medium text-primary hover:underline">See all →</Link>
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
