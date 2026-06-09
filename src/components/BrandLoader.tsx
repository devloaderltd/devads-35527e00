import { cn } from "@/lib/utils";

type Variant = "inline" | "block" | "page";

interface Props {
  variant?: Variant;
  label?: string;
  className?: string;
}

/**
 * Branded animated loader — gradient orb with smooth halo + ring.
 * Uses custom easing keyframes (no harsh ping/pulse). Fades itself in to
 * avoid the loader flashing on fast renders, and respects reduced motion.
 */
export function BrandLoader({ variant = "block", label = "Loading", className }: Props) {
  const sizes = {
    inline: { wrap: "gap-2", orb: "h-5 w-5", text: "text-xs" },
    block: { wrap: "gap-3 py-12", orb: "h-12 w-12", text: "text-sm" },
    page: { wrap: "gap-4 min-h-[60vh]", orb: "h-16 w-16", text: "text-sm" },
  }[variant];

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex w-full flex-col items-center justify-center text-muted-foreground motion-safe:animate-[brand-fade-in_320ms_ease-out_both]",
        sizes.wrap,
        className,
      )}
      style={{ animationDelay: "120ms" }}
    >
      <div className={cn("relative", sizes.orb)}>
        {/* Soft outer halo — smooth scale+fade, no ping snap */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full motion-safe:animate-[brand-halo_2.6s_cubic-bezier(0.45,0,0.2,1)_infinite]"
          style={{ background: "var(--gradient-primary, linear-gradient(135deg, hsl(var(--primary)), #a78bfa))" }}
        />
        {/* Inner halo, offset for layered breathing */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full motion-safe:animate-[brand-halo_2.6s_cubic-bezier(0.45,0,0.2,1)_infinite]"
          style={{
            background: "var(--gradient-primary, linear-gradient(135deg, hsl(var(--primary)), #a78bfa))",
            animationDelay: "1.3s",
          }}
        />
        {/* Sweeping conic ring */}
        <span
          aria-hidden
          className="absolute inset-[14%] rounded-full motion-safe:animate-[brand-spin_2.6s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.9) 110deg, transparent 260deg)",
            WebkitMask: "radial-gradient(circle, transparent 56%, #000 57%)",
            mask: "radial-gradient(circle, transparent 56%, #000 57%)",
          }}
        />
        {/* Core orb — gentle breathing */}
        <span
          aria-hidden
          className="absolute inset-[30%] rounded-full shadow-lg motion-safe:animate-[brand-breathe_2.2s_ease-in-out_infinite]"
          style={{ background: "var(--gradient-primary, linear-gradient(135deg, hsl(var(--primary)), #a78bfa))" }}
        />
      </div>
      {label && variant !== "inline" && (
        <p
          className={cn(
            "font-medium tracking-wide motion-safe:animate-[brand-text-fade_2.4s_ease-in-out_infinite]",
            sizes.text,
          )}
        >
          {label}…
        </p>
      )}
      {label && variant === "inline" && (
        <span className={cn("font-medium", sizes.text)}>{label}…</span>
      )}
    </div>
  );
}
