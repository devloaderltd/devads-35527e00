import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { activeBanner } from "@/lib/extras.functions";
import { X } from "lucide-react";

const VARIANT_STYLES: Record<string, string> = {
  info: "bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-400/30",
  success: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border-emerald-400/30",
  warning: "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-400/30",
  promo: "bg-[image:var(--gradient-primary)] text-white border-white/20",
};

export function SiteBanner() {
  const fn = useServerFn(activeBanner);
  const { data } = useQuery({
    queryKey: ["active-banner"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  const [hidden, setHidden] = useState(false);
  const banner = data?.banner;
  if (!banner || hidden) return null;
  const variant = VARIANT_STYLES[banner.variant] ?? VARIANT_STYLES.info;
  return (
    <div className={`relative border-b backdrop-blur ${variant}`}>
      <div className="container mx-auto flex items-center gap-3 px-4 py-2 text-sm">
        <span className="flex-1 font-medium">{banner.message}</span>
        {banner.cta_url && banner.cta_label && (
          <a
            href={banner.cta_url}
            className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur hover:bg-white/40"
          >
            {banner.cta_label}
          </a>
        )}
        <button
          aria-label="Dismiss"
          onClick={() => setHidden(true)}
          className="rounded-full p-1 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
