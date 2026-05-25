import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bookmark, X, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { createSavedSearch } from "@/lib/extras.functions";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

const PAGE_SIZE = 24;

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "For parts" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "oldest", label: "Oldest" },
] as const;

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  condition: z.string().optional(),
  sort: z.enum(["recent", "oldest"]).optional(),
  page: z.coerce.number().min(1).optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Browse listings — CallEscort24" },
      { name: "description", content: "Search vehicles, housing, jobs, electronics, furniture and more across the CallEscort24 marketplace." },
      { property: "og:title", content: "Browse listings — CallEscort24" },
      { property: "og:description", content: "Filter by category, city and condition to find what you need." },
      { property: "og:url", content: "https://callescort24.org/search" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://callescort24.org/search" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const saveFn = useServerFn(createSavedSearch);
  const page = search.page ?? 1;
  const sort = search.sort ?? "recent";

  const [qInput, setQInput] = useState(search.q ?? "");

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

  const { data: result, isLoading } = useQuery({
    queryKey: ["listings", "search", search],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("listings")
        .select(`
          id, title, created_at, bumped_at, condition,
          categories!inner(name, slug),
          cities!inner(name, region, country, slug),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)
        `, { count: "exact" })
        .eq("status", "active");

      if (search.q) q = q.textSearch("search_tsv", search.q, { type: "websearch" });
      if (search.category) q = q.eq("categories.slug", search.category);
      if (search.country) q = q.eq("cities.country", search.country);
      if (search.city) q = q.eq("cities.slug", search.city);
      if (search.condition) q = q.eq("condition", search.condition);

      switch (sort) {
        case "oldest": q = q.order("created_at", { ascending: true }); break;
        default: q = q.order("bumped_at", { ascending: false });
      }

      const { data, error, count } = await q.range(from, to);
      if (error) throw error;
      return { listings: data ?? [], count: count ?? 0 };
    },
  });

  const update = (patch: Partial<typeof search>, resetPage = true) =>
    navigate({ search: { ...search, ...patch, ...(resetPage ? { page: undefined } : {}) } as any });

  const applyQ = () => update({ q: qInput.trim() || undefined });

  const clearAll = () => {
    setQInput("");
    navigate({ search: {} as any });
  };

  const saveSearch = useMutation({
    mutationFn: async () => {
      const name = prompt("Name this search", search.q || "My search") ?? "";
      if (!name.trim()) throw new Error("cancelled");
      return saveFn({ data: {
        name: name.trim(),
        filters: Object.fromEntries(Object.entries(search).filter(([_, v]) => v != null && v !== "")) as Record<string, unknown>,
        notify: true,
      } });
    },
    onSuccess: () => toast.success("Search saved. You'll be notified of matches."),
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message); },
  });

  const listings = result?.listings ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const activeFilters = [
    search.q && { key: "q", label: `"${search.q}"` },
    search.category && { key: "category", label: search.category },
    search.country && { key: "country", label: search.country },
    search.city && { key: "city", label: search.city },
    search.condition && { key: "condition", label: CONDITIONS.find(c => c.value === search.condition)?.label ?? search.condition },
  ].filter(Boolean) as { key: string; label: string }[];

  const clearKey = (k: string) => {
    if (k === "q") { setQInput(""); update({ q: undefined }); }
    else update({ [k]: undefined } as any);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Browse <span className="gradient-text">listings</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Searching…" : `${totalCount.toLocaleString()} result${totalCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => update({ sort: v as any })}>
            <SelectTrigger className="w-[180px] bg-white/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {user && (
            <Button variant="outline" className="gap-2 rounded-full bg-white/70" onClick={() => saveSearch.mutate()} disabled={saveSearch.isPending}>
              <Bookmark className="h-4 w-4" /> Save search
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-white/40 bg-white/55 p-3 shadow-[var(--shadow-float)] backdrop-blur-xl lg:grid-cols-[1fr_160px_160px_160px_160px]">
        <Input
          placeholder="Search title, description…"
          value={qInput}
          className="bg-white/70"
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") applyQ(); }}
          onBlur={applyQ}
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
        <Select value={search.condition ?? "all"} onValueChange={(v) => update({ condition: v === "all" ? undefined : v })}>
          <SelectTrigger className="bg-white/70"><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any condition</SelectItem>
            {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/40 bg-white/55 p-3 backdrop-blur-xl">
          <SlidersHorizontal className="ml-1 h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map(f => (
              <Badge key={f.key} variant="secondary" className="gap-1 rounded-full bg-white/70 pl-2.5 pr-1">
                {f.label}
                <button onClick={() => clearKey(f.key)} className="ml-0.5 grid h-5 w-5 place-items-center rounded-full hover:bg-black/10" aria-label={`Remove ${f.label}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto rounded-full text-xs" onClick={clearAll}>Clear all</Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !listings.length ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          No matching listings. Try a different search or <Link to="/post" className="text-primary hover:underline">post one</Link>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {listings.map((l: any) => {
              const isFeatured = l.listing_promotions?.some((p: any) => new Date(p.ends_at) > new Date());
              return <ListingCard key={l.id} listing={l} featured={isFeatured} />;
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full bg-white/70" disabled={page <= 1} onClick={() => update({ page: page - 1 }, false)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="px-3 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" className="rounded-full bg-white/70" disabled={page >= totalPages} onClick={() => update({ page: page + 1 }, false)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
