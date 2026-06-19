import { Link } from "@tanstack/react-router";
import { MapPin, Sparkles, Flame, Scale, Check, BadgeCheck, Eye, Clock } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useCompare, COMPARE_MAX } from "@/lib/compare-context";
import { toast } from "sonner";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";
import { formatDistanceToNow } from "date-fns";

type Listing = {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  condition?: string;
  bumped_at?: string;
  created_at?: string;
  view_count?: number;
  verified_at?: string | null;
  cities?: { name: string; region: string; country: string } | null;
  listing_images?: { url: string; sort_order: number }[];
  listing_promotions?: { type: string; ends_at: string }[] | null;
};

export const NEW_BADGE_HOURS = 24;

export function ListingCard({
  listing,
  featured,
  variant = "grid",
  newBadgeHours = NEW_BADGE_HOURS,
}: {
  listing: Listing;
  featured?: boolean;
  variant?: "grid" | "list";
  newBadgeHours?: number;
}) {
  const img = listing.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
  const isFeatured = featured || listing.listing_promotions?.some((p) => new Date(p.ends_at) > new Date());
  const isBumped = !isFeatured && listing.bumped_at && (Date.now() - new Date(listing.bumped_at).getTime()) < 24 * 60 * 60 * 1000;
  const isNew = !isFeatured && !isBumped && listing.created_at &&
    (Date.now() - new Date(listing.created_at).getTime()) < newBadgeHours * 60 * 60 * 1000;
  const isVerified = !!listing.verified_at;
  const { has, toggle, ids } = useCompare();
  const selected = has(listing.id);

  const onCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selected && ids.length >= COMPARE_MAX) {
      toast.error(`You can compare up to ${COMPARE_MAX} listings`);
      return;
    }
    toggle(listing.id);
  };

  if (variant === "list") {
    return (
      <Link
        to="/listings/$id"
        params={{ id: listing.slug ?? listing.id }}
        className={`group hover-float flex gap-3 overflow-hidden rounded-2xl glass p-2 ${isFeatured ? "iridescent-border" : ""}`}
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
          <img
            src={img ?? listingPlaceholder}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {isFeatured && (
            <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full btn-gradient px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 py-1 pr-1">
          <div className="flex items-start gap-2">
            <div className="line-clamp-2 flex-1 text-sm font-medium text-foreground">{listing.title}</div>
            {isVerified && (
              <span title="Verified seller" className="shrink-0">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
              </span>
            )}
          </div>
          {listing.description && (
            <div className="line-clamp-2 text-xs text-muted-foreground">{listing.description}</div>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
            {listing.cities && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {listing.cities.name}
              </span>
            )}
            {typeof listing.view_count === "number" && (
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> {listing.view_count}
              </span>
            )}
            {listing.bumped_at && (
              <span>{formatDistanceToNow(new Date(listing.bumped_at), { addSuffix: true })}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

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
        {isNew && !isBumped && !isFeatured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
            <Clock className="h-3 w-3" /> New
          </span>
        )}
        {isVerified && (
          <span
            title="Verified seller"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow"
          >
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        )}
        <FavoriteButton listingId={listing.id} />
        <button
          type="button"
          onClick={onCompare}
          aria-label={selected ? "Remove from compare" : "Add to compare"}
          title={selected ? "Remove from compare" : "Add to compare"}
          className={`absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-full border backdrop-blur transition ${
            selected
              ? "border-primary bg-primary text-primary-foreground shadow"
              : "border-white/60 bg-white/70 text-foreground opacity-0 group-hover:opacity-100 hover:bg-white"
          }`}
        >
          {selected ? <Check className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-medium text-foreground">{listing.title}</div>
        {listing.cities && (
          <div className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {listing.cities.name}, {listing.cities.region}
          </div>
        )}
        {listing.created_at && (
          <div className="text-[11px] text-muted-foreground/80">
            {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
          </div>
        )}
      </div>
    </Link>
  );
}
