import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin, Calendar, Tag, ChevronLeft, ChevronRight, MessageSquare,
  Share2, Eye, Package, Phone, Mail, Lock, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { ReportDialog } from "@/components/ReportDialog";
import { PromoteDialog } from "@/components/PromoteDialog";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ListingCard } from "@/components/ListingCard";
import { SellerRatingBadge } from "@/components/SellerRatingBadge";
import { SellerReviews } from "@/components/SellerReviews";
import { ShareSheet } from "@/components/ShareSheet";
import { PriceHistoryChart } from "@/components/listing/PriceHistoryChart";
import { MakeOfferDialog } from "@/components/listing/MakeOfferDialog";
import { BlockSellerButton } from "@/components/listing/BlockSellerButton";
import DOMPurify from "dompurify";

function sanitizeDescription(html: string): string {
  if (typeof window === "undefined") {
    // SSR: strip all HTML tags conservatively; client will rehydrate with full sanitized markup
    return html.replace(/<[^>]*>/g, "");
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "code", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ADD_ATTR: ["target", "rel"],
  });
}

import { getSellerContact } from "@/lib/seller-contact.functions";
import { toast } from "sonner";
import { pushRecentlyViewed } from "@/lib/recently-viewed";
import listingPlaceholder from "@/assets/listing-placeholder.jpg";

