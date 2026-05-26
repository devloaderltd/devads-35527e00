import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Step = { id: string; label: string; href: string; done: boolean };

export function OnboardingChecklist({ userId }: { userId: string | undefined }) {
  const { data } = useQuery({
    queryKey: ["onboarding", userId],
    enabled: !!userId,
    queryFn: async () => {
      const uid = userId!;
      const [profileRes, listingsRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("avatar_url, phone_verified_at, bio").eq("id", uid).maybeSingle(),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("wallets").select("balance_usd").eq("user_id", uid).maybeSingle(),
      ]);
      const profile = profileRes.data;
      const steps: Step[] = [
        { id: "avatar", label: "Add a profile photo", href: "/profile", done: !!profile?.avatar_url },
        { id: "bio", label: "Write a short bio", href: "/profile", done: !!(profile?.bio && profile.bio.length > 10) },
        { id: "phone", label: "Verify your phone", href: "/profile", done: !!profile?.phone_verified_at },
        { id: "listing", label: "Post your first listing", href: "/post", done: (listingsRes.count ?? 0) > 0 },
        { id: "wallet", label: "Top up your wallet", href: "/wallet", done: Number(walletRes.data?.balance_usd ?? 0) > 0 },
      ];
      return steps;
    },
  });

  if (!data) return null;
  const done = data.filter((s) => s.done).length;
  const pct = Math.round((done / data.length) * 100);
  if (done === data.length) return null;

  return (
    <Card className="rounded-2xl border-0 bg-gradient-to-br from-primary/10 via-white/70 to-purple-500/10 backdrop-blur dark:from-primary/20 dark:via-white/5 dark:to-purple-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Finish setup
          <span className="ml-auto text-xs font-medium text-muted-foreground">{done} / {data.length} · {pct}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/60 dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {data.map((step) => (
            <li key={step.id}>
              <Link
                to={step.href as never}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition hover:bg-white/60 dark:hover:bg-white/10 ${
                  step.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{step.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
