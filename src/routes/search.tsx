import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Browse listings — Marketly" }] }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug").order("sort_order");
      return data ?? [];
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities", search.country],
    enabled: !!search.country,
    queryFn: async () => {
      const { data } = await supabase
        .from("cities")
        .select("id, name, region, slug, country")
        .eq("country", search.country!)
        .order("name")
        .limit(500);
      return data ?? [];
    },
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", "search", search],
    queryFn: async () => {
      let q = supabase
        .from("listings")
        .select(`
          id, title, price, currency, created_at, bumped_at,
          categories!inner(name, slug),
          cities!inner(name, region, country, slug),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)
        `)
        .eq("status", "active")
        .order("bumped_at", { ascending: false })
        .limit(60);
      if (search.q) q = q.textSearch("search_tsv", search.q, { type: "websearch" });
      if (search.category) q = q.eq("categories.slug", search.category);
      if (search.country) q = q.eq("cities.country", search.country);
      if (search.city) q = q.eq("cities.slug", search.city);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const update = (patch: Partial<typeof search>) =>
    navigate({ search: { ...search, ...patch } as any });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Browse <span className="gradient-text">listings</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Find something great near you.</p>
      </div>
      <div className="mb-6 grid gap-3 rounded-2xl border border-white/40 bg-white/55 p-3 shadow-[var(--shadow-float)] backdrop-blur-xl md:grid-cols-[1fr_180px_180px_180px]">
        <Input
          placeholder="Search…"
          defaultValue={search.q ?? ""}
          className="bg-white/70"
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value || undefined });
          }}
        />
        <Select value={search.category ?? "all"} onValueChange={(v) => update({ category: v === "all" ? undefined : v })}>
          <SelectTrigger className="bg-white/70"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={search.country ?? "all"} onValueChange={(v) => update({ country: v === "all" ? undefined : v, city: undefined })}>
          <SelectTrigger className="bg-white/70"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            <SelectItem value="US">United States</SelectItem>
            <SelectItem value="UK">United Kingdom</SelectItem>
            <SelectItem value="CA">Canada</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={search.city ?? "all"}
          onValueChange={(v) => update({ city: v === "all" ? undefined : v })}
          disabled={!search.country}
        >
          <SelectTrigger className="bg-white/70"><SelectValue placeholder={search.country ? "City" : "Pick country"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities?.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}, {c.region}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>


      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !listings?.length ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          No matching listings. Try a different search or <Link to="/post" className="text-primary hover:underline">post one</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l: any) => {
            const isFeatured = l.listing_promotions?.some((p: any) => new Date(p.ends_at) > new Date());
            return <ListingCard key={l.id} listing={l} featured={isFeatured} />;
          })}
        </div>
      )}
    </div>
  );
}
