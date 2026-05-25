import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ChevronRight, Flame, MapPin } from "lucide-react";
import { useCity } from "@/lib/city-context";
import catForSale from "@/assets/cat-for-sale.jpg";
import catVehicles from "@/assets/cat-vehicles.jpg";
import catHousing from "@/assets/cat-housing.jpg";
import catJobs from "@/assets/cat-jobs.jpg";
import catServices from "@/assets/cat-services.jpg";
import catElectronics from "@/assets/cat-electronics.jpg";
import catFurniture from "@/assets/cat-furniture.jpg";
import catPets from "@/assets/cat-pets.jpg";
import catCommunity from "@/assets/cat-community.jpg";
import emptyListingImg from "@/assets/listing-placeholder.jpg";

const CATEGORY_IMAGES: Record<string, string> = {
  "for-sale": catForSale,
  vehicles: catVehicles,
  housing: catHousing,
  jobs: catJobs,
  services: catServices,
  electronics: catElectronics,
  furniture: catFurniture,
  pets: catPets,
  community: catCommunity,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marketly — Buy & sell locally across the US, UK & Canada" },
      { name: "description", content: "Find great deals on vehicles, housing, jobs, electronics, furniture and more. Post a free listing in minutes." },
      { property: "og:title", content: "Marketly — Buy & sell locally" },
      { property: "og:description", content: "Country-wide classifieds marketplace. Browse or post free listings in minutes." },
      { property: "og:url", content: "https://devads.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://devads.lovable.app/" }],
  }),
  component: Home,
});

