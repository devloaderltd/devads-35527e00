import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowUp, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getWallet, promoteWithWallet, getPromotionPricing } from "@/lib/wallet.functions";

const DEFAULT_FEATURED = 9.99;
const DEFAULT_BUMP = 2.99;
const DEFAULT_FEATURED_DAYS = 7;
const DEFAULT_BUMP_DAYS = 1;

export function PromoteDialog({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const fetchWallet = useServerFn(getWallet);
  const fetchPricing = useServerFn(getPromotionPricing);
  const promote = useServerFn(promoteWithWallet);
  const qc = useQueryClient();

  const walletQ = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(),
    enabled: open,
  });

  const pricingQ = useQuery({
    queryKey: ["promotion-pricing"],
    queryFn: () => fetchPricing(),
    staleTime: 60_000,
    retry: 1,
  });

  const pricing = pricingQ.data;
  const pricingFailed = pricingQ.isError;
  const pricingLoading = pricingQ.isLoading;

  const FEATURED = pricing?.featuredPrice ?? DEFAULT_FEATURED;
  const BUMP = pricing?.bumpPrice ?? DEFAULT_BUMP;
  const FEATURED_DAYS = pricing?.featuredDays ?? DEFAULT_FEATURED_DAYS;
  const BUMP_DAYS = pricing?.bumpDays ?? DEFAULT_BUMP_DAYS;

  const balance = walletQ.data?.balance ?? 0;
  const [busy, setBusy] = useState<null | "featured" | "bump">(null);

  const pay = async (type: "featured" | "bump") => {
    const cost = type === "featured" ? FEATURED : BUMP;
    if (balance < cost) {
      toast.error(`Insufficient balance. You need $${cost.toFixed(2)}.`);
      return;
    }
    setBusy(type);
    try {
      await promote({ data: { listingId, type } });
      toast.success(type === "featured" ? `Listing featured for ${FEATURED_DAYS} days!` : "Listing bumped to the top!");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Promotion failed");
    } finally {
      setBusy(null);
    }
  };

  const buttonsDisabled = busy !== null || pricingLoading || walletQ.isLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 rounded-full bg-white/70 backdrop-blur hover:bg-white">
          <Sparkles className="h-4 w-4 text-primary" /> Promote this listing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl border-white/50 bg-white/80 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Promote your <span className="gradient-text">listing</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Wallet balance</span>
          </div>
          <div className="font-display text-lg font-bold gradient-text">
            {walletQ.isLoading ? "…" : `$${balance.toFixed(2)}`}
          </div>
        </div>

        {pricingFailed && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-amber-50/80 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Couldn't load latest pricing</p>
              <p className="text-xs opacity-80">Showing default rates. Prices may differ at checkout.</p>
            </div>
            <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-amber-900 hover:bg-amber-100" onClick={() => pricingQ.refetch()}>
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}

        {pricingLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <PlanSkeleton />
            <PlanSkeleton />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <PlanCard
              icon={<Sparkles className="h-4 w-4" />}
              title="Featured"
              price={FEATURED}
              gradientClass="btn-gradient"
              description={`Pin to the top of search & homepage for ${FEATURED_DAYS} days with the iridescent Premium badge.`}
              disabled={buttonsDisabled}
              loading={busy === "featured"}
              insufficient={balance < FEATURED}
              onClick={() => pay("featured")}
            />
            <PlanCard
              icon={<ArrowUp className="h-4 w-4" />}
              title="Bump"
              price={BUMP}
              gradientStyle={{ background: "var(--gradient-warm)" }}
              description={`Bump back to the top of recent results for ${BUMP_DAYS} day${BUMP_DAYS === 1 ? "" : "s"} with a warm "Just bumped" chip.`}
              disabled={buttonsDisabled}
              loading={busy === "bump"}
              insufficient={balance < BUMP}
              onClick={() => pay("bump")}
            />
          </div>
        )}

        {!pricingLoading && balance < BUMP && (
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4 text-center text-sm">
            <p className="mb-2 text-muted-foreground">Not enough credits? Top up with crypto.</p>
            <Button asChild className="btn-gradient rounded-full border-0">
              <Link to="/wallet" onClick={() => setOpen(false)}>Top up wallet</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanSkeleton() {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/40 p-5">
      <div className="h-7 w-24 animate-pulse rounded bg-white/60" />
      <div className="mt-3 h-9 w-20 animate-pulse rounded bg-white/60" />
      <div className="mt-3 h-12 w-full animate-pulse rounded bg-white/60" />
      <div className="mt-3 h-10 w-full animate-pulse rounded-full bg-white/60" />
    </div>
  );
}

function PlanCard({
  icon, title, price, description, onClick, disabled, loading, insufficient, gradientClass, gradientStyle,
}: {
  icon: React.ReactNode;
  title: string;
  price: number;
  description: string;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  insufficient: boolean;
  gradientClass?: string;
  gradientStyle?: React.CSSProperties;
}) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/70 p-5 shadow-[var(--shadow-float)]">
      <div className="flex items-center gap-2 font-semibold">
        <span className={`grid h-7 w-7 place-items-center rounded-lg text-white ${gradientClass ?? ""}`} style={gradientStyle}>
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-2 text-3xl font-extrabold gradient-text">${price.toFixed(2)}</div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button
        onClick={onClick}
        disabled={disabled || insufficient}
        className="mt-3 w-full rounded-full btn-gradient border-0"
      >
        {loading ? "Processing…" : insufficient ? "Insufficient balance" : "Pay with wallet"}
      </Button>
    </div>
  );
}
