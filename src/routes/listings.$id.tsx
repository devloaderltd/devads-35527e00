import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin, Calendar, Tag, ChevronLeft, ChevronRight, MessageSquare,
  Share2, Eye, Package, Phone, Mail, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { ReportDialog } from "@/components/ReportDialog";
import { PromoteDialog } from "@/components/PromoteDialog";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ListingCard } from "@/components/ListingCard";
import { getSellerContact } from "@/lib/seller-contact.functions";
import { toast } from "sonner";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

export const Route = createFileRoute("/listings/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacting, setContacting] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          categories(name, slug),
          cities(name, region, country, slug),
          listing_images(url, sort_order)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .eq("id", data.user_id)
        .maybeSingle();
      return { ...data, profile };
    },
  });

  // Fire-and-forget view increment
  useEffect(() => {
    if (!listing?.id) return;
    supabase.rpc("increment_listing_view", { _listing_id: listing.id });
  }, [listing?.id]);

  // Keyboard nav for gallery + lightbox
  useEffect(() => {
    if (!listing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setActiveIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setActiveIdx((i) => i + 1);
      else if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listing]);


  // Similar listings (same category, prefer same city)
  const { data: similar } = useQuery({
    queryKey: ["similar-listings", listing?.id, listing?.category_id, listing?.city_id],
    enabled: !!listing?.category_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select(`id, title, price, currency, bumped_at, city_id,
          cities(name, region, country),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)`)
        .eq("category_id", listing!.category_id)
        .eq("status", "active")
        .neq("id", listing!.id)
        .order("bumped_at", { ascending: false })
        .limit(12);
      const rows = data ?? [];
      const cityId = listing!.city_id;
      const sameCity = rows.filter((l: any) => l.city_id === cityId);
      const otherCity = rows.filter((l: any) => l.city_id !== cityId);
      return [...sameCity, ...otherCity].slice(0, 4);
    },
  });

  // Seller contact (only visible to signed-in users)
  const fetchContact = useServerFn(getSellerContact);
  const { data: contact } = useQuery({
    queryKey: ["seller-contact", id],
    enabled: !!user && !!listing?.id,
    queryFn: () => fetchContact({ data: { listingId: id } }),
    staleTime: 60_000,
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

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title: listing.title, text: listing.title, url };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(data);
        return;
      }
    } catch { /* user cancelled */ }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't share this listing");
    }
  };

  const images = (listing.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const hero = images[activeIdx]?.url ?? listingPlaceholder;
  const priceFmt = listing.price != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: listing.currency || "USD", maximumFractionDigits: 0 }).format(Number(listing.price))
    : "Contact for price";

  const prev = () => setActiveIdx((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));
  const next = () => setActiveIdx((i) => (i + 1) % Math.max(images.length, 1));

  const seller = listing.profile;
  const sellerInitials = (seller?.display_name || "?")
    .split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>›</span>
        {listing.categories && (
          <>
            <Link to="/search" search={{ category: listing.categories.slug } as any} className="hover:text-foreground">
              {listing.categories.name}
            </Link>
            <span>›</span>
          </>
        )}
        {listing.cities && (
          <>
            <Link to="/search" search={{ city: listing.cities.slug, country: listing.cities.country } as any} className="hover:text-foreground">
              {listing.cities.name}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="truncate text-foreground">{listing.title}</span>
      </nav>

      <Link to="/search" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to results
      </Link>


      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="iridescent-border relative overflow-hidden rounded-2xl border bg-muted shadow-[var(--shadow-float-lg)]">
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="block w-full"
              aria-label="Open image"
            >
              <img
                src={hero}
                alt={listing.title}
                className="aspect-square w-full object-cover"
              />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 backdrop-blur shadow hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={next}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 backdrop-blur shadow hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white">
                  {activeIdx + 1} / {images.length}
                </div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {images.map((img: any, i: number) => (
                <button
                  key={img.url}
                  onClick={() => setActiveIdx(i)}
                  className={`overflow-hidden rounded-lg ring-1 transition ${i === activeIdx ? "ring-2 ring-primary" : "ring-white/40 hover:ring-white"}`}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                </button>
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
            <span className="chip-glass">
              <Eye className="h-3.5 w-3.5" /> {listing.view_count ?? 0} views
            </span>
          </div>

          {listing.condition && listing.condition !== "not_applicable" && (
            <span className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
              {String(listing.condition).replace("_", " ")}
            </span>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <FavoriteButton listingId={listing.id} variant="inline" showLabel />
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-sm font-medium backdrop-blur hover:bg-white"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
            {listing.description}
          </div>

          {/* Seller card */}
          <div className="iridescent-border mt-8 rounded-2xl border border-white/40 bg-white/65 p-4 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              {seller?.avatar_url ? (
                <img src={seller.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/60" />
              ) : (
                <div
                  className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {sellerInitials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to="/sellers/$id"
                  params={{ id: listing.user_id }}
                  className="block truncate font-medium hover:text-primary"
                >
                  {seller?.display_name ?? "Seller"}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {seller?.created_at
                    ? `Member ${formatDistanceToNow(new Date(seller.created_at), { addSuffix: true })}`
                    : "Marketly seller"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-full bg-white/70"
                asChild
              >
                <Link to="/sellers/$id" params={{ id: listing.user_id }}>
                  <Package className="mr-2 h-4 w-4" /> View profile
                </Link>
              </Button>
              <Button
                className="btn-gradient gap-2 rounded-full border-0"
                onClick={startThread}
                disabled={contacting || listing.user_id === user?.id}
              >
                <MessageSquare className="h-4 w-4" /> Message
              </Button>
            </div>

            {/* Contact */}
            <div className="mt-4 border-t border-white/40 pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact seller
              </div>
              {!user ? (
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-muted-foreground hover:bg-white"
                >
                  <Lock className="h-4 w-4" />
                  Sign in to see phone & email
                </Link>
              ) : (
                <div className="space-y-1.5">
                  {contact?.phone ? (
                    <a
                      href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium hover:bg-white"
                    >
                      <Phone className="h-4 w-4 text-primary" />
                      {contact.phone}
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-white/40 px-3 py-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Phone not provided
                    </div>
                  )}
                  {contact?.email ? (
                    <a
                      href={`mailto:${contact.email}?subject=${encodeURIComponent("Re: " + listing.title)}`}
                      className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium hover:bg-white"
                    >
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-white/40 px-3 py-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {contact ? "Email not available" : "Loading…"}
                    </div>
                  )}
                </div>
              )}
            </div>



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

      {similar && similar.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">
            Similar <span className="gradient-text">listings</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {similar.map((l: any) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={hero}
            alt={listing.title}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* JSON-LD Product schema for richer search results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: listing.description?.slice(0, 5000) ?? "",
            image: images.map((i: any) => i.url).slice(0, 6),
            category: listing.categories?.name,
            offers: listing.price != null ? {
              "@type": "Offer",
              price: Number(listing.price),
              priceCurrency: listing.currency || "USD",
              availability: listing.status === "active"
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
              url: typeof window !== "undefined" ? window.location.href : undefined,
            } : undefined,
            seller: seller ? { "@type": "Person", name: seller.display_name } : undefined,
            areaServed: listing.cities ? `${listing.cities.name}, ${listing.cities.region}` : undefined,
          }),
        }}
      />
    </div>
  );
}
