import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";

export function MakeOfferDialog({
  listingId,
  listingTitle,
  sellerId,
  askingPrice,
}: {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  askingPrice?: number | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(askingPrice ? String(Math.max(1, Math.round(askingPrice * 0.9))) : "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.id === sellerId) { toast.error("You can't make an offer on your own listing."); return; }
    const n = Number(amount);
    if (!n || n <= 0) { toast.error("Enter a valid offer amount."); return; }
    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("message_threads")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .eq("seller_id", sellerId)
        .maybeSingle();
      let threadId = existing?.id;
      if (!threadId) {
        const { data: created, error } = await supabase
          .from("message_threads")
          .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
          .select("id").single();
        if (error) throw error;
        threadId = created.id;
      }
      const body = `💰 Offer: $${n.toFixed(2)} for "${listingTitle}"${note.trim() ? `\n\n${note.trim()}` : ""}`;
      const { error: msgErr } = await supabase
        .from("messages")
        .insert({ thread_id: threadId, sender_id: user.id, body });
      if (msgErr) throw msgErr;
      toast.success("Offer sent");
      setOpen(false);
      navigate({ to: "/messages/$threadId", params: { threadId: threadId! } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not send offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full bg-white/70">
          <HandCoins className="h-4 w-4 text-primary" /> Make offer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make an offer</DialogTitle>
          <DialogDescription className="line-clamp-2">{listingTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="offer-amt" className="text-xs uppercase tracking-wide text-muted-foreground">
              Your offer (USD)
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-lg font-bold text-muted-foreground">$</span>
              <Input
                id="offer-amt"
                type="number"
                inputMode="decimal"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/70 text-lg font-semibold"
                autoFocus
              />
            </div>
            {askingPrice ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Asking price: <span className="font-medium">${Number(askingPrice).toFixed(2)}</span>
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="offer-note" className="text-xs uppercase tracking-wide text-muted-foreground">
              Message (optional)
            </Label>
            <Textarea
              id="offer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a friendly note for the seller…"
              maxLength={500}
              className="mt-1.5 bg-white/70"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="btn-gradient border-0">
            {submitting ? "Sending…" : "Send offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