function Home() {
  const { cityId, cityName, hydrated, openPicker } = useCity();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, icon")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", "home", cityId],
    enabled: !!cityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id, title, price, currency, condition, created_at, bumped_at,
          categories(name, slug),
          cities(name, region, country),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)
        `)
        .eq("status", "active")
        .eq("city_id", cityId!)
        .order("bumped_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data;
    },
  });

  const featured = listings?.filter((l: any) =>
    l.listing_promotions?.some((p: any) => new Date(p.ends_at) > new Date())
  ) ?? [];
  const bumped = (listings ?? []).filter((l: any) =>
    !featured.includes(l) && l.bumped_at && (Date.now() - new Date(l.bumped_at).getTime()) < 24 * 60 * 60 * 1000
  ).slice(0, 12);
  const recent = listings?.filter((l: any) => !featured.includes(l) && !bumped.includes(l)) ?? [];

  const heroFeatured = featured[0] ?? listings?.[0];
  const heroImg = heroFeatured?.listing_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url ?? emptyListingImg;
  const heroPrice = heroFeatured?.price != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: heroFeatured.currency || "USD", maximumFractionDigits: 0 }).format(Number(heroFeatured.price))
    : null;

  const cat = (slug: string) => categories?.find((c) => c.slug === slug);
  const electronicsCat = cat("electronics");
  const furnitureCat = cat("furniture");
  const petsCat = cat("pets");

  return (
    <div className="pt-4">
      {/* Hero band */}
      <section className="container mx-auto max-w-3xl px-4 pt-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-6 md:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-secondary opacity-25 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-primary opacity-25 blur-[80px]" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/70 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Free to post · Free to browse
            </span>
            <h1 className="mt-5 bg-gradient-to-br from-white via-white to-white/60 bg-clip-text font-display text-4xl font-bold leading-[1.05] tracking-tight text-transparent md:text-6xl">
              Buy &amp; sell locally — across the country.
            </h1>
            <p className="mt-4 max-w-xl pr-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              From vintage bikes in Brooklyn to apartments in Manchester — find what's near you, or post your own in under a minute.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="btn-gradient rounded-2xl border-0 px-7 py-6 text-base font-bold shadow-[var(--shadow-glow-primary)]">
                <Link to="/post">Post a listing</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="group rounded-2xl border-white/10 bg-white/5 px-7 py-6 text-base font-bold text-foreground backdrop-blur hover:bg-white/10">
                <Link to="/search">Browse all <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="container mx-auto max-w-3xl px-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Large featured listing — typographic, image as low-opacity texture */}
          {heroFeatured ? (
            <Link
              to="/listings/$id"
              params={{ id: heroFeatured.id }}
              className="group relative col-span-2 h-48 overflow-hidden rounded-[2rem] md:h-56"
            >
              <img
                src={heroImg}
                alt={heroFeatured.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-110 group-hover:opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/30" />
              <div className="absolute inset-0 bg-card/40 backdrop-blur-[2px]" />
              <div className="relative z-10 flex h-full flex-col justify-between p-6">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">
                    <Sparkles className="h-3 w-3" /> Featured
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-bold text-white">{heroFeatured.title}</h3>
                  {heroPrice && (
                    <p className="mt-1 text-xs text-white/70">{heroPrice}{heroFeatured.cities ? ` · ${heroFeatured.cities.name}` : ""}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">View listing</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/10 text-white transition-colors group-hover:bg-white group-hover:text-black">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              to="/search"
              search={{ category: electronicsCat?.slug ?? "electronics" } as any}
              className="group relative col-span-2 h-48 overflow-hidden rounded-[2rem]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/20" />
              <div className="absolute inset-0 bg-card/40 backdrop-blur-[2px]" />
              <div className="relative z-10 flex h-full flex-col justify-between p-6">
                <div>
                  <h3 className="font-display text-2xl font-bold">{electronicsCat?.name ?? "Electronics"}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Latest gadgets &amp; tech gear</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Explore</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/10 text-foreground transition-colors group-hover:bg-white group-hover:text-black">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Furniture — amber icon tile */}
          <Link
            to="/search"
            search={{ category: furnitureCat?.slug ?? "furniture" } as any}
            className="group flex aspect-square flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 p-5 text-center transition-colors hover:bg-white/10"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20">
              <img src={catFurniture} alt="" className="h-7 w-7 rounded-lg object-cover" loading="lazy" />
            </div>
            <h4 className="font-display text-sm font-bold">{furnitureCat?.name ?? "Furniture"}</h4>
            <p className="mt-1 text-[10px] text-muted-foreground">Home goods</p>
          </Link>

          {/* Pets — coral icon tile */}
          <Link
            to="/search"
            search={{ category: petsCat?.slug ?? "pets" } as any}
            className="group flex aspect-square flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 p-5 text-center transition-colors hover:bg-white/10"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "color-mix(in oklab, var(--coral) 22%, transparent)" }}>
              <img src={catPets} alt="" className="h-7 w-7 rounded-lg object-cover" loading="lazy" />
            </div>
            <h4 className="font-display text-sm font-bold">{petsCat?.name ?? "Pets"}</h4>
            <p className="mt-1 text-[10px] text-muted-foreground">Find a friend</p>
          </Link>
        </div>
      </section>

      {/* Category chip strip */}
      <section className="container mx-auto px-4 pt-8">
        <h2 className="sr-only">All categories</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/search"
              search={{ category: c.slug } as any}
              className="group flex flex-shrink-0 items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium hover:border-primary/50"
            >
              <img
                src={CATEGORY_IMAGES[c.slug] ?? emptyListingImg}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* City context banner */}
      {hydrated && cityId && (
        <section className="container mx-auto px-4 pt-6">
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium hover:border-primary/50"
          >
            <MapPin className="h-4 w-4 text-primary" />
            Showing listings in <span className="font-bold">{cityName}</span>
            <span className="text-xs text-muted-foreground">· change</span>
          </button>
        </section>
      )}

      {hydrated && !cityId && (
        <section className="container mx-auto px-4 pt-10 pb-16">
          <div className="flex flex-col items-center gap-4 rounded-[2rem] glass p-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl btn-gradient text-white">
              <MapPin className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold">Pick a city to see listings</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              We'll only show ads from the city you choose so you can find what's near you faster.
            </p>
            <Button onClick={openPicker} className="btn-gradient rounded-full border-0 px-6">
              Choose your city
            </Button>
          </div>
        </section>
      )}

      {cityId && (<>
      {/* Featured row */}
      {featured.length > 1 && (
        <section className="container mx-auto px-4 pt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Featured listings
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.slice(1).map((l: any) => <ListingCard key={l.id} listing={l} featured />)}
          </div>
        </section>
      )}

      {/* Trending / Bumped rail */}
      {bumped.length > 0 && (
        <section className="container mx-auto px-4 pt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Flame className="h-5 w-5" style={{ color: "var(--coral)" }} /> <span className="gradient-text-warm">Trending now</span>
            </h2>
            <Link to="/search" className="text-sm font-medium text-primary hover:underline">See all →</Link>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar snap-x snap-mandatory">
            {bumped.map((l: any) => (
              <div key={l.id} className="w-44 flex-shrink-0 snap-start sm:w-56">
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent listings */}
      <section className="container mx-auto px-4 pt-10 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Latest listings</h2>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/40" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl glass p-10 text-center text-muted-foreground">
            <img src={emptyListingImg} alt="" width={160} height={160} loading="lazy" className="h-40 w-40 object-contain" />
            <div>No listings yet. <Link to="/post" className="font-medium text-primary hover:underline">Be the first to post!</Link></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {recent.map((l: any) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>
      </>)}
    </div>
  );
}
