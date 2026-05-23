import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Tag, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/listings/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          categories(name, slug),
          cities(name, region, country),
          listing_images(url, sort_order)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", data.user_id)
        .maybeSingle();
      return { ...data, profile };
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;
  if (error || !listing) return <div className="container mx-auto px-4 py-10">Listing not found.</div>;

  const images = (listing.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const priceFmt = listing.price != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: listing.currency || "USD", maximumFractionDigits: 0 }).format(Number(listing.price))
    : "Contact for price";

  return (
    <div className="container mx-auto px-4 py-6">
      <Link to="/search" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to results
      </Link>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl border bg-muted">
            {images[0] ? (
              <img src={images[0].url} alt={listing.title} className="aspect-square w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center text-6xl text-muted-foreground">📦</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {images.slice(1).map((img: any) => (
                <img key={img.url} src={img.url} alt="" className="aspect-square rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>
          <div className="mt-2 text-3xl font-bold text-primary">{priceFmt}</div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {listing.cities && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.cities.name}, {listing.cities.region}</span>
            )}
            {listing.categories && (
              <Link to="/search" search={{ category: listing.categories.slug } as any} className="inline-flex items-center gap-1 hover:text-primary">
                <Tag className="h-4 w-4" /> {listing.categories.name}
              </Link>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
            </span>
          </div>

          {listing.condition && listing.condition !== "not_applicable" && (
            <span className="mt-3 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
              {String(listing.condition).replace("_", " ")}
            </span>
          )}

          <div className="mt-6 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
            {listing.description}
          </div>

          <div className="mt-8 rounded-xl border bg-card p-4">
            <div className="text-sm text-muted-foreground">Seller</div>
            <div className="mt-1 font-medium">{listing.profiles?.display_name ?? "Seller"}</div>
            <Button className="mt-3 w-full" disabled>Message seller (coming soon)</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
