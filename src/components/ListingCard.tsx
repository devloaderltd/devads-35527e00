import { Link } from "@tanstack/react-router";
import { MapPin, Sparkles } from "lucide-react";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

type Listing = {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  condition?: string;
  cities?: { name: string; region: string; country: string } | null;
  listing_images?: { url: string; sort_order: number }[];
};

export function ListingCard({ listing, featured }: { listing: Listing; featured?: boolean }) {
  const img = listing.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
  const priceFmt =
    listing.price != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: listing.currency || "USD", maximumFractionDigits: 0 }).format(Number(listing.price))
      : "Contact";

  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:border-primary hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={img ?? listingPlaceholder}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-promo px-2 py-0.5 text-xs font-semibold text-promo-foreground">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="text-base font-semibold text-primary">{priceFmt}</div>
        <div className="line-clamp-2 text-sm">{listing.title}</div>
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
