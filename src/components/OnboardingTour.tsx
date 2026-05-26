import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingDone } from "@/lib/social.functions";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Wallet, Plus, BadgeCheck, MessageSquare } from "lucide-react";

const STEPS = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Welcome to CallEscort24",
    body: "A quick 30-second tour. You can skip anytime.",
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Post your first listing",
    body: "Click the + button (bottom on mobile, top-right on desktop) to list an item.",
    cta: { label: "Post a listing", to: "/post" },
  },
  {
    icon: <Wallet className="h-5 w-5" />,
    title: "Top up your wallet",
    body: "Add credits with crypto to promote listings (Featured or Bump).",
    cta: { label: "Open wallet", to: "/wallet" },
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Verify identity for $5 bonus",
    body: "Quick KYC, and we'll credit your wallet automatically.",
    cta: { label: "Verify now", to: "/verify" },
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Stay in touch",
    body: "Replies from buyers/sellers land in Messages with realtime notifications.",
    cta: { label: "Open messages", to: "/messages" },
  },
] as const;

export function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const finish = useServerFn(markOnboardingDone);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_done_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data && !data.onboarding_done_at) setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const close = async () => {
    setOpen(false);
    try { await finish(); } catch {}
  };

  if (!open) return null;
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-md animate-scale-in rounded-3xl border border-white/40 bg-white/95 p-6 shadow-[var(--shadow-float-lg)] backdrop-blur-xl dark:bg-slate-900/95">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl btn-gradient text-white">
            {step.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
          <button onClick={close} className="rounded-full p-1 text-muted-foreground hover:bg-white/60" aria-label="Skip">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {"cta" in step && step.cta && (
              <Button asChild size="sm" variant="outline" className="rounded-full" onClick={close}>
                <Link to={step.cta.to}>{step.cta.label}</Link>
              </Button>
            )}
            {isLast ? (
              <Button size="sm" className="btn-gradient rounded-full border-0" onClick={close}>
                Finish
              </Button>
            ) : (
              <Button size="sm" className="btn-gradient rounded-full border-0" onClick={() => setI(i + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
