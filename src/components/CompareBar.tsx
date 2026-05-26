import { Link } from "@tanstack/react-router";
import { Scale, X } from "lucide-react";
import { useCompare, COMPARE_MAX } from "@/lib/compare-context";
import { Button } from "@/components/ui/button";

export function CompareBar() {
  const { ids, clear } = useCompare();
  if (ids.length < 1) return null;
  const ready = ids.length >= 2;

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 mx-3 animate-fade-in md:bottom-6 md:mx-auto md:max-w-2xl">
      <div className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/80 px-4 py-3 shadow-[var(--shadow-float-lg)] backdrop-blur-xl dark:bg-slate-900/80">
        <div className="grid h-9 w-9 place-items-center rounded-xl btn-gradient text-white">
          <Scale className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold">
            {ids.length} / {COMPARE_MAX} selected
          </div>
          <div className="text-xs text-muted-foreground">
            {ready ? "Ready to compare" : "Select at least 2 listings"}
          </div>
        </div>
        <Button
          asChild
          disabled={!ready}
          size="sm"
          className="btn-gradient rounded-full border-0 disabled:opacity-50"
        >
          <Link to="/compare">Compare</Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full"
          onClick={clear}
          aria-label="Clear compare"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
