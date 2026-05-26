import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompare } from "@/lib/compare-context";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, Scale } from "lucide-react";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare listings — CallEscort24" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { ids, remove, clear } = useCompare();

  const { data, isLoading } = useQuery({
    queryKey: ["compare", ids],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data } = await supabase
        .from("listings")
        .select(`id, slug, title, price, condition, is_negotiable, view_count, created_at, item_age,
          cities(name, region, country),
          categories(name),
          listing_images(url, sort_order)`)
        .in("id", ids)
        .eq("status", "active");
      return data ?? [];
    },
    enabled: ids.length > 0,
  });

  if (ids.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Scale className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Nothing to compare yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick up to 4 listings using the compare checkbox on any listing card.
        </p>
        <Button asChild className="btn-gradient mt-5 rounded-full border-0">
          <Link to="/search"><ArrowLeft className="mr-1 h-4 w-4" /> Browse listings</Link>
        </Button>
      </div>
    );
  }

  const sorted = ids.map((id) => data?.find((d: any) => d.id === id)).filter(Boolean) as any[];

  const rows: { label: string; render: (l: any) => React.ReactNode }[] = [
    {
      label: "Photo",
      render: (l) => {
        const img = l.listing_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url;
        return (
          <Link to="/listings/$id" params={{ id: l.slug ?? l.id }}>
            <img
              src={img ?? listingPlaceholder}
              alt={l.title}
              className="h-32 w-full rounded-xl object-cover transition hover:opacity-90"
            />
          </Link>
        );
      },
    },
    {
      label: "Title",
      render: (l) => (
        <Link to="/listings/$id" params={{ id: l.slug ?? l.id }} className="line-clamp-2 font-medium text-foreground hover:text-primary">
          {l.title}
        </Link>
      ),
    },
    {
      label: "Price",
      render: (l) =>
        l.price ? (
          <span className="font-display text-lg font-bold gradient-text">
            ${Number(l.price).toFixed(0)}
            {l.is_negotiable && <span className="ml-1 text-xs font-normal text-muted-foreground">OBO</span>}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { label: "Condition", render: (l) => <span className="capitalize">{l.condition?.replace(/_/g, " ") ?? "—"}</span> },
    { label: "Item age", render: (l) => l.item_age || <span className="text-muted-foreground">—</span> },
    { label: "Category", render: (l) => l.categories?.name ?? "—" },
    { label: "Location", render: (l) => (l.cities ? `${l.cities.name}, ${l.cities.region}` : "—") },
    { label: "Views", render: (l) => l.view_count ?? 0 },
    {
      label: "Posted",
      render: (l) => new Date(l.created_at).toLocaleDateString(),
    },
    {
      label: "",
      render: (l) => (
        <Button asChild size="sm" className="btn-gradient w-full rounded-full border-0">
          <Link to="/listings/$id" params={{ id: l.slug ?? l.id }}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Compare <span className="gradient-text">{sorted.length}</span> listings
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Side by side · scroll horizontally on mobile</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full bg-white/60" onClick={clear}>
          Clear all
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/40 bg-white/65 backdrop-blur-xl shadow-[var(--shadow-float)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-32 bg-white/80 p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur" />
                {sorted.map((l) => (
                  <th key={l.id} className="min-w-[200px] p-3 text-left">
                    <button
                      onClick={() => remove(l.id)}
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-white/40 align-top">
                  <td className="sticky left-0 z-10 bg-white/80 p-3 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {r.label}
                  </td>
                  {sorted.map((l) => (
                    <td key={l.id} className="min-w-[200px] p-3">
                      {r.render(l)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
