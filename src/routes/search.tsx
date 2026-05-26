import { createFileRoute, Link, useNavigate as useNav } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bookmark, BookmarkCheck, X, SlidersHorizontal, ChevronLeft, ChevronRight, LayoutGrid, List, BadgeCheck, ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createSavedSearch, listSavedSearches } from "@/lib/extras.functions";
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
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
  { value: "views", label: "Most viewed" },
  { value: "ending", label: "Ending soon" },
] as const;

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  condition: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minAge: z.coerce.number().min(0).max(120).optional(),
  maxAge: z.coerce.number().min(0).max(120).optional(),
  verified: z.coerce.boolean().optional(),
  hasPhotos: z.coerce.boolean().optional(),
  promoted: z.coerce.boolean().optional(),
  sort: z.enum(["recent", "oldest", "price_asc", "price_desc", "views", "ending"]).optional(),
  view: z.enum(["grid", "list"]).optional(),
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
  const nav = useNav();
  const { user } = useAuth();
  const qc = useQueryClient();
  const saveFn = useServerFn(createSavedSearch);
  const listFn = useServerFn(listSavedSearches);
  const page = search.page ?? 1;
  const sort = search.sort ?? "recent";
  const view = search.view ?? "grid";

  const [qInput, setQInput] = useState(search.q ?? "");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotify, setSaveNotify] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Draft state for the filters sheet (apply on save)
  const [draftMinPrice, setDraftMinPrice] = useState<string>(search.minPrice?.toString() ?? "");
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>(search.maxPrice?.toString() ?? "");
  const [draftMinAge, setDraftMinAge] = useState<string>(search.minAge?.toString() ?? "");
  const [draftMaxAge, setDraftMaxAge] = useState<string>(search.maxAge?.toString() ?? "");
  const [draftCondition, setDraftCondition] = useState<string>(search.condition ?? "");
  const [draftVerified, setDraftVerified] = useState<boolean>(!!search.verified);
  const [draftHasPhotos, setDraftHasPhotos] = useState<boolean>(!!search.hasPhotos);
  const [draftPromoted, setDraftPromoted] = useState<boolean>(!!search.promoted);

  const openFilters = (open: boolean) => {
    if (open) {
      setDraftMinPrice(search.minPrice?.toString() ?? "");
      setDraftMaxPrice(search.maxPrice?.toString() ?? "");
      setDraftMinAge(search.minAge?.toString() ?? "");
      setDraftMaxAge(search.maxAge?.toString() ?? "");
      setDraftCondition(search.condition ?? "");
      setDraftVerified(!!search.verified);
      setDraftHasPhotos(!!search.hasPhotos);
      setDraftPromoted(!!search.promoted);
    }
    setFiltersOpen(open);
  };

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

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey: ["listings", "search", search],
    queryFn: async () => {
      const from = 0;
      const to = page * PAGE_SIZE - 1;
      let q = supabase
        .from("listings")
        .select(`
          id, slug, title, description, created_at, bumped_at, condition, view_count, price, verified_at,
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
      if (typeof search.minPrice === "number") q = q.gte("price", search.minPrice);
      if (typeof search.maxPrice === "number") q = q.lte("price", search.maxPrice);
      if (search.verified) q = q.not("verified_at", "is", null);

      switch (sort) {
        case "oldest": q = q.order("created_at", { ascending: true }); break;
        case "price_asc": q = q.order("price", { ascending: true, nullsFirst: false }); break;
        case "price_desc": q = q.order("price", { ascending: false, nullsFirst: false }); break;
        case "views": q = q.order("view_count", { ascending: false }); break;
        case "ending": q = q.order("expires_at", { ascending: true }); break;
        default: q = q.order("bumped_at", { ascending: false });
      }

      const { data, error, count } = await q.range(from, to);
      if (error) throw error;

      // Client-side post-filters for fields that don't translate cleanly to SQL filters
      let rows = (data ?? []) as any[];
      if (search.hasPhotos) {
        rows = rows.filter((l) => Array.isArray(l.listing_images) && l.listing_images.length > 0);
      }
      if (search.promoted) {
        const now = Date.now();
        rows = rows.filter((l) => l.listing_promotions?.some((p: any) => new Date(p.ends_at).getTime() > now));
      }
      if (typeof search.minAge === "number" || typeof search.maxAge === "number") {
        rows = rows.filter((l) => {
          const n = Number(String(l.item_age ?? "").match(/\d+/)?.[0] ?? NaN);
          if (Number.isNaN(n)) return false;
          if (typeof search.minAge === "number" && n < search.minAge) return false;
          if (typeof search.maxAge === "number" && n > search.maxAge) return false;
          return true;
        });
      }
      return { listings: rows, count: count ?? 0 };
    },
  });

  const update = (patch: Partial<typeof search>, resetPage = true) =>
    navigate({ search: { ...search, ...patch, ...(resetPage ? { page: undefined } : {}) } as any });

  const applyQ = () => update({ q: qInput.trim() || undefined });

  const clearAll = () => {
    setQInput("");
    navigate({ search: {} as any });
  };

  const applyDraftFilters = () => {
    const numOrUndef = (s: string) => {
      const n = Number(s);
      return s.trim() && !Number.isNaN(n) ? n : undefined;
    };
    update({
      minPrice: numOrUndef(draftMinPrice),
      maxPrice: numOrUndef(draftMaxPrice),
      minAge: numOrUndef(draftMinAge),
      maxAge: numOrUndef(draftMaxAge),
      condition: draftCondition || undefined,
      verified: draftVerified || undefined,
      hasPhotos: draftHasPhotos || undefined,
      promoted: draftPromoted || undefined,
    });
    setFiltersOpen(false);
  };

  const resetDraft = () => {
    setDraftMinPrice(""); setDraftMaxPrice("");
    setDraftMinAge(""); setDraftMaxAge("");
    setDraftCondition(""); setDraftVerified(false);
    setDraftHasPhotos(false); setDraftPromoted(false);
  };

  const currentFilters = useMemo(
    () => Object.fromEntries(Object.entries(search).filter(([k, v]) => k !== "page" && k !== "view" && v != null && v !== "")) as Record<string, unknown>,
    [search],
  );

  const savedSearches = useQuery({
    queryKey: ["saved-searches"],
    enabled: !!user,
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const filtersKey = (f: Record<string, unknown>) =>
    Object.keys(f).sort().map(k => `${k}=${String(f[k])}`).join("&");
  const currentKey = filtersKey(currentFilters);
  const alreadySaved = (savedSearches.data?.items ?? []).find(
    (s: any) => filtersKey((s.filters ?? {}) as Record<string, unknown>) === currentKey,
  );

  const openSaveDialog = () => {
    if (alreadySaved) { nav({ to: "/saved-searches" }); return; }
    const defaultName = search.q
      ? `"${search.q}"${search.city ? ` in ${search.city}` : ""}`
      : search.city ? `All in ${search.city}` : search.category ? `All ${search.category}` : "My search";
    setSaveName(defaultName);
    setSaveNotify(true);
    setSaveOpen(true);
  };

  const saveSearch = useMutation({
    mutationFn: () => saveFn({
      data: { name: saveName.trim() || "My search", filters: currentFilters, notify: saveNotify },
    }),
    onSuccess: () => {
      setSaveOpen(false);
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search saved", {
        action: { label: "View", onClick: () => nav({ to: "/saved-searches" }) },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const listings = result?.listings ?? [];
  const totalCount = result?.count ?? 0;
  const hasMore = listings.length < totalCount;
  const activeFilterCount = Object.keys(currentFilters).length;

  const activeFilters = [
    search.q && { key: "q", label: `"${search.q}"` },
    search.category && { key: "category", label: search.category },
    search.country && { key: "country", label: search.country },
    search.city && { key: "city", label: search.city },
    search.condition && { key: "condition", label: CONDITIONS.find(c => c.value === search.condition)?.label ?? search.condition },
    (typeof search.minPrice === "number" || typeof search.maxPrice === "number") && {
      key: "_price",
      label: `${search.minPrice ?? 0}–${search.maxPrice ?? "∞"} $`,
    },
    (typeof search.minAge === "number" || typeof search.maxAge === "number") && {
      key: "_age",
      label: `Age ${search.minAge ?? 0}–${search.maxAge ?? "∞"}`,
    },
    search.verified && { key: "verified", label: "Verified" },
    search.hasPhotos && { key: "hasPhotos", label: "With photos" },
    search.promoted && { key: "promoted", label: "Promoted" },
  ].filter(Boolean) as { key: string; label: string }[];

  const clearKey = (k: string) => {
    if (k === "q") { setQInput(""); update({ q: undefined }); return; }
    if (k === "_price") { update({ minPrice: undefined, maxPrice: undefined }); return; }
    if (k === "_age") { update({ minAge: undefined, maxAge: undefined }); return; }
    update({ [k]: undefined } as any);
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
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
          <div className="flex rounded-full border bg-white/70 p-0.5">
            <button
              type="button"
              onClick={() => update({ view: "grid" }, false)}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`grid h-8 w-8 place-items-center rounded-full ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => update({ view: "list" }, false)}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`grid h-8 w-8 place-items-center rounded-full ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Select value={sort} onValueChange={(v) => update({ sort: v as any })}>
            <SelectTrigger className="w-[170px] bg-white/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {user && (
            alreadySaved ? (
              <Button asChild variant="outline" className="gap-2 rounded-full bg-white/70">
                <Link to="/saved-searches"><BookmarkCheck className="h-4 w-4 text-primary" /> Saved</Link>
              </Button>
            ) : (
              <Button variant="outline" className="gap-2 rounded-full bg-white/70" onClick={openSaveDialog}>
                <Bookmark className="h-4 w-4" /> Save search
              </Button>
            )
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-white/40 bg-white/55 p-3 shadow-[var(--shadow-float)] backdrop-blur-xl lg:grid-cols-[1fr_160px_160px_160px_auto]">
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

        <Sheet open={filtersOpen} onOpenChange={openFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative gap-2 rounded-full bg-white/70">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display">More filters</SheetTitle>
              <SheetDescription>Refine your results.</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price range (USD)</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input inputMode="numeric" type="number" min={0} placeholder="Min" value={draftMinPrice} onChange={(e) => setDraftMinPrice(e.target.value)} />
                  <span className="text-muted-foreground">—</span>
                  <Input inputMode="numeric" type="number" min={0} placeholder="Max" value={draftMaxPrice} onChange={(e) => setDraftMaxPrice(e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age range</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input inputMode="numeric" type="number" min={0} max={120} placeholder="Min" value={draftMinAge} onChange={(e) => setDraftMinAge(e.target.value)} />
                  <span className="text-muted-foreground">—</span>
                  <Input inputMode="numeric" type="number" min={0} max={120} placeholder="Max" value={draftMaxAge} onChange={(e) => setDraftMaxAge(e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</Label>
                <Select value={draftCondition || "any"} onValueChange={(v) => setDraftCondition(v === "any" ? "" : v)}>
                  <SelectTrigger className="mt-2 bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any condition</SelectItem>
                    {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-xl border bg-white/60 p-3">
                <ToggleRow
                  icon={<BadgeCheck className="h-4 w-4 text-emerald-500" />}
                  label="Verified sellers only"
                  description="Identity-verified accounts."
                  checked={draftVerified}
                  onChange={setDraftVerified}
                />
                <ToggleRow
                  icon={<ImageIcon className="h-4 w-4 text-primary" />}
                  label="With photos only"
                  description="Hide listings that have no photos."
                  checked={draftHasPhotos}
                  onChange={setDraftHasPhotos}
                />
                <ToggleRow
                  icon={<Sparkles className="h-4 w-4 text-primary" />}
                  label="Promoted only"
                  description="Show only featured / boosted listings."
                  checked={draftPromoted}
                  onChange={setDraftPromoted}
                />
              </div>
            </div>

            <SheetFooter className="mt-6 flex-row gap-2">
              <Button variant="ghost" onClick={resetDraft} className="rounded-full">Reset</Button>
              <Button onClick={applyDraftFilters} className="btn-gradient ml-auto rounded-full border-0">Apply filters</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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
        <div className={view === "list" ? "space-y-3" : "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={view === "list" ? "h-28 animate-pulse rounded-2xl bg-muted" : "aspect-[4/5] animate-pulse rounded-xl bg-muted"} />
          ))}
        </div>
      ) : !listings.length ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/40 bg-white/55 p-10 text-center backdrop-blur-xl">
          <div className="grid h-14 w-14 place-items-center rounded-2xl btn-gradient text-white">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">No matching listings</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Try removing filters{search.city ? <> or clear <button type="button" className="underline" onClick={() => update({ city: undefined })}>the city</button></> : ""}, or save this search to be alerted when something matches.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {activeFilters.length > 0 && (
              <Button variant="outline" className="rounded-full bg-white/70" onClick={clearAll}>Clear all filters</Button>
            )}
            {user && !alreadySaved && (
              <Button onClick={openSaveDialog} className="btn-gradient rounded-full border-0 gap-2">
                <Bookmark className="h-4 w-4" /> Save this search
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full bg-white/70">
              <Link to="/post">Post one yourself</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {view === "list" ? (
            <div className="space-y-3">
              {listings.map((l: any) => {
                const isFeatured = l.listing_promotions?.some((p: any) => new Date(p.ends_at) > new Date());
                return <ListingCard key={l.id} listing={l} featured={isFeatured} variant="list" />;
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {listings.map((l: any) => {
                const isFeatured = l.listing_promotions?.some((p: any) => new Date(p.ends_at) > new Date());
                return <ListingCard key={l.id} listing={l} featured={isFeatured} />;
              })}
            </div>
          )}

          {hasMore && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                className="rounded-full bg-white/70"
                disabled={isFetching}
                onClick={() => update({ page: page + 1 }, false)}
              >
                {isFetching ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}

          {page > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                disabled={page <= 1 || isFetching}
                onClick={() => update({ page: page - 1 }, false)}
              >
                <ChevronLeft className="h-3 w-3" /> Show fewer
              </Button>
              <span>
                Showing {listings.length} of {totalCount.toLocaleString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                disabled={!hasMore || isFetching}
                onClick={() => update({ page: page + 1 }, false)}
              >
                Next <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
            <DialogDescription>Give it a name and choose whether to be alerted of new matches.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="saved-search-name" className="text-xs uppercase tracking-wide text-muted-foreground">Name</Label>
              <Input id="saved-search-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g. iPhones in Birmingham" className="mt-1.5 bg-white/70" autoFocus />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/40 bg-white/55 p-3">
              <div>
                <div className="text-sm font-medium">Notify me of new matches</div>
                <div className="text-xs text-muted-foreground">We'll send a notification when a new listing matches.</div>
              </div>
              <Switch checked={saveNotify} onCheckedChange={setSaveNotify} />
            </div>
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map(f => (
                  <Badge key={f.key} variant="secondary" className="rounded-full bg-white/70">{f.label}</Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={() => saveSearch.mutate()} disabled={saveSearch.isPending || !saveName.trim()} className="btn-gradient border-0">
              {saveSearch.isPending ? "Saving…" : "Save search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleRow({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/70">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
