import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-marketplace.jpg";
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
      { title: "Marketly — Buy & sell locally across the US, UK, and Canada" },
      { name: "description", content: "Find great deals on vehicles, housing, jobs, electronics, furniture and more. Post a free listing in minutes." },
    ],
  }),
  component: Home,
});

function Home() {
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
    queryKey: ["listings", "home"],
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
        .order("bumped_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data;
    },
  });

  const featured = listings?.filter((l: any) =>
    l.listing_promotions?.some((p: any) => new Date(p.ends_at) > new Date())
  ) ?? [];
  const recent = listings?.filter((l: any) => !featured.includes(l)) ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-accent via-background to-background">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Free to post, free to browse
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">
              Buy & sell locally — across the country.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              From vintage bikes in Brooklyn to apartments in Manchester — find what's near you, or post your own in under a minute.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/post">Post a listing</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/search">Browse all <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="Illustration of a vibrant local marketplace with sellers and shoppers"
              width={1536}
              height={1024}
              className="w-full rounded-2xl border bg-card object-cover shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="mb-4 font-display text-2xl font-semibold">Browse categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/search"
              search={{ category: c.slug } as any}
              className="group overflow-hidden rounded-xl border bg-card transition hover:border-primary hover:shadow-sm"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={CATEGORY_IMAGES[c.slug] ?? emptyListingImg}
                  alt={c.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="p-3 font-medium group-hover:text-primary">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 pb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-promo" /> Featured listings
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((l: any) => <ListingCard key={l.id} listing={l} featured />)}
          </div>
        </section>
      )}

      {/* Recent */}
      <section className="container mx-auto px-4 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Recent listings</h2>
          <Link to="/search" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center text-muted-foreground">
            <img src={emptyListingImg} alt="" width={160} height={160} loading="lazy" className="h-40 w-40 object-contain" />
            <div>No listings yet. <Link to="/post" className="text-primary hover:underline">Be the first to post!</Link></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {recent.map((l: any) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}
