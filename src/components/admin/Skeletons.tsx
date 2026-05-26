import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-7 w-1/2 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-2 w-full animate-pulse rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function ErrorFallback({
  title = "Couldn't load this data",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-300">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-rose-100">{title}</div>
          {message && (
            <div className="mt-0.5 break-words text-xs text-rose-200/80">
              {message}
            </div>
          )}
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="h-8 shrink-0 rounded-full border-rose-400/30 bg-rose-500/10 text-xs text-rose-100 hover:bg-rose-500/20"
          >
            <RefreshCw className="mr-1.5 h-3 w-3" /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}
