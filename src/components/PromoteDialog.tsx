import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowUp } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/hooks/use-auth";

export function PromoteDialog({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<"featured" | "bump" | null>(null);

  const close = () => { setOpen(false); setChoice(null); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setChoice(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 rounded-full bg-white/70 backdrop-blur hover:bg-white">
          <Sparkles className="h-4 w-4 text-primary" /> Promote this listing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl border-white/50 bg-white/80 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {choice ? "Complete payment" : <>Promote your <span className="gradient-text">listing</span></>}
          </DialogTitle>
        </DialogHeader>

        {!choice ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setChoice("featured")}
              className="iridescent-border group rounded-2xl border border-white/50 bg-white/70 p-5 text-left shadow-[var(--shadow-float)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float-lg)]"
            >
              <div className="flex items-center gap-2 font-semibold">
                <span className="grid h-7 w-7 place-items-center rounded-lg btn-gradient text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                Featured
              </div>
              <div className="mt-2 text-3xl font-extrabold gradient-text">$9.99</div>
              <p className="mt-2 text-sm text-muted-foreground">Pin to the top of search & homepage for 7 days with the iridescent Premium badge.</p>
            </button>
            <button
              onClick={() => setChoice("bump")}
              className="group rounded-2xl border border-white/50 bg-white/70 p-5 text-left shadow-[var(--shadow-float)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float-lg)]"
            >
              <div className="flex items-center gap-2 font-semibold">
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg text-white"
                  style={{ background: "var(--gradient-warm)" }}
                >
                  <ArrowUp className="h-4 w-4" />
                </span>
                Bump
              </div>
              <div className="mt-2 text-3xl font-extrabold gradient-text-warm">$2.99</div>
              <p className="mt-2 text-sm text-muted-foreground">Bump back to the top of recent results with a warm "Just bumped" chip.</p>
            </button>
          </div>
        ) : (
          <StripeEmbeddedCheckout
            priceId={choice === "featured" ? "featured_listing_7d_usd" : "bump_listing_usd"}
            listingId={listingId}
            promotionType={choice}
            customerEmail={user?.email}
            userId={user?.id}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
