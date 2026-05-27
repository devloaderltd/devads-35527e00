import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./admin-middleware";

export type HeroConfig = {
  badge: string;
  title: string;
  subtitle: string;
  cta1_label: string;
  cta1_url: string;
  cta2_label: string;
  cta2_url: string;
};
export type BentoFeatured = {
  pinned_listing_id: string | null;
  badge_label: string;
  enabled: boolean;
};
export type BentoTile = {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  gradient: "primary" | "lavender" | "amber" | "ocean";
  enabled: boolean;
};
export type Sections = {
  trust_stats: boolean;
  chip_strip: boolean;
  recently_viewed: boolean;
  trending_rail: boolean;
  featured_row: boolean;
  bumped_rail: boolean;
  latest: boolean;
  city_banner: boolean;
};
export type HomepageConfig = {
  hero: HeroConfig;
  bento_featured: BentoFeatured;
  bento_tile_2: BentoTile;
  bento_tile_3: BentoTile;
  bento_tile_4: BentoTile;
  sections: Sections;
};

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  hero: {
    badge: "Free to post · Free to browse",
    title: "Buy & sell locally — {accent}across the country.{/accent}",
    subtitle:
      "From vintage bikes in Brooklyn to apartments in Manchester — find what's near you, or post your own in under a minute.",
    cta1_label: "Post a listing",
    cta1_url: "/post",
    cta2_label: "Browse all",
    cta2_url: "/search",
  },
  bento_featured: { pinned_listing_id: null, badge_label: "Featured", enabled: true },
  bento_tile_2: {
    title: "Electronics",
    subtitle: "Latest gadgets, phones & tech gear",
    image_url: "",
    link_url: "/search?category=electronics",
    gradient: "primary",
    enabled: true,
  },
  bento_tile_3: {
    title: "Furniture",
    subtitle: "Browse home goods",
    image_url: "",
    link_url: "/search?category=furniture",
    gradient: "lavender",
    enabled: true,
  },
  bento_tile_4: {
    title: "Pets",
    subtitle: "Find a new friend",
    image_url: "",
    link_url: "/search?category=pets",
    gradient: "amber",
    enabled: true,
  },
  sections: {
    trust_stats: true,
    chip_strip: true,
    recently_viewed: true,
    trending_rail: true,
    featured_row: true,
    bumped_rail: true,
    latest: true,
    city_banner: true,
  },
};

export const getHomepageConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("homepage_config")
    .select("hero, bento_featured, bento_tile_2, bento_tile_3, bento_tile_4, sections")
    .eq("id", "global")
    .maybeSingle();
  if (!data) return { config: DEFAULT_HOMEPAGE_CONFIG };
  return {
    config: {
      hero: { ...DEFAULT_HOMEPAGE_CONFIG.hero, ...(data.hero as object) },
      bento_featured: { ...DEFAULT_HOMEPAGE_CONFIG.bento_featured, ...(data.bento_featured as object) },
      bento_tile_2: { ...DEFAULT_HOMEPAGE_CONFIG.bento_tile_2, ...(data.bento_tile_2 as object) },
      bento_tile_3: { ...DEFAULT_HOMEPAGE_CONFIG.bento_tile_3, ...(data.bento_tile_3 as object) },
      bento_tile_4: { ...DEFAULT_HOMEPAGE_CONFIG.bento_tile_4, ...(data.bento_tile_4 as object) },
      sections: { ...DEFAULT_HOMEPAGE_CONFIG.sections, ...(data.sections as object) },
    } satisfies HomepageConfig,
  };
});

const heroSchema = z.object({
  badge: z.string().max(120),
  title: z.string().min(1).max(240),
  subtitle: z.string().max(500),
  cta1_label: z.string().max(40),
  cta1_url: z.string().max(500),
  cta2_label: z.string().max(40),
  cta2_url: z.string().max(500),
});
const bentoFeaturedSchema = z.object({
  pinned_listing_id: z.string().uuid().nullable(),
  badge_label: z.string().max(40),
  enabled: z.boolean(),
});
const bentoTileSchema = z.object({
  title: z.string().max(80),
  subtitle: z.string().max(160),
  image_url: z.string().max(500),
  link_url: z.string().max(500),
  gradient: z.enum(["primary", "lavender", "amber", "ocean"]),
  enabled: z.boolean(),
});
const sectionsSchema = z.object({
  trust_stats: z.boolean(),
  chip_strip: z.boolean(),
  recently_viewed: z.boolean(),
  trending_rail: z.boolean(),
  featured_row: z.boolean(),
  bumped_rail: z.boolean(),
  latest: z.boolean(),
  city_banner: z.boolean(),
});

const SECTION_SCHEMAS = {
  hero: heroSchema,
  bento_featured: bentoFeaturedSchema,
  bento_tile_2: bentoTileSchema,
  bento_tile_3: bentoTileSchema,
  bento_tile_4: bentoTileSchema,
  sections: sectionsSchema,
} as const;

export const saveHomepageConfig = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { section: keyof typeof SECTION_SCHEMAS; data: unknown }) => {
    const schema = SECTION_SCHEMAS[input.section];
    if (!schema) throw new Error("Invalid section");
    return { section: input.section, data: schema.parse(input.data) };
  })
  .handler(async ({ data, context }) => {
    const payload: Record<string, unknown> = {
      id: "global",
      updated_at: new Date().toISOString(),
      [data.section]: data.data,
    };
    const { error } = await supabaseAdmin
      .from("homepage_config")
      .upsert(payload as never, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("log_admin_action", {
      _actor: context.userId,
      _action: "homepage_config.update",
      _target_type: "homepage_config",
      _target_id: data.section,
      _metadata: {} as never,
    });
    return { ok: true };
  });
