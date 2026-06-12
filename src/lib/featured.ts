// Pure helpers for selecting the home page "featured" hero listing.
// Centralized so behavior can be unit-tested without rendering the page.

export type FeaturedListing = {
  id: string;
  status?: string | null;
  city_id?: string | null;
  published_at?: string | null;
  listing_promotions?: Array<{ type: string; ends_at: string }> | null;
  bumped_at?: string | null;
  created_at?: string | null;
  // Allow additional render-time fields (title, cities, listing_images, etc.)
  [key: string]: any;
};

/** A listing is "displayable" only if active, not hidden, and (if published_at is tracked) already published. */
export function isDisplayable(l: FeaturedListing | null | undefined, now: Date = new Date()): boolean {
  if (!l) return false;
  if (l.status && l.status !== "active") return false;
  if (l.published_at && new Date(l.published_at).getTime() > now.getTime()) return false;
  return true;
}

/** Has at least one active, unexpired Featured promotion. */
export function hasActiveFeaturedPromotion(l: FeaturedListing | null | undefined, now: Date = new Date()): boolean {
  if (!l?.listing_promotions) return false;
  return l.listing_promotions.some(
    (p) => p?.type === "featured" && p.ends_at && new Date(p.ends_at).getTime() > now.getTime(),
  );
}

/** Filter listings to the ones eligible to appear as a city-scoped Featured hero. */
export function pickCityFeatured(
  listings: FeaturedListing[] | null | undefined,
  cityId: string | null | undefined,
  now: Date = new Date(),
): FeaturedListing[] {
  if (!listings || !cityId) return [];
  return listings.filter(
    (l) => l.city_id === cityId && isDisplayable(l, now) && hasActiveFeaturedPromotion(l, now),
  );
}

/**
 * Resolve the hero listing for the home page.
 *
 * Rules:
 *  1. Admin-pinned listing wins — but only if it is displayable AND in the chosen city.
 *  2. Otherwise, the first city-scoped Featured listing (active + unexpired promo).
 *  3. Otherwise, the first displayable in-city listing (any).
 *  4. Otherwise, fall back to a global featured/latest listing — only when the chosen
 *     city has zero displayable listings at all.
 */
export function resolveHeroFeatured(args: {
  pinned?: FeaturedListing | null;
  cityListings?: FeaturedListing[] | null;
  cityId?: string | null;
  globalFallback?: FeaturedListing | null;
  now?: Date;
}): FeaturedListing | null {
  const now = args.now ?? new Date();
  const cityListings = (args.cityListings ?? []).filter(
    (l) => isDisplayable(l, now) && (!args.cityId || l.city_id === args.cityId),
  );

  if (args.pinned && isDisplayable(args.pinned, now) && args.pinned.city_id === args.cityId) {
    return args.pinned;
  }

  const cityFeatured = pickCityFeatured(cityListings, args.cityId, now);
  if (cityFeatured[0]) return cityFeatured[0];

  if (cityListings[0]) return cityListings[0];

  if (args.globalFallback && isDisplayable(args.globalFallback, now)) {
    return args.globalFallback;
  }

  return null;
}
