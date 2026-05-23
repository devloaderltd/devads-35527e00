import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Tag, ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { ReportDialog } from "@/components/ReportDialog";
import { PromoteDialog } from "@/components/PromoteDialog";
import { toast } from "sonner";
import { useState } from "react";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

export const Route = createFileRoute("/listings/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacting, setContacting] = useState(false);


  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          categories(name, slug),
          cities(name, region, country),
          listing_images(url, sort_order)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", data.user_id)
        .maybeSingle();
      return { ...data, profile };
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Loading…</div>;
  if (error || !listing) return <div className="container mx-auto px-4 py-10">Listing not found.</div>;

  const startThread = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (listing.user_id === user.id) { toast.error("You can't message yourself."); return; }
    setContacting(true);
    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", listing.user_id)
      .maybeSingle();
    let threadId = existing?.id;
    if (!threadId) {
      const { data: created, error: insErr } = await supabase
        .from("message_threads")
        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.user_id })
        .select("id").single();
      if (insErr) { setContacting(false); toast.error(insErr.message); return; }
      threadId = created.id;
    }
    setContacting(false);
    navigate({ to: "/messages/$threadId", params: { threadId: threadId! } });
  };

  const images = (listing.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const priceFmt = listing.price != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: listing.currency || "USD", maximumFractionDigits: 0 }).format(Number(listing.price))
    : "Contact for price";

  return (
    <div className="container mx-auto px-4 py-6">
      <Link to="/search" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to results
      </Link>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="iridescent-border overflow-hidden rounded-2xl border bg-muted shadow-[var(--shadow-float-lg)]">
            <img
              src={images[0]?.url ?? listingPlaceholder}
              alt={listing.title}
              className="aspect-square w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {images.slice(1).map((img: any) => (
                <img key={img.url} src={img.url} alt="" className="aspect-square rounded-lg object-cover ring-1 ring-white/40" />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>
          <div className="mt-2 inline-block rounded-xl bg-[image:var(--gradient-primary)] px-3 py-1 text-2xl font-extrabold text-white shadow-[var(--shadow-glow-primary)]">
            {priceFmt}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {listing.cities && (
              <span className="chip-glass"><MapPin className="h-3.5 w-3.5" /> {listing.cities.name}, {listing.cities.region}</span>
            )}
            {listing.categories && (
              <Link to="/search" search={{ category: listing.categories.slug } as any} className="chip-glass hover:text-primary">
                <Tag className="h-3.5 w-3.5" /> {listing.categories.name}
              </Link>
            )}
            <span className="chip-glass">
              <Calendar className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
            </span>
          </div>

          {listing.condition && listing.condition !== "not_applicable" && (
            <span className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
              {String(listing.condition).replace("_", " ")}
            </span>
          )}

          <div className="mt-6 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
            {listing.description}
          </div>

          <div className="iridescent-border mt-8 rounded-2xl border border-white/40 bg-white/60 p-4 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <div className="text-sm text-muted-foreground">Seller</div>
            <div className="mt-1 font-medium">{listing.profile?.display_name ?? "Seller"}</div>
            <Button className="btn-gradient mt-3 w-full gap-2" onClick={startThread} disabled={contacting || listing.user_id === user?.id}>
              <MessageSquare className="h-4 w-4" /> Message seller
            </Button>
            {user?.id === listing.user_id && (
              <div className="mt-2">
                <PromoteDialog listingId={listing.id} />
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <ReportDialog listingId={listing.id} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
