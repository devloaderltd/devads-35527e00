import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { MapPin, Calendar, Package, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SellerReviews } from "@/components/SellerReviews";
import { SellerRatingBadge } from "@/components/SellerRatingBadge";


export const Route = createFileRoute("/sellers/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Seller profile — CallEscort24" },
      { name: "description", content: "View this seller's active listings, location and member history on CallEscort24." },
      { property: "og:title", content: "Seller profile — CallEscort24" },
      { property: "og:description", content: "Browse a seller's active listings on CallEscort24." },
      { property: "og:url", content: `https://callescort24.org/sellers/${params.id}` },
      { property: "og:type", content: "profile" },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: `https://callescort24.org/sellers/${params.id}` }],
  }),
  component: SellerPage,
});

function SellerPage() {
  const { id } = Route.useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["seller", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, country, city_id, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      let city = null;
      if (data.city_id) {
        const { data: c } = await supabase
          .from("cities").select("name, region, country").eq("id", data.city_id).maybeSingle();
        city = c;
      }
      return { ...data, city };
    },
  });

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select(`id, title, bumped_at,
          cities(name, region, country),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)`)
        .eq("user_id", id)
        .eq("status", "active")
        .order("bumped_at", { ascending: false })
        .limit(48);
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;
  }
  if (!profile) {
    return <div className="container mx-auto px-4 py-10">Seller not found.</div>;
  }

  const initials = (profile.display_name || "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="iridescent-border rounded-3xl border border-white/40 bg-white/65 p-6 shadow-[var(--shadow-float-lg)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/70 shadow-md"
            />
          ) : (
            <div
              className="grid h-20 w-20 place-items-center rounded-2xl text-2xl font-bold text-white shadow-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold md:text-3xl">{profile.display_name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {profile.city && (
                <span className="chip-glass">
                  <MapPin className="h-3.5 w-3.5" /> {profile.city.name}, {profile.city.region}
                </span>
              )}
              <span className="chip-glass">
                <Calendar className="h-3.5 w-3.5" />
                Member {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </span>
              <span className="chip-glass">
                <Package className="h-3.5 w-3.5" /> {listings?.length ?? 0} active listing{(listings?.length ?? 0) === 1 ? "" : "s"}
              </span>
              <span className="chip-glass">
                <SellerRatingBadge sellerId={id} />
              </span>

            </div>
            {profile.bio && (
              <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-display text-xl font-bold">
        Active <span className="gradient-text">listings</span>
      </h2>
      {!listings?.length ? (
        <div className="mt-4 rounded-2xl glass p-10 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-6 w-6 opacity-60" />
          This seller has no active listings.
          <div className="mt-2">
            <Link to="/search" className="font-medium text-primary hover:underline">Browse the marketplace</Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l: any) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <SellerReviews sellerId={id} />
    </div>
  );
}