export const Route = createFileRoute("/listings/$id")({
  component: ListingDetail,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacting, setContacting] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const isUuid = UUID_RE.test(id);
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          categories(name, slug),
          cities(name, region, country, slug),
          listing_images(url, sort_order)
        `)
        .eq(isUuid ? "id" : "slug", id)
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

  // Redirect UUID URLs to slug URLs
  useEffect(() => {
    if (listing && UUID_RE.test(id) && (listing as any).slug && (listing as any).slug !== id) {
      navigate({ to: "/listings/$id", params: { id: (listing as any).slug }, replace: true });
    }
  }, [listing, id, navigate]);

  // Fire-and-forget view increment + recently viewed tracking
  useEffect(() => {
    if (!listing?.id) return;
    supabase.rpc("increment_listing_view", { _listing_id: listing.id });
    pushRecentlyViewed(listing.id);
  }, [listing?.id]);

  // Keyboard nav for gallery + lightbox
  useEffect(() => {
    if (!listing) return;
    const len = (listing.listing_images?.length ?? 0) || 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setActiveIdx((i) => (i - 1 + len) % len);
      else if (e.key === "ArrowRight") setActiveIdx((i) => (i + 1) % len);
      else if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listing]);


  // Similar listings (same category + same city)
  const { data: similar } = useQuery({
    queryKey: ["similar-listings", listing?.id, listing?.category_id, listing?.city_id],
    enabled: !!listing?.category_id && !!listing?.city_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select(`id, title, bumped_at, city_id,
          cities(name, region, country),
          listing_images(url, sort_order),
          listing_promotions(type, ends_at)`)
        .eq("category_id", listing!.category_id)
        .eq("city_id", listing!.city_id)
        .eq("status", "active")
        .neq("id", listing!.id)
        .order("bumped_at", { ascending: false })
        .limit(4);
      return data ?? [];
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

  if (isLoading) return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-white/50" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-white/50" />
          <div className="h-4 w-1/2 animate-pulse rounded-lg bg-white/50" />
          <div className="h-32 animate-pulse rounded-2xl bg-white/50" />
        </div>
      </div>
    </div>
  );
  if (error || !listing) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Listing not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been removed or the link is incorrect.</p>
      <Button asChild className="mt-4 rounded-full"><Link to="/search">Browse listings</Link></Button>
    </div>
  );

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

  const share = () => setShareOpen(true);

  const images = (listing.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const hero = images[activeIdx]?.url ?? listingPlaceholder;

  const prev = () => setActiveIdx((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));
  const next = () => setActiveIdx((i) => (i + 1) % Math.max(images.length, 1));

  const seller = listing.profile;
  const sellerInitials = (seller?.display_name || "?")
    .split(/\s+/).map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
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

          {/* Description */}
          <div className="iridescent-border mt-6 rounded-2xl border border-white/40 bg-white/65 p-5 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <h2 className="font-display text-lg font-bold">Description</h2>
            {listing.description?.trim() ? (
              <div
                className="rte-content mt-3 text-[0.95rem] leading-relaxed text-foreground/90"
                dangerouslySetInnerHTML={{ __html: sanitizeDescription(listing.description) }}
              />
            ) : (
              <div className="mt-3 text-[0.95rem] leading-relaxed text-foreground/90">
                The seller hasn't added a description for this listing yet. Use the Message button to ask for more details.
              </div>
            )}
          </div>

          {/* Details */}
          <div className="iridescent-border mt-4 rounded-2xl border border-white/40 bg-white/65 p-5 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <h2 className="font-display text-lg font-bold">Details</h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {listing.categories && (
                <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium">{listing.categories.name}</dd>
                </div>
              )}
              {listing.cities && (
                <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="truncate text-right font-medium">
                    {listing.cities.name}, {listing.cities.region}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                <dt className="text-muted-foreground">Age</dt>
                <dd className="truncate text-right font-medium">{listing.item_age || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                <dt className="text-muted-foreground">Posted</dt>
                <dd className="font-medium">
                  {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                <dt className="text-muted-foreground">Total ad views</dt>
                <dd className="font-medium">{listing.view_count ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Phone</dt>
                <dd className="truncate text-right font-medium">
                  {!user ? (
                    <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Lock className="h-3.5 w-3.5" /> Sign in
                    </Link>
                  ) : contact?.phone ? (
                    <a href={`tel:${contact.phone}`} className="text-primary hover:underline">{contact.phone}</a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                <dt className="flex items-center gap-1.5 text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</dt>
                <dd className="truncate text-right font-medium">
                  {!user ? (
                    <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Lock className="h-3.5 w-3.5" /> Sign in
                    </Link>
                  ) : contact?.whatsapp ? (
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {contact.whatsapp}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-white/40 py-1.5">
                <dt className="text-muted-foreground">Listing ID</dt>
                <dd className="font-mono text-xs font-medium text-muted-foreground">
                  #{String(listing.id).slice(0, 8)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Safety tips */}
          <div className="iridescent-border mt-4 rounded-2xl border border-white/40 bg-white/65 p-5 shadow-[var(--shadow-float)] backdrop-blur-xl">
            <h2 className="font-display text-lg font-bold">Stay safe on CallEscort24</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/90">
              <li className="flex gap-2"><span aria-hidden>•</span> Meet in a public, well-lit place whenever possible.</li>
              <li className="flex gap-2"><span aria-hidden>•</span> Inspect the item carefully before you pay.</li>
              <li className="flex gap-2"><span aria-hidden>•</span> Never wire money or share verification codes.</li>
              <li className="flex gap-2"><span aria-hidden>•</span> If something feels off, stop and report the listing.</li>
            </ul>
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>

          {/* Price + offer */}
          {(listing.price != null) && (
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <div className="font-display text-3xl font-bold gradient-text">
                ${Number(listing.price).toFixed(2)}
              </div>
              {listing.is_negotiable && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Negotiable
                </span>
              )}
            </div>
          )}

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


          <div className="mt-4 flex flex-wrap gap-2">
            <FavoriteButton listingId={listing.id} variant="inline" showLabel />
            {listing.is_negotiable && listing.user_id !== user?.id && (
              <MakeOfferDialog
                listingId={listing.id}
                listingTitle={listing.title}
                sellerId={listing.user_id}
                askingPrice={listing.price as number | null}
              />
            )}
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-sm font-medium backdrop-blur hover:bg-white"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          {/* Price history (if any) */}
          <PriceHistoryChart listingId={listing.id} />



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
                    : "CallEscort24 seller"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <SellerRatingBadge sellerId={listing.user_id} />
                  <a href="#reviews" className="text-xs font-medium text-primary hover:underline">
                    See all reviews →
                  </a>
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
                  {(listing as any).phone ? (
                    <a
                      href={`tel:${String((listing as any).phone).replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium hover:bg-white"
                    >
                      <Phone className="h-4 w-4 text-primary" />
                      {(listing as any).phone}
                    </a>
                  ) : contact?.phone ? (
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
                  {(listing as any).whatsapp && (
                    <a
                      href={`https://wa.me/${String((listing as any).whatsapp).replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium hover:bg-white"
                    >
                      <MessageCircle className="h-4 w-4 text-[#25D366]" />
                      WhatsApp: {(listing as any).whatsapp}
                    </a>
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
            <div className="mt-2 flex items-center justify-between">
              <BlockSellerButton sellerId={listing.user_id} />
              <ReportDialog listingId={listing.id} />
            </div>

          </div>
        </div>
      </div>

      <div id="reviews" className="scroll-mt-24">
        <SellerReviews sellerId={listing.user_id} />
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
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={hero}
            alt={listing.title}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
                {activeIdx + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sticky mobile action bar */}
      {listing.user_id !== user?.id && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/40 bg-white/85 p-2 backdrop-blur-xl shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] md:hidden">
          <div className="container mx-auto flex items-center gap-2 px-2">
            <FavoriteButton listingId={listing.id} variant="inline" />
            <button
              type="button"
              onClick={share}
              aria-label="Share"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/60 bg-white/70 hover:bg-white"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {((listing as any).phone || contact?.phone) && (
              <a
                href={`tel:${String((listing as any).phone || contact?.phone).replace(/[^\d+]/g, "")}`}
                aria-label="Call seller"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/60 bg-white/70 hover:bg-white"
              >
                <Phone className="h-4 w-4 text-primary" />
              </a>
            )}
            {(listing as any).whatsapp && (
              <a
                href={`https://wa.me/${String((listing as any).whatsapp).replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp seller"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/60 bg-white/70 hover:bg-white"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
              </a>
            )}
            <Button onClick={startThread} disabled={contacting} className="btn-gradient h-10 flex-1 gap-2 rounded-full border-0">
              <MessageSquare className="h-4 w-4" /> Message seller
            </Button>
          </div>
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
            seller: seller ? { "@type": "Person", name: seller.display_name } : undefined,
            areaServed: listing.cities ? `${listing.cities.name}, ${listing.cities.region}` : undefined,
          }),
        }}
      />
      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={typeof window !== "undefined" ? window.location.href : ""}
        title={listing.title}
      />
    </div>
  );
}
