import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2, Gift } from "lucide-react";
import { toast } from "sonner";

export function ReferralCard({ userId }: { userId?: string }) {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => {
    if (typeof window === "undefined" || !userId) return "";
    return `${window.location.origin}/?ref=${userId.slice(0, 8)}`;
  }, [userId]);

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on CallEscort24", text: "Check out this marketplace", url: link });
      } catch { /* dismissed */ }
    } else {
      copy();
    }
  };

  return (
    <Card className="rounded-2xl border-0 bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-cyan-400/10 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-4 w-4 text-primary" /> Invite & earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Share your link. Each friend who joins boosts your reach.</p>
        <div className="flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 backdrop-blur">
          <code className="flex-1 truncate text-xs">{link || "Sign in to get your link"}</code>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copy} disabled={!link}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button onClick={share} disabled={!link} className="w-full rounded-full btn-gradient border-0">
          <Share2 className="mr-1 h-4 w-4" /> Share invite
        </Button>
      </CardContent>
    </Card>
  );
}
