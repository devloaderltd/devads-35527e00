import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getWallet, promoteWithWallet, getPromotionPricing } from "@/lib/wallet.functions";

export function PromoteDialog({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const fetchWallet = useServerFn(getWallet);
  const fetchPricing = useServerFn(getPromotionPricing);
  const promote = useServerFn(promoteWithWallet);
  const qc = useQueryClient();

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(),
    enabled: open,
  });

  const { data: pricing } = useQuery({
    queryKey: ["promotion-pricing"],
    queryFn: () => fetchPricing(),
  });

  const FEATURED = pricing?.featuredPrice ?? 9.99;
  const BUMP = pricing?.bumpPrice ?? 2.99;
  const FEATURED_DAYS = pricing?.featuredDays ?? 7;
  const BUMP_DAYS = pricing?.bumpDays ?? 1;

  const balance = wallet?.balance ?? 0;
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
          <div className="font-display text-lg font-bold gradient-text">${balance.toFixed(2)}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PlanCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Featured"
            price={FEATURED}
            gradientClass="btn-gradient"
            description={`Pin to the top of search & homepage for ${FEATURED_DAYS} days with the iridescent Premium badge.`}
            disabled={busy !== null}
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
            disabled={busy !== null}
            loading={busy === "bump"}
            insufficient={balance < BUMP}
            onClick={() => pay("bump")}
          />
        </div>

        {balance < BUMP && (
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
