import { cn } from "@/lib/utils";

type Variant = "inline" | "block" | "page";

interface Props {
  variant?: Variant;
  label?: string;
  className?: string;
}

/**
 * Branded animated loader — gradient orb with pulsing rings.
 * Respects prefers-reduced-motion via Tailwind motion-safe utilities.
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
        "flex w-full flex-col items-center justify-center text-muted-foreground",
        sizes.wrap,
        className,
      )}
    >
      <div className={cn("relative", sizes.orb)}>
        {/* Outer pulsing ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full motion-safe:animate-ping"
          style={{ background: "var(--gradient-primary, linear-gradient(135deg, hsl(var(--primary)), #a78bfa))", opacity: 0.35 }}
        />
        {/* Middle slow ring */}
        <span
          aria-hidden
          className="absolute inset-[15%] rounded-full motion-safe:animate-[spin_2.4s_linear_infinite]"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary)) 90deg, transparent 240deg)",
            WebkitMask: "radial-gradient(circle, transparent 55%, #000 56%)",
            mask: "radial-gradient(circle, transparent 55%, #000 56%)",
          }}
        />
        {/* Core orb */}
        <span
          aria-hidden
          className="absolute inset-[28%] rounded-full shadow-lg motion-safe:animate-pulse"
          style={{ background: "var(--gradient-primary, linear-gradient(135deg, hsl(var(--primary)), #a78bfa))" }}
        />
      </div>
      {label && variant !== "inline" && (
        <p className={cn("font-medium tracking-wide", sizes.text)}>{label}…</p>
      )}
      {label && variant === "inline" && (
        <span className={cn("font-medium", sizes.text)}>{label}…</span>
      )}
    </div>
  );
}
