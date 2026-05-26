import { Link } from "@tanstack/react-router";
import { MapPin, Sparkles, Flame } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

type Listing = {
  id: string;
  slug?: string | null;
  title: string;
  condition?: string;
  bumped_at?: string;
  cities?: { name: string; region: string; country: string } | null;
  listing_images?: { url: string; sort_order: number }[];
  listing_promotions?: { type: string; ends_at: string }[] | null;
};

export function ListingCard({ listing, featured }: { listing: Listing; featured?: boolean }) {
  const img = listing.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
  const isFeatured = featured || listing.listing_promotions?.some((p) => new Date(p.ends_at) > new Date());
  const isBumped = !isFeatured && listing.bumped_at && (Date.now() - new Date(listing.bumped_at).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.slug ?? listing.id }}
      className={`group hover-float flex flex-col overflow-hidden rounded-2xl glass ${isFeatured ? "iridescent-border" : ""}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={img ?? listingPlaceholder}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        {isFeatured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full btn-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-3 w-3" /> Premium
          </span>
        )}
        {isBumped && (
          <span
            className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow"
            style={{ background: "var(--gradient-warm)" }}
          >
            <Flame className="h-3 w-3" /> Bumped
          </span>
        )}
        <FavoriteButton listingId={listing.id} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-medium text-foreground">{listing.title}</div>
        {listing.cities && (
          <div className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {listing.cities.name}, {listing.cities.region}
          </div>
        )}
      </div>
    </Link>
  );
}
