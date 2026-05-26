import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Heart, MessageSquare, Phone } from "lucide-react";

type Totals = { view?: number; favorite?: number; message?: number; contact_reveal?: number };

export function FunnelCard({ totals }: { totals: Totals }) {
  const views = totals.view ?? 0;
  const favs = totals.favorite ?? 0;
  const msgs = totals.message ?? 0;
  const reveals = totals.contact_reveal ?? 0;
  const max = Math.max(views, 1);
  const steps = [
    { label: "Views", value: views, icon: <Eye className="h-4 w-4" />, color: "from-violet-500 to-fuchsia-500" },
    { label: "Favorites", value: favs, icon: <Heart className="h-4 w-4" />, color: "from-rose-400 to-pink-500" },
    { label: "Messages", value: msgs, icon: <MessageSquare className="h-4 w-4" />, color: "from-cyan-400 to-teal-500" },
    { label: "Contact reveals", value: reveals, icon: <Phone className="h-4 w-4" />, color: "from-amber-400 to-orange-500" },
  ];
  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2"><CardTitle className="text-base">Engagement funnel</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {steps.map((s) => {
          const pct = Math.max(4, Math.round((s.value / max) * 100));
          const conv = views ? Math.round((s.value / views) * 1000) / 10 : 0;
          return (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground">{s.icon}{s.label}</span>
                <span><span className="font-semibold text-foreground">{s.value}</span> · {conv}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div className={`h-full rounded-full bg-gradient-to-r ${s.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {!views && (
          <p className="pt-1 text-xs text-muted-foreground">No data yet — share your listings to start seeing engagement.</p>
        )}
      </CardContent>
    </Card>
  );
}
