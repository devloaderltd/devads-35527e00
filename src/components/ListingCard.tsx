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
      className="group hover-float flex flex-col overflow-hidden rounded-2xl glass"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={img ?? listingPlaceholder}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <span className="absolute right-2 top-2 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-foreground backdrop-blur-md shadow-sm">
          {priceFmt}
        </span>
        {featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full btn-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        )}
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
