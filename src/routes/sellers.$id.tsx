import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard } from "@/components/ListingCard";
import { MapPin, Calendar, Package, MessageSquare, Share2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { SellerReviews } from "@/components/SellerReviews";
import { SellerRatingBadge } from "@/components/SellerRatingBadge";
import { SellerFollowButton } from "@/components/SellerFollowButton";
import { ShareSheet } from "@/components/ShareSheet";
import { RatingDistribution } from "@/components/seller/RatingDistribution";
import { BrandLoader } from "@/components/BrandLoader";

const SITE_URL = "https://callescort24.org";

type SellerHead = {
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: { name: string; region: string; country: string } | null;
};

async function fetchSellerHead(id: string): Promise<SellerHead | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, city_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  let city = null;
  if (data.city_id) {
    const { data: c } = await supabase
      .from("cities").select("name, region, country").eq("id", data.city_id).maybeSingle();
    city = c;
  }
  return {
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    bio: data.bio,
    city,
  };
}

export const Route = createFileRoute("/sellers/$id")({
  loader: async ({ params }) => ({ head: await fetchSellerHead(params.id) }),
  head: ({ loaderData, params }) => {
    const p = loaderData?.head;
    if (!p) {
      return { meta: [{ title: "Seller profile — CallEscort24" }] };
    }
    const url = `${SITE_URL}/sellers/${params.id}`;
    const cityPart = p.city ? ` in ${p.city.name}` : "";
    const title = `${p.display_name}${cityPart} — CallEscort24`;
    const desc = p.bio ? p.bio.slice(0, 155) : `Browse ${p.display_name}'s active listings on CallEscort24.`;
    const personLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: p.display_name,
      ...(p.avatar_url ? { image: p.avatar_url } : {}),
      ...(p.bio ? { description: p.bio } : {}),
      ...(p.city ? {
        address: {
          "@type": "PostalAddress",
          addressLocality: p.city.name,
          addressRegion: p.city.region,
          addressCountry: p.city.country,
        },
      } : {}),
      url,
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(personLd) },
      ],
    };
  },
  component: SellerPage,
});

function SellerPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [contacting, setContacting] = useState(false);



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
        .select(`id, slug, title, bumped_at, verified_at, category_id, user_id,
          cities(name, region, country),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at),
          categories(id, slug, name)`)
        .eq("user_id", id)
        .eq("status", "active")
        .order("bumped_at", { ascending: false })
        .limit(48);
      return data ?? [];
    },
  });

  const categoryChips = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    (listings ?? []).forEach((l: any) => {
      const c = l.categories;
      if (!c) return;
      const cur = map.get(c.id) ?? { slug: c.slug, name: c.name, count: 0 };
      cur.count += 1;
      map.set(c.id, cur);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [listings]);

  const contactSeller = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.id === id) { toast.error("That's you."); return; }
    const latest = listings?.[0];
    if (!latest) { toast.error("This seller has no active listings to message about."); return; }
    setContacting(true);
    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .eq("listing_id", latest.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", id)
      .maybeSingle();
    let threadId = existing?.id;
    if (!threadId) {
      const { data: created, error } = await supabase
        .from("message_threads")
        .insert({ listing_id: latest.id, buyer_id: user.id, seller_id: id })
        .select("id").single();
      if (error) { setContacting(false); toast.error(error.message); return; }
      threadId = created.id;
    }
    setContacting(false);
    navigate({ to: "/messages/$threadId", params: { threadId: threadId! } });
  };


  if (isLoading) {
    return <div className="container mx-auto px-4 py-10"><BrandLoader variant="block" /></div>;
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
            <div className="mt-4 flex flex-wrap gap-2">
              {user?.id !== id && (
                <Button
                  size="sm"
                  className="btn-gradient rounded-full border-0"
                  disabled={contacting}
                  onClick={contactSeller}
                >
                  <MessageSquare className="mr-1 h-4 w-4" /> {contacting ? "Opening…" : "Contact seller"}
                </Button>
              )}
              <SellerFollowButton sellerId={id} />
              <Button
                size="sm"
                variant="outline"
                className="rounded-full bg-white/70"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="mr-1 h-4 w-4" /> Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
        <RatingDistribution sellerId={id} />
        {categoryChips.length > 0 && (
          <div className="rounded-2xl glass p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" /> Sells in
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categoryChips.map((c) => (
                <Link
                  key={c.slug}
                  to="/search"
                  search={{ category: c.slug }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/60 px-3 py-1 text-xs backdrop-blur transition hover:bg-white"
                >
                  {c.name}
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{c.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
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

      <div id="reviews" className="scroll-mt-24">
        <SellerReviews sellerId={id} />
      </div>

      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={typeof window !== "undefined" ? window.location.href : ""}
        title={`${profile.display_name} on CallEscort24`}
      />
    </div>
  );
}
