import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard } from "@/components/ListingCard";
import { PanelShell } from "@/components/PanelShell";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favorites — CallEscort24" }] }),
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
        .select(`listings(id, title,
          cities(name, region, country),
          listing_images(url, sort_order))`)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: { listings: unknown }) => r.listings).filter(Boolean);
    },
  });

  return (
    <PanelShell
      title="Your"
      highlight="favorites"
      subtitle={data?.length ? `${data.length} saved listing${data.length === 1 ? "" : "s"}` : "Items you've saved for later."}
      size="lg"
    >
      {isLoading ? null : !data?.length ? (
        <div className="rounded-2xl border-0 bg-white/70 p-10 text-center text-muted-foreground backdrop-blur dark:bg-white/5">
          No favorites yet. <Link to="/search" className="font-medium text-primary hover:underline">Browse listings</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.map((l) => <ListingCard key={(l as { id: string }).id} listing={l as never} />)}
        </div>
      )}
    </PanelShell>
  );
}
