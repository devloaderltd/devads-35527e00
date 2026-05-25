import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/my-listings")({
  head: () => ({ meta: [{ title: "My listings — Marketly" }] }),
  component: MyListings,
});

function MyListings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`id, title, status, created_at,
          cities(name, region, country),
          listing_images(url, sort_order)`)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["my-listings"] });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">My <span className="gradient-text">listings</span></h1>
        <Button asChild className="btn-gradient rounded-full border-0"><Link to="/post">+ New listing</Link></Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !data?.length ? (
        <div className="rounded-2xl glass p-10 text-center text-muted-foreground">
          You don't have any listings yet. <Link to="/post" className="font-medium text-primary hover:underline">Post your first one</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.map((l: any) => (
            <div key={l.id} className="flex flex-col gap-2">
              <ListingCard listing={l} />
              <Button variant="outline" size="sm" className="rounded-full bg-white/60 backdrop-blur" onClick={() => remove(l.id)}>Delete</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
