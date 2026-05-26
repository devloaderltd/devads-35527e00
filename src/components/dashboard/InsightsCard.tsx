import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertTriangle, Sparkles, Image as ImageIcon } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  status: string;
  view_count: number;
  expires_at?: string;
  created_at: string;
};

export function InsightsCard({
  listings,
  totals,
}: {
  listings: Listing[];
  totals: { view?: number; message?: number; favorite?: number; contact_reveal?: number };
}) {
  const tips: { icon: React.ReactNode; text: string; tone: "info" | "warn" | "good" }[] = [];

  const active = listings.filter((l) => l.status === "active");
  const totalViews = listings.reduce((s, l) => s + (l.view_count ?? 0), 0);
  const expiring = active.filter((l) => {
    const days = (new Date(l.expires_at ?? 0).getTime() - Date.now()) / 86400000;
    return days > 0 && days <= 3;
  });
  const stale = active.filter((l) => {
    const age = (Date.now() - new Date(l.created_at).getTime()) / 86400000;
    return age > 14 && (l.view_count ?? 0) < 5;
  });
  const topListing = [...listings].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))[0];
  const v = totals.view ?? 0;
  const m = totals.message ?? 0;
  const ctr = v ? (m / v) * 100 : 0;

  if (expiring.length) {
    tips.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      text: `${expiring.length} listing${expiring.length === 1 ? "" : "s"} expire within 3 days. Renew to keep them visible.`,
      tone: "warn",
    });
  }
  if (stale.length) {
    tips.push({
      icon: <ImageIcon className="h-4 w-4" />,
      text: `${stale.length} listing${stale.length === 1 ? "" : "s"} have low views. Try better photos and a sharper title.`,
      tone: "info",
    });
  }
  if (v >= 50 && ctr < 1) {
    tips.push({
      icon: <Lightbulb className="h-4 w-4" />,
      text: `Your message rate is ${ctr.toFixed(1)}%. Add a clear call-to-action and price to boost replies.`,
      tone: "info",
    });
  }
  if (topListing && (topListing.view_count ?? 0) > 20) {
    tips.push({
      icon: <TrendingUp className="h-4 w-4" />,
      text: `"${topListing.title.slice(0, 40)}" is your top performer with ${topListing.view_count} views. Promote it to amplify reach.`,
      tone: "good",
    });
  }
  if (!active.length) {
    tips.push({
      icon: <Sparkles className="h-4 w-4" />,
      text: "You have no active listings. Post one to start earning visibility.",
      tone: "info",
    });
  }
  if (!tips.length) {
    tips.push({
      icon: <Sparkles className="h-4 w-4" />,
      text: `Looking good — ${totalViews} views across ${active.length} active listings. Keep posting fresh content.`,
      tone: "good",
    });
  }

  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2"><CardTitle className="text-base">Smart insights</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {tips.map((t, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
              t.tone === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : t.tone === "good"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-violet-200 bg-violet-50 text-violet-900"
            }`}
          >
            <span className="mt-0.5">{t.icon}</span>
            <span className="leading-snug">{t.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
