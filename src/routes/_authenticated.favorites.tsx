import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard } from "@/components/ListingCard";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favorites — Marketly" }] }),
  component: Favorites,
});

function Favorites() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select(`listings(id, title, price, currency,
          cities(name, region, country),
          listing_images(url, sort_order))`)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.listings).filter(Boolean);
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Favorites</h1>
      {isLoading ? null : !data?.length ? (
        <div className="mt-6 rounded-xl border bg-card p-10 text-center text-muted-foreground">
          No favorites yet. <Link to="/search" className="text-primary hover:underline">Browse listings</Link>.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.map((l: any) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
