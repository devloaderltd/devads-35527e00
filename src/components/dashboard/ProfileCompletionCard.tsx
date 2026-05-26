import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ShieldCheck, Phone, Mail, BadgeCheck, ArrowRight } from "lucide-react";

export function ProfileCompletionCard({ userId }: { userId: string | undefined }) {
  const { data } = useQuery({
    queryKey: ["profile-completion", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: p }, { data: phoneVal }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url, bio, city_id, phone_verified_at, email_verified_at, kyc_status, kyc_verified_at")
          .eq("id", userId!)
          .maybeSingle(),
        supabase.rpc("get_my_phone"),
      ]);
      return { ...(p ?? {}), phone: (phoneVal as string | null) ?? null };
    },
  });

  const items = [
    { key: "name", label: "Display name", done: !!data?.display_name?.trim(), to: "/profile" },
    { key: "avatar", label: "Avatar photo", done: !!data?.avatar_url, to: "/profile" },
    { key: "bio", label: "Bio (about you)", done: !!data?.bio?.trim(), to: "/profile" },
    { key: "city", label: "Location", done: !!data?.city_id, to: "/profile" },
    { key: "phone", label: "Phone number", done: !!data?.phone, to: "/profile" },
    { key: "kyc", label: "Identity verified (+$5)", done: data?.kyc_status === "approved", to: "/verify", reward: true },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  const kycStatus = (data?.kyc_status as string | undefined) ?? "none";

  return (
    <Card className="rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Profile completion</span>
          <span className="text-2xl font-bold gradient-text">{pct}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={pct} className="h-2" />

        <div className="flex flex-wrap gap-2">
          <VerifBadge icon={<Mail className="h-3 w-3" />} label="Email" ok={!!data?.email_verified_at} />
          <VerifBadge icon={<Phone className="h-3 w-3" />} label="Phone" ok={!!data?.phone_verified_at} />
          <VerifBadge icon={<ShieldCheck className="h-3 w-3" />} label="Identity" ok={kycStatus === "approved"}
            pending={kycStatus === "pending"} />
        </div>

        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                {it.done
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />}
                <span className={it.done ? "text-muted-foreground line-through" : ""}>{it.label}</span>
                {it.reward && !it.done && (
                  <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    Bonus
                  </Badge>
                )}
              </span>
              {!it.done && (
                <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                  <Link to={it.to as never}>Add <ArrowRight className="h-3 w-3" /></Link>
                </Button>
              )}
            </li>
          ))}
        </ul>

        {kycStatus !== "approved" && (
          <Button asChild className="btn-gradient w-full rounded-full border-0">
            <Link to="/verify">
              <BadgeCheck className="mr-2 h-4 w-4" />
              {kycStatus === "pending" ? "View KYC status" : "Verify identity & get $5"}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function VerifBadge({ icon, label, ok, pending }: { icon: React.ReactNode; label: string; ok: boolean; pending?: boolean }) {
  const cls = ok
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
    : pending
    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
    : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {icon} {label} {ok ? "✓" : pending ? "·" : "—"}
    </span>
  );
}
