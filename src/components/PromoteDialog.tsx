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
        <Button variant="outline" className="w-full gap-2">
          <Sparkles className="h-4 w-4" /> Promote this listing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{choice ? "Complete payment" : "Promote your listing"}</DialogTitle>
        </DialogHeader>

        {!choice ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setChoice("featured")}
              className="rounded-xl border bg-card p-4 text-left transition hover:border-primary"
            >
              <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Featured</div>
              <div className="mt-1 text-2xl font-bold">$9.99</div>
              <p className="mt-2 text-sm text-muted-foreground">Pin to top of search & homepage for 7 days.</p>
            </button>
            <button
              onClick={() => setChoice("bump")}
              className="rounded-xl border bg-card p-4 text-left transition hover:border-primary"
            >
              <div className="flex items-center gap-2 font-semibold"><ArrowUp className="h-4 w-4 text-primary" /> Bump</div>
              <div className="mt-1 text-2xl font-bold">$2.99</div>
              <p className="mt-2 text-sm text-muted-foreground">Bump back to the top of recent results.</p>
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
