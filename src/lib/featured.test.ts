// @ts-expect-error - bun:test types are not installed; this file runs under `bun test`
import { describe, it, expect } from "bun:test";
import {
  isDisplayable,
  hasActiveFeaturedPromotion,
  pickCityFeatured,
  resolveHeroFeatured,
  type FeaturedListing,
} from "./featured";

const NOW = new Date("2026-06-12T12:00:00Z");
const FUTURE = "2026-12-31T00:00:00Z";
const PAST = "2026-01-01T00:00:00Z";

const make = (overrides: Partial<FeaturedListing>): FeaturedListing => ({
  id: "l1",
  status: "active",
  city_id: "nyc",
  ...overrides,
});

describe("isDisplayable", () => {
  it("rejects inactive listings", () => {
    expect(isDisplayable(make({ status: "draft" }), NOW)).toBe(false);
    expect(isDisplayable(make({ status: "removed" }), NOW)).toBe(false);
  });
  it("rejects unpublished (future published_at)", () => {
    expect(isDisplayable(make({ published_at: FUTURE }), NOW)).toBe(false);
  });
  it("accepts active + already published", () => {
    expect(isDisplayable(make({ published_at: PAST }), NOW)).toBe(true);
    expect(isDisplayable(make({}), NOW)).toBe(true);
  });
});

describe("hasActiveFeaturedPromotion", () => {
  it("requires type=featured and unexpired", () => {
    expect(hasActiveFeaturedPromotion(make({ listing_promotions: [{ type: "bump", ends_at: FUTURE }] }), NOW)).toBe(false);
    expect(hasActiveFeaturedPromotion(make({ listing_promotions: [{ type: "featured", ends_at: PAST }] }), NOW)).toBe(false);
    expect(hasActiveFeaturedPromotion(make({ listing_promotions: [{ type: "featured", ends_at: FUTURE }] }), NOW)).toBe(true);
  });
});

describe("pickCityFeatured", () => {
  it("filters to in-city + active + featured", () => {
    const ls: FeaturedListing[] = [
      make({ id: "a", city_id: "nyc", listing_promotions: [{ type: "featured", ends_at: FUTURE }] }),
      make({ id: "b", city_id: "la",  listing_promotions: [{ type: "featured", ends_at: FUTURE }] }),
      make({ id: "c", city_id: "nyc", status: "draft", listing_promotions: [{ type: "featured", ends_at: FUTURE }] }),
      make({ id: "d", city_id: "nyc", listing_promotions: [{ type: "featured", ends_at: PAST }] }),
    ];
    expect(pickCityFeatured(ls, "nyc", NOW).map((l) => l.id)).toEqual(["a"]);
  });
  it("returns [] when no city chosen", () => {
    expect(pickCityFeatured([make({})], null, NOW)).toEqual([]);
  });
});

describe("resolveHeroFeatured", () => {
  const featuredInCity = make({ id: "f-nyc", city_id: "nyc", listing_promotions: [{ type: "featured", ends_at: FUTURE }] });
  const featuredOtherCity = make({ id: "f-la", city_id: "la", listing_promotions: [{ type: "featured", ends_at: FUTURE }] });
  const recentInCity = make({ id: "r-nyc", city_id: "nyc" });
  const globalLatest = make({ id: "g", city_id: "tokyo" });

  it("uses pinned only when active and in chosen city", () => {
    const pinnedOk = make({ id: "pin", city_id: "nyc" });
    expect(resolveHeroFeatured({ pinned: pinnedOk, cityListings: [recentInCity], cityId: "nyc", now: NOW })?.id).toBe("pin");
    const pinnedWrongCity = make({ id: "pin", city_id: "la" });
    expect(resolveHeroFeatured({ pinned: pinnedWrongCity, cityListings: [recentInCity], cityId: "nyc", now: NOW })?.id).toBe("r-nyc");
    const pinnedInactive = make({ id: "pin", city_id: "nyc", status: "draft" });
    expect(resolveHeroFeatured({ pinned: pinnedInactive, cityListings: [recentInCity], cityId: "nyc", now: NOW })?.id).toBe("r-nyc");
  });

  it("city WITH active featured listing → returns that featured (matches city)", () => {
    const hero = resolveHeroFeatured({
      cityListings: [featuredInCity, recentInCity],
      cityId: "nyc",
      globalFallback: globalLatest,
      now: NOW,
    });
    expect(hero?.id).toBe("f-nyc");
    expect(hero?.city_id).toBe("nyc");
  });

  it("city WITHOUT featured but WITH listings → returns recent in-city (not global)", () => {
    const hero = resolveHeroFeatured({
      cityListings: [recentInCity],
      cityId: "nyc",
      globalFallback: globalLatest,
      now: NOW,
    });
    expect(hero?.id).toBe("r-nyc");
    expect(hero?.city_id).toBe("nyc");
  });

  it("city with ZERO active listings → falls back to global", () => {
    const hero = resolveHeroFeatured({
      cityListings: [],
      cityId: "nyc",
      globalFallback: globalLatest,
      now: NOW,
    });
    expect(hero?.id).toBe("g");
  });

  it("never returns a featured from a different city", () => {
    const hero = resolveHeroFeatured({
      cityListings: [featuredOtherCity], // mis-scoped data leaking in
      cityId: "nyc",
      globalFallback: globalLatest,
      now: NOW,
    });
    expect(hero?.id).not.toBe("f-la");
    expect(hero?.id).toBe("g"); // city had 0 in-city → global fallback
  });

  it("ignores inactive/expired/unpublished listings in city slice", () => {
    const expired = make({ id: "x", city_id: "nyc", listing_promotions: [{ type: "featured", ends_at: PAST }] });
    const draft = make({ id: "d", city_id: "nyc", status: "draft" });
    const future = make({ id: "u", city_id: "nyc", published_at: FUTURE });
    const hero = resolveHeroFeatured({
      cityListings: [expired, draft, future],
      cityId: "nyc",
      globalFallback: globalLatest,
      now: NOW,
    });
    // expired loses its featured badge AND its listing is still displayable (active),
    // so the hero falls through to the recent-in-city slot → expired ('x') wins as plain recent.
    expect(hero?.id).toBe("x");
  });

  it("returns null when no candidates anywhere", () => {
    expect(resolveHeroFeatured({ cityListings: [], cityId: "nyc", globalFallback: null, now: NOW })).toBe(null);
  });

  it("rejects global fallback that is itself inactive", () => {
    const badGlobal = make({ id: "g", status: "removed" });
    expect(resolveHeroFeatured({ cityListings: [], cityId: "nyc", globalFallback: badGlobal, now: NOW })).toBe(null);
  });
});
