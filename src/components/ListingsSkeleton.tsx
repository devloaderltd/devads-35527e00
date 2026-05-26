import { cn } from "@/lib/utils";

export function ListingsSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-[var(--shadow-float)] backdrop-blur-xl"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-gradient-to-br from-primary/10 via-purple-500/5 to-primary/10" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-primary/10" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-primary/10" />
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-16 animate-pulse rounded-full bg-primary/10" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-primary/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
