import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { SiteBanner } from "@/components/SiteBanner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ChevronRight, Flame, MapPin, ShieldCheck, Users } from "lucide-react";
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
          id, title, condition, created_at, bumped_at,
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

  const { data: siteStats } = useQuery({
    queryKey: ["site-stats"],
    queryFn: async () => {
      const [listingsRes, sellersRes, citiesRes] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("cities").select("id", { count: "exact", head: true }),
      ]);
      return {
        listings: listingsRes.count ?? 0,
        sellers: sellersRes.count ?? 0,
        cities: citiesRes.count ?? 0,
      };
    },
    staleTime: 10 * 60_000,
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

  const cat = (slug: string) => categories?.find((c) => c.slug === slug);
  const electronicsCat = cat("electronics");
  const furnitureCat = cat("furniture");
  const petsCat = cat("pets");

  return (
    <div className="pt-0">
      <SiteBanner />
      {/* Hero band */}
      <section className="container mx-auto px-4 pt-6">
        <div className="relative overflow-hidden rounded-[2rem] glass-strong p-6 md:p-12 shadow-[var(--shadow-float)]">
          <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[var(--gradient-primary)] opacity-20 blur-3xl" />
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-accent/40 opacity-40 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/80">
              <Sparkles className="h-3 w-3" /> Free to post · Free to browse
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Buy &amp; sell locally —{" "}
              <span className="gradient-text">across the country.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              From vintage bikes in Brooklyn to apartments in Manchester — find what's near you, or post your own in under a minute.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="btn-gradient rounded-2xl border-0 px-7 py-6 text-base font-bold">
                <Link to="/post">Post a listing</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/70 bg-white/60 px-7 py-6 text-base font-bold backdrop-blur hover:bg-white">
                <Link to="/search">Browse all <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="container mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2 md:auto-rows-fr md:h-[560px]">
          {/* Large featured listing */}
          {heroFeatured ? (
            <Link
              to="/listings/$id"
              params={{ id: heroFeatured.id }}
              className="group relative col-span-1 row-span-1 overflow-hidden rounded-[2rem] glass md:col-span-2 md:row-span-2"
            >
              <img
                src={heroImg}
                alt={heroFeatured.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
                <span className="self-start rounded-full btn-gradient px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  <Sparkles className="mr-1 inline h-3 w-3" /> Featured
                </span>
                <div className="text-white">
                  <h3 className="font-display text-2xl font-bold leading-tight md:text-3xl">{heroFeatured.title}</h3>
                  {heroFeatured.cities && (
                    <p className="mt-1 text-sm text-white/80">
                      {heroFeatured.cities.name}, {heroFeatured.cities.region}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="col-span-1 row-span-1 rounded-[2rem] glass md:col-span-2 md:row-span-2" />
          )}

          {/* Medium gradient category — Electronics */}
          <Link
            to="/search"
            search={{ category: electronicsCat?.slug ?? "electronics" } as any}
            className="group relative col-span-1 overflow-hidden rounded-[2rem] p-6 text-white md:col-span-2 hover-float"
            style={{ background: "var(--gradient-primary)", backgroundSize: "200% 200%" }}
          >
            <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/30 blur-2xl" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold md:text-3xl">{electronicsCat?.name ?? "Electronics"}</h3>
                <p className="mt-1 text-sm text-white/85">Latest gadgets, phones & tech gear</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">Explore</span>
                <span className="rounded-full bg-white/20 p-3 backdrop-blur-md transition group-hover:bg-white/30">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </div>
            </div>
          </Link>

          {/* Small colorful category — Furniture (lavender→indigo) */}
          <Link
            to="/search"
            search={{ category: furnitureCat?.slug ?? "furniture" } as any}
            className="group hover-float relative col-span-1 overflow-hidden rounded-[2rem] p-6 flex flex-col items-center justify-center text-center text-white"
            style={{ background: "linear-gradient(135deg, var(--lavender), var(--primary))" }}
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/30 blur-2xl" />
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/25 backdrop-blur-md">
              <img src={catFurniture} alt="" className="h-8 w-8 rounded-lg object-cover" />
            </div>
            <span className="font-display font-bold">{furnitureCat?.name ?? "Furniture"}</span>
            <span className="mt-1 text-xs text-white/85">Browse home goods</span>
          </Link>

          {/* Small colorful category — Pets (amber→coral) */}
          <Link
            to="/search"
            search={{ category: petsCat?.slug ?? "pets" } as any}
            className="group hover-float relative col-span-1 overflow-hidden rounded-[2rem] p-6 flex flex-col items-center justify-center text-center text-white"
            style={{ background: "linear-gradient(135deg, var(--amber), var(--coral))" }}
          >
            <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-white/30 blur-2xl" />
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/25 backdrop-blur-md">
              <img src={catPets} alt="" className="h-8 w-8 rounded-lg object-cover" />
            </div>
            <span className="font-display font-bold">{petsCat?.name ?? "Pets"}</span>
            <span className="mt-1 text-xs text-white/85">Find a new friend</span>
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

      {/* Trust strip */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 gap-4 rounded-[2rem] glass p-6 md:grid-cols-4 md:p-8">
          <TrustTile icon={<Sparkles className="h-5 w-5" />} value={(siteStats?.listings ?? 0).toLocaleString()} label="Active listings" />
          <TrustTile icon={<Users className="h-5 w-5" />} value={(siteStats?.sellers ?? 0).toLocaleString()} label="Trusted sellers" />
          <TrustTile icon={<MapPin className="h-5 w-5" />} value={(siteStats?.cities ?? 0).toLocaleString()} label="Cities covered" />
          <TrustTile icon={<ShieldCheck className="h-5 w-5" />} value="100%" label="Free to post" />
        </div>
      </section>
    </div>
  );
}

function TrustTile({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-[var(--shadow-glow-primary)]">
        {icon}
      </span>
      <div>
        <div className="font-display text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
